import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TreeCanvas } from './tree-canvas.component';
import { layoutTree, type TreeLayout } from '../tree.layout';
import type { TreePerson, TreeRelation } from '../tree.types';

function people(...names: string[]): TreePerson[] {
  return names.map((name) => ({
    id: name,
    treeId: 'tree-1',
    name,
    birthYear: null,
    deceased: false,
    deathYear: null,
  }));
}

function parentOf(parent: string, child: string): TreeRelation {
  return {
    id: `${parent}>${child}`,
    treeId: 'tree-1',
    kind: 'parent',
    personA: parent,
    personB: child,
  };
}

function familyLayout(): TreeLayout {
  return layoutTree(people('anna', 'carl'), [parentOf('anna', 'carl')], 'anna');
}

function renderCanvas(layout = familyLayout()): ComponentFixture<TreeCanvas> {
  const fixture = TestBed.createComponent(TreeCanvas);
  fixture.componentRef.setInput('layout', layout);
  fixture.componentRef.setInput('rootId', 'anna');
  fixture.componentRef.setInput('selectedId', null);
  fixture.detectChanges();

  return fixture;
}

function viewportOf(fixture: ComponentFixture<TreeCanvas>): HTMLElement {
  return fixture.nativeElement.querySelector('.tree-canvas__viewport');
}

function transformOf(fixture: ComponentFixture<TreeCanvas>): string {
  return fixture.nativeElement.querySelector('.tree-canvas__surface').style.transform;
}

function zoomOf(fixture: ComponentFixture<TreeCanvas>): number {
  return Number(/scale\(([-\d.]+)\)/.exec(transformOf(fixture))?.[1] ?? '1');
}

