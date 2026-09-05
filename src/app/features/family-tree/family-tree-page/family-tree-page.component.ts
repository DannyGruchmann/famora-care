import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { LucideArrowLeft, LucidePencil } from '@lucide/angular';
import { IconButton } from '@/app/components/icon-button/icon-button.component';
import { LoadingScreen } from '@/app/components/loading-screen/loading-screen.component';
import { ROUTES, TREE_ID_PARAM } from '@/app/routes.constants';
import { FamilyTreeStore } from '../family-tree.store';
import { MyTreesService } from '../my-trees.service';
import { PersonForm } from '../person-form/person-form.component';
import { PersonPanel } from '../person-panel/person-panel.component';
import { TreeCanvas } from '../tree-canvas/tree-canvas.component';
import { layoutTree } from '../tree.layout';
import { describeTree } from '../tree.labels';
import { emptyPersonDraft, type PersonDraft, type RelativeKind } from '../tree.types';

const FIRST_PERSON_HINT =
  'Fangen Sie mit sich selbst an oder mit der Person, um die es geht. Alle weiteren kommen von dort aus dazu.';

/**
 * The tree on its own screen. Full width, because a tree is wide and a folder page is not.
 *
 * The store is provided here rather than in root: this state belongs to one tree and to this
 * visit. MyTreesService stays root-scoped and is told to refresh on the way out, so the card in
 * the folder does not go on showing a count from before.
 */
@Component({
  selector: 'famora-family-tree-page',
  imports: [
    IconButton,
    LoadingScreen,
    PersonForm,
    PersonPanel,
    TreeCanvas,
    LucideArrowLeft,
    LucidePencil,
  ],
  templateUrl: './family-tree-page.component.html',
  styleUrl: './family-tree-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FamilyTreeStore],
})
export class FamilyTreePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly trees = inject(MyTreesService);

  protected readonly store = inject(FamilyTreeStore);
  protected readonly firstPersonHint = FIRST_PERSON_HINT;
  protected readonly emptyDraft = emptyPersonDraft();

  protected readonly selectedId = signal<string | null>(null);
  protected readonly isRenaming = signal(false);
  protected readonly draftName = signal('');

  private readonly treeId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get(TREE_ID_PARAM) ?? '')),
    { initialValue: '' },
  );

  protected readonly isLoading = computed(
    () => this.store.status() === 'loading' || this.store.status() === 'missing',
  );

  protected readonly heading = computed(() => this.store.tree()?.name ?? 'Stammbaum');

  protected readonly subtitle = computed(() =>
    describeTree(this.store.personCount(), this.generationCount()),
  );

  /**
   * Recomputed whenever a person or an edge changes. The layout is pure and the trees are small,
   * so this is cheaper than keeping a second copy of the positions in step by hand.
   */
  protected readonly layout = computed(() =>
    layoutTree(
      this.store.persons(),
      this.store.relations(),
      this.store.tree()?.rootPersonId ?? null,
    ),
  );

  protected readonly selectedPerson = computed(() => {
    const id = this.selectedId();

    return this.store.persons().find((person) => person.id === id) ?? null;
  });

  protected readonly isSelectedRoot = computed(
    () => this.selectedPerson()?.id === this.store.tree()?.rootPersonId,
  );

  constructor() {
    effect(() => {
      this.store.setTreeId(this.treeId());
    });

    effect(() => {
      if (this.store.status() === 'missing') void this.leaveMissingTree();
    });

    // A person deleted while their panel was open must not leave the panel behind.
    effect(() => {
      if (this.selectedId() !== null && this.selectedPerson() === null) this.selectedId.set(null);
    });
  }

  protected onSelect(personId: string): void {
    this.selectedId.set(personId);
  }

  protected async onBack(): Promise<void> {
    this.trees.refresh();
    await this.router.navigateByUrl(ROUTES.landing);
  }

  protected async addFirstPerson(draft: PersonDraft): Promise<void> {
    const person = await this.store.addPerson(draft);
    if (person === null) return;

    this.selectedId.set(person.id);
  }

  protected async onSaved(draft: PersonDraft): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;

    await this.store.updatePerson(id, draft);
  }

  protected async onRelativeAdded(event: {
    kind: RelativeKind;
    draft: PersonDraft;
  }): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;

    await this.store.addRelative(id, event.kind, event.draft);
  }

  protected async onRemoved(): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;

    await this.store.removePerson(id);
  }

  protected async onRootChosen(): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;

    await this.store.setRootPerson(id);
  }

  /** Stays open when the save failed: closing it would throw away what was typed and say nothing. */
  protected async onRenamed(name: string): Promise<void> {
    const saved = await this.store.rename(name);
    if (saved) this.isRenaming.set(false);
  }

  protected onRenameInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected startRenaming(): void {
    this.draftName.set(this.heading());
    this.isRenaming.set(true);
  }

  private generationCount(): number {
    return this.layout().nodes.reduce((highest, node) => Math.max(highest, node.generation + 1), 0);
  }

  /**
   * Deleted, or an address belonging to a tree this account is not in — for the visitor the same
   * thing. Nothing is explained that is none of their business; they simply end up somewhere real.
   */
  private async leaveMissingTree(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.landing, { replaceUrl: true });
  }
}
