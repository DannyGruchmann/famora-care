import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideCrosshair, LucideMaximize, LucideMinus, LucidePlus } from '@lucide/angular';
import { IconButton } from '@/app/components/icon-button/icon-button.component';
import { PersonCard } from '../person-card/person-card.component';
import { CARD_HEIGHT, CARD_WIDTH, type LayoutNode } from '../tree.geometry';
import type { TreeLayout } from '../tree.layout';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const ZOOM_STEP = 1.25;
/** How far one arrow key press moves the surface, in screen pixels. */
const PAN_STEP = 64;
const FIT_PADDING = 48;
/** Below this a pointer press counts as a click on a card, above it as a drag of the surface. */
const DRAG_THRESHOLD = 4;

interface Viewport {
  width: number;
  height: number;
}

/**
 * The pan-and-zoom surface the tree is drawn on.
 *
 * Nobody is ever required to drag or pinch: every movement has a button, and every button has a
 * keyboard equivalent. That was the condition for choosing a free canvas over guided navigation,
 * and dropping it would leave the choice unjustified.
 *
 * Screen readers are not sent to a second, duplicated description. The cards are real buttons in
 * reading order and each generation is a labelled group, so the tree is walked with Tab, top row
 * first. The plan proposed hiding the canvas from assistive technology and offering a parallel
 * list instead — that would have meant focusable buttons inside an aria-hidden subtree, which is
 * an error in its own right. The grouping gives the same information without the contradiction.
 */