function panXOf(fixture: ComponentFixture<TreeCanvas>): number {
  return Number(/translate\(([-\d.]+)px/.exec(transformOf(fixture))?.[1] ?? '0');
}

function press(fixture: ComponentFixture<TreeCanvas>, key: string): void {
  viewportOf(fixture).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  fixture.detectChanges();
}

function clickControl(fixture: ComponentFixture<TreeCanvas>, label: string): void {
  const buttons: HTMLElement[] = [...fixture.nativeElement.querySelectorAll('.icon-button')];
  const button = buttons.find((entry) => entry.getAttribute('aria-label') === label);
  if (button === undefined) throw new Error(`no control labelled ${label}`);

  button.click();
  fixture.detectChanges();
}

describe('TreeCanvas controls', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // These four buttons are the reason a free canvas was allowed at all: nobody is ever required
  // to drag or pinch. Losing one of them silently would take the justification with it.
  it('offers a button for every movement, so nothing depends on dragging', () => {
    const fixture = renderCanvas();
    const labels = [...fixture.nativeElement.querySelectorAll('.icon-button')].map(
      (button: HTMLElement) => button.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Vergrößern', 'Verkleinern', 'Alles zeigen', 'Zur Startperson']);
  });

  it('zooms in and out from the buttons', () => {
    const fixture = renderCanvas();
    const before = zoomOf(fixture);

    clickControl(fixture, 'Vergrößern');
    expect(zoomOf(fixture)).toBeGreaterThan(before);

    clickControl(fixture, 'Verkleinern');
    expect(zoomOf(fixture)).toBeCloseTo(before, 5);
  });

  it('keeps the zoom inside the range where a card is still readable', () => {
    const fixture = renderCanvas();

    for (let step = 0; step < 20; step += 1) clickControl(fixture, 'Verkleinern');
    expect(zoomOf(fixture)).toBeCloseTo(0.4, 5);

    for (let step = 0; step < 40; step += 1) clickControl(fixture, 'Vergrößern');
    expect(zoomOf(fixture)).toBeCloseTo(2, 5);
  });
});

describe('TreeCanvas keyboard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('can be reached by keyboard at all', () => {
    const fixture = renderCanvas();

    expect(viewportOf(fixture).getAttribute('tabindex')).toBe('0');
  });

  it('pans with the arrow keys', () => {
    const fixture = renderCanvas();
    const before = panXOf(fixture);

    press(fixture, 'ArrowLeft');
    expect(panXOf(fixture)).toBeGreaterThan(before);

    press(fixture, 'ArrowRight');
    expect(panXOf(fixture)).toBeCloseTo(before, 5);
  });

  it('zooms with plus and minus', () => {
    const fixture = renderCanvas();

    press(fixture, '+');
    expect(zoomOf(fixture)).toBeGreaterThan(1);

    press(fixture, '-');
    expect(zoomOf(fixture)).toBeCloseTo(1, 5);
  });

  it('goes back to the starting person with zero', () => {
    const fixture = renderCanvas();

    press(fixture, '+');
    press(fixture, 'ArrowLeft');
    press(fixture, '0');

    expect(zoomOf(fixture)).toBe(1);
  });

  it('leaves keys it does not use to the browser', () => {
    const fixture = renderCanvas();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    viewportOf(fixture).dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

/** Only what the drag tests below need — the component's own handlers, without the DOM plumbing. */
interface CanvasHandlers {
  onPointerDown(event: PointerEvent): void;
  onPointerMove(event: PointerEvent): void;
}

function pointerAt(x: number, y: number): PointerEvent {
  return { clientX: x, clientY: y, button: 0, pointerId: 1 } as PointerEvent;
}

/**
 * jsdom has no pointer capture. Stubbed on the element rather than guarded in the component: the
 * browser has the method, and a component written around a gap in the test environment would be
 * carrying a workaround for a problem that does not exist where it runs.
 */
function withPointerCapture(fixture: ComponentFixture<TreeCanvas>): CanvasHandlers {
  Object.assign(viewportOf(fixture), {
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
  });

  return fixture.componentInstance as unknown as CanvasHandlers;
}

describe('TreeCanvas cards', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('groups the cards by generation, so the tree reads top row first', () => {
    const fixture = renderCanvas();
    const groups: HTMLElement[] = [...fixture.nativeElement.querySelectorAll('[role="group"]')];
    const labels = groups.map((group) => group.getAttribute('aria-label'));

    expect(labels).toContain('1. Generation');
    expect(labels).toContain('2. Generation');
  });

  it('reports which person was pressed', () => {
    const fixture = renderCanvas();
    const selected: string[] = [];
    fixture.componentInstance.personSelected.subscribe((id: string) => selected.push(id));

    fixture.nativeElement.querySelector('.person-card').click();

    expect(selected).toEqual(['anna']);
  });

  // Driven through the handlers rather than through real pointer events: jsdom has no pointer
  // capture, and stubbing it would test the stub. What matters is the rule, not the plumbing.
  it('does not select a card when the press was a drag of the surface', () => {
    const fixture = renderCanvas();
    const selected: string[] = [];
    fixture.componentInstance.personSelected.subscribe((id: string) => selected.push(id));
    const canvas = withPointerCapture(fixture);

    canvas.onPointerDown(pointerAt(10, 10));
    canvas.onPointerMove(pointerAt(90, 40));
    fixture.nativeElement.querySelector('.person-card').click();

    expect(selected).toEqual([]);
  });

  it('selects again on the next press, so one drag swallows only one click', () => {
    const fixture = renderCanvas();
    const selected: string[] = [];
    fixture.componentInstance.personSelected.subscribe((id: string) => selected.push(id));
    const canvas = withPointerCapture(fixture);

    canvas.onPointerDown(pointerAt(10, 10));
    canvas.onPointerMove(pointerAt(90, 40));
    fixture.nativeElement.querySelector('.person-card').click();
    fixture.nativeElement.querySelector('.person-card').click();

    expect(selected).toEqual(['anna']);
  });

  it('draws a connector for the family it was given', () => {
    const fixture = renderCanvas();

    expect(fixture.nativeElement.querySelectorAll('.tree-canvas__line')).toHaveLength(1);
  });

  it('hides the movement buttons while there is nothing to move', () => {
    const fixture = renderCanvas(layoutTree([], [], null));

    expect(fixture.nativeElement.querySelector('.tree-canvas__controls')).toBeNull();
  });
});