@Component({
  selector: 'famora-tree-canvas',
  imports: [IconButton, PersonCard, LucidePlus, LucideMinus, LucideMaximize, LucideCrosshair],
  templateUrl: './tree-canvas.component.html',
  styleUrl: './tree-canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeCanvas {
  readonly layout = input.required<TreeLayout>();
  readonly rootId = input<string | null>(null);
  readonly selectedId = input<string | null>(null);

  readonly personSelected = output<string>();

  protected readonly cardWidth = CARD_WIDTH;
  protected readonly cardHeight = CARD_HEIGHT;

  protected readonly zoom = signal(1);
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);
  /** Eases the button-driven jumps, but never a drag — a dragged surface has to keep up with the finger. */
  protected readonly isDragging = signal(false);

  private readonly viewportRef = viewChild.required<ElementRef<HTMLDivElement>>('viewport');

  /** Set while a drag is in progress, so the click it ends with does not also select a card. */
  private dragged = false;
  private pointerStart: { x: number; y: number; panX: number; panY: number } | null = null;

  protected readonly surfaceStyle = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`,
  );

  /** The rows, so each generation can be one labelled group in the document. */
  protected readonly generations = computed(() => groupNodes(this.layout().nodes));

  protected readonly isEmpty = computed(() => this.layout().nodes.length === 0);

  constructor() {
    // A new tree, or a different root: open on the person the tree is about rather than at 0,0.
    //
    // untracked around the call, and this is not optional: showRoot() reads the zoom in order to
    // work out the pan, so without it the effect would depend on the zoom it just set, and every
    // press of the zoom button would immediately be undone by this effect running again.
    effect(() => {
      this.layout();
      this.rootId();
      untracked(() => this.showRoot());
    });
  }

  protected zoomIn(): void {
    this.zoomTo(this.zoom() * ZOOM_STEP);
  }

  protected zoomOut(): void {
    this.zoomTo(this.zoom() / ZOOM_STEP);
  }

  /**
   * Everything at once, which on a large tree is unreadably small — which is why it is a button
   * somebody presses when they want the overview, and never the state the canvas opens in.
   */
  protected showAll(): void {
    const { width, height } = this.layout().size;
    const view = this.viewportSize();
    if (width === 0 || height === 0) return;

    const zoom = clamp(
      Math.min((view.width - FIT_PADDING) / width, (view.height - FIT_PADDING) / height),
    );

    this.zoom.set(zoom);
    this.panX.set((view.width - width * zoom) / 2);
    this.panY.set((view.height - height * zoom) / 2);
  }

  /**
   * Centred on the person the tree opens on, at a readable size. Not "fit everything": on six
   * generations that is dust, and the first thing anybody looks for is themselves.
   */
  protected showRoot(): void {
    const node = this.rootNode();
    if (node === null) {
      this.showAll();
      return;
    }

    this.zoom.set(1);
    this.centreOn(node);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;

    this.dragged = false;
    this.pointerStart = {
      x: event.clientX,
      y: event.clientY,
      panX: this.panX(),
      panY: this.panY(),
    };
    this.viewportRef().nativeElement.setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    const start = this.pointerStart;
    if (start === null) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      this.dragged = true;
      this.isDragging.set(true);
    }

    this.panX.set(start.panX + dx);
    this.panY.set(start.panY + dy);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointerStart = null;
    this.isDragging.set(false);
    this.viewportRef().nativeElement.releasePointerCapture(event.pointerId);
  }

  /** Arrow keys pan, plus and minus zoom, zero goes back to the person the tree opens on. */
  protected onKeyDown(event: KeyboardEvent): void {
    const handled = this.runShortcut(event.key);
    if (!handled) return;

    event.preventDefault();
  }

  /**
   * The flag is consumed, not just read. A drag ending on the background leaves it set, and the
   * next Enter on a focused card produces a click with no pointer press before it — which would
   * then be swallowed for no reason. One drag suppresses exactly one click.
   */
  protected onCardClick(personId: string): void {
    const afterDrag = this.dragged;
    this.dragged = false;
    if (afterDrag) return;

    this.personSelected.emit(personId);
  }

  /** Zoom on the wheel only while a modifier is held: otherwise the page would stop scrolling. */
  protected onWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    this.zoomTo(this.zoom() * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
  }

  protected generationLabel(index: number): string {
    return `${index + 1}. Generation`;
  }

  private runShortcut(key: string): boolean {
    const pans: Record<string, [number, number]> = {
      ArrowLeft: [PAN_STEP, 0],
      ArrowRight: [-PAN_STEP, 0],
      ArrowUp: [0, PAN_STEP],
      ArrowDown: [0, -PAN_STEP],
    };

    if (key in pans) return this.panBy(pans[key]);
    if (key === '+' || key === '=') return runAnd(() => this.zoomIn());
    if (key === '-') return runAnd(() => this.zoomOut());
    if (key === '0') return runAnd(() => this.showRoot());

    return false;
  }

  private panBy([dx, dy]: [number, number]): boolean {
    this.panX.update((current) => current + dx);
    this.panY.update((current) => current + dy);

    return true;
  }

  /** Zooms around the middle of the viewport, so whatever is being looked at stays where it is. */
  private zoomTo(wanted: number): void {
    const next = clamp(wanted);
    const previous = this.zoom();
    const view = this.viewportSize();
    const ratio = next / previous;

    this.panX.update((x) => view.width / 2 - (view.width / 2 - x) * ratio);
    this.panY.update((y) => view.height / 2 - (view.height / 2 - y) * ratio);
    this.zoom.set(next);
  }

  private centreOn(node: LayoutNode): void {
    const view = this.viewportSize();
    const zoom = this.zoom();

    this.panX.set(view.width / 2 - zoom * (node.x + CARD_WIDTH / 2));
    this.panY.set(view.height / 2 - zoom * (node.y + CARD_HEIGHT / 2));
  }

  private rootNode(): LayoutNode | null {
    const id = this.rootId();
    const nodes = this.layout().nodes;

    return nodes.find((node) => node.person.id === id) ?? nodes[0] ?? null;
  }

  private viewportSize(): Viewport {
    const element = this.viewportRef().nativeElement;

    return { width: element.clientWidth, height: element.clientHeight };
  }
}

function groupNodes(nodes: LayoutNode[]): LayoutNode[][] {
  const rows: LayoutNode[][] = [];

  for (const node of nodes) {
    rows[node.generation] = [...(rows[node.generation] ?? []), node];
  }

  return [...rows].map((row: LayoutNode[] | undefined) => row ?? []);
}

function clamp(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Runs the action and reports that the key was handled, so the shortcut table stays one line each. */
function runAnd(action: () => void): boolean {
  action();

  return true;
}
