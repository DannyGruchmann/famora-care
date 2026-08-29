import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import type { Folder, FolderProgress } from '@/app/features/folders/folder.types';
import {
  expectsFamilyHelp,
  getMode,
  getRequirementIds,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import type { EntryKind } from '@/app/features/entries/entry.types';
import { buildFamilyTree, familyCentreName } from '@/app/features/family/family.tree';
import type { Helper, HelperDraft } from '@/app/features/family/family.types';
import { PRESETS, URGENCY_ORDER } from './dashboard.data';
import { buildFolderTasks, resolveCompletedIds, summarizeTasks } from './dashboard.progress';
import { matchesRequirements } from './dashboard.utils';
import type { DashboardPreset, Task, Urgency } from './dashboard.types';

/** missing: the id belongs to no folder of this account — deleted, or someone else's. */
export type DashboardStatus = 'loading' | 'ready' | 'missing' | 'error';

function toHelper(name: string, draft: HelperDraft): Helper {
  return { id: crypto.randomUUID(), name, relation: draft.relation, deceased: draft.deceased };
}

/**
 * Everything the dashboard screen knows. Deliberately not providedIn: 'root' — the page provides
 * it, so the state belongs to one visit and cannot leak into the next folder.
 *
 * The checklist itself is derived in dashboard.progress.ts, not here: the overview needs the same
 * numbers for every folder at once, and two places computing progress would drift.
 */
@Injectable()
export class DashboardStore {
  private readonly folders = inject(FoldersQueries);

  /** null until the page reports the route parameter. Nothing is loaded before that. */
  private readonly folderIdState = signal<string | null>(null);
  private readonly attempt = signal(0);

  private readonly statusState = signal<DashboardStatus>('loading');
  private readonly loadErrorState = signal<string | undefined>(undefined);
  private readonly saveErrorState = signal<string | undefined>(undefined);

  private readonly answersState = signal<OnboardingAnswers>({});
  private readonly completedIdsState = signal<string[]>([]);
  private readonly helpersState = signal<Helper[]>([]);
  private readonly assignmentsState = signal<Record<string, string>>({});

  /** Reported by the page from the register — the checklist itself never reads entries. */
  private readonly filledKindsState = signal<readonly EntryKind[]>([]);

  /** Reported by the page from the session, for the same reason: the store stays free of auth. */
  private readonly viewerNameState = signal('');

  /**
   * Only save after a change by the user. Without this mark, loading alone would trigger a write
   * back — a wasted request that in the worst case overwrites a tab opened in parallel.
   *
   * A plain field, not a signal: it must not make the saving effect run again.
   */
  private isDirty = false;

  readonly status = this.statusState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();
  /** Stands as long as a change has not reached us. */
  readonly saveError = this.saveErrorState.asReadonly();
  readonly answers = this.answersState.asReadonly();

  readonly preset = computed((): DashboardPreset | null => {
    const mode = getMode(this.answersState());

    return mode === null ? null : PRESETS[mode];
  });

  readonly documents = computed(() => {
    const preset = this.preset();
    if (preset === null) return [];

    const chosenIds = getRequirementIds(this.answersState());

    return preset.documents.filter((document) => matchesRequirements(document.requires, chosenIds));
  });

  readonly tasks = computed(() =>
    buildFolderTasks({
      answers: this.answersState(),
      completedTaskIds: this.completedIdsState(),
      assignments: this.assignmentsState(),
      filledKinds: this.filledKindsState(),
    }),
  );

  readonly tasksByUrgency = computed(() => {
    const tasks = this.tasks();
    const entries = URGENCY_ORDER.map((urgency): [Urgency, Task[]] => [
      urgency,
      tasks.filter((task) => task.urgency === urgency),
    ]);

    return Object.fromEntries(entries) as Record<Urgency, Task[]>;
  });

  readonly helpers = computed(() =>
    this.helpersState().map((helper) => ({
      ...helper,
      openTaskCount: this.tasks().filter((task) => !task.done && task.assignedTo === helper.id)
        .length,
    })),
  );

  /** Whoever died cannot take a task on. They stay in the tree and out of this list. */
  readonly assignableHelpers = computed(() => this.helpers().filter((helper) => !helper.deceased));

  /**
   * The same people as `helpers`, arranged around the person the folder is about. Derived here
   * rather than in the page, because the dashboard and the emergency sheet both show it and two
   * places building it would drift.
   */
  readonly familyTree = computed(() =>
    buildFamilyTree(
      this.helpersState(),
      familyCentreName(this.answersState(), this.viewerNameState()),
    ),
  );

  private readonly summary = computed(() => summarizeTasks(this.tasks()));

  readonly doneCount = computed(() => this.summary().doneCount);
  readonly completionRate = computed(() => this.summary().completionRate);
  readonly nextDeadline = computed(() => this.summary().nextDeadline);

  /** Whoever announced help in the onboarding should find the family section already open. */
  readonly familyOpen = computed(() => expectsFamilyHelp(this.answersState()));

  constructor() {
    effect((onCleanup) => {
      this.startLoading(onCleanup);
    });

    effect(() => {
      this.saveWhenDirty();
    });
  }

  /** Called by the page with the route parameter; a changed id reloads the folder. */
  setFolderId(folderId: string): void {
    this.folderIdState.set(folderId);
  }

  setFilledEntryKinds(kinds: readonly EntryKind[]): void {
    this.filledKindsState.set(kinds);
  }

  /** The first name of whoever is signed in — the centre of the tree on the precaution path. */
  setViewerName(firstName: string): void {
    this.viewerNameState.set(firstName);
  }

  retry(): void {
    this.loadErrorState.set(undefined);
    this.attempt.update((current) => current + 1);
  }

  toggleTask(taskId: string): void {
    // A task the register ticks off has no checkbox to honour — ignore a click that gets through.
    if (this.tasks().find((task) => task.id === taskId)?.isAutomatic === true) return;

    this.isDirty = true;

    this.completedIdsState.update((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  }

  addHelper(draft: HelperDraft): void {
    const name = draft.name.trim();
    if (name === '') return;

    this.isDirty = true;
    this.helpersState.update((current) => [...current, toHelper(name, draft)]);
  }

  /**
   * The id stays, which is the whole point: a person can be renamed or moved into the family tree
   * without losing the tasks assigned to them. Re-entering them by hand would not manage that.
   */
  updateHelper(helperId: string, draft: HelperDraft): void {
    const name = draft.name.trim();
    if (name === '') return;

    this.isDirty = true;
    this.helpersState.update((current) =>
      current.map((helper) => (helper.id === helperId ? { ...helper, ...draft, name } : helper)),
    );

    // Whoever died cannot take a task on, so the task goes back to nobody rather than pointing at
    // a name the assignment dropdown no longer offers.
    if (draft.deceased) this.dropAssignmentsOf(helperId);
  }

  removeHelper(helperId: string): void {
    this.isDirty = true;
    this.helpersState.update((current) => current.filter((helper) => helper.id !== helperId));

    // Otherwise tasks point at somebody who no longer exists.
    this.dropAssignmentsOf(helperId);
  }

  /** An empty helperId clears the assignment — that is what the "nobody yet" option sends. */
  assignTask(taskId: string, helperId: string): void {
    this.isDirty = true;

    this.assignmentsState.update((current) => {
      const next = { ...current };
      if (helperId === '') delete next[taskId];
      else next[taskId] = helperId;

      return next;
    });
  }

  /** Leaves the tasks themselves alone: they are still open, just nobody's again. */
  private dropAssignmentsOf(helperId: string): void {
    this.assignmentsState.update((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, assignedId]) => assignedId !== helperId),
      ),
    );
  }

  private startLoading(onCleanup: (fn: () => void) => void): void {
    const folderId = this.folderIdState();
    this.attempt();
    if (folderId === null) return;

    this.statusState.set('loading');
    this.isDirty = false;

    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    void this.loadFolder(folderId, () => cancelled);
  }

  private async loadFolder(folderId: string, isCancelled: () => boolean): Promise<void> {
    const result = await this.folders.loadFolder(folderId);
    if (isCancelled()) return;

    if (!result.ok) {
      this.loadErrorState.set(result.message);
      this.statusState.set('error');
      return;
    }

    this.applyFolder(result.data);
  }

  /**
   * No folder, or answers that never named a path: for the screen both mean the same — there is
   * nothing here to show.
   */
  private applyFolder(folder: Folder | null): void {
    if (folder === null || getMode(folder.answers) === null) {
      this.statusState.set('missing');
      return;
    }

    this.answersState.set(folder.answers);
    this.helpersState.set(folder.helpers);
    this.assignmentsState.set(folder.assignments);
    this.completedIdsState.set(resolveCompletedIds(folder.answers, folder.completedTaskIds));
    this.statusState.set('ready');
  }

  /**
   * Reads every signal before the guard: an effect only tracks what it actually read, so an early
   * return would unsubscribe the store from its own changes.
   */
  private saveWhenDirty(): void {
    const progress: FolderProgress = {
      completedTaskIds: this.completedIdsState(),
      helpers: this.helpersState(),
      assignments: this.assignmentsState(),
    };
    const folderId = this.folderIdState();
    const isReady = this.statusState() === 'ready';

    if (!isReady || folderId === null || !this.isDirty) return;

    this.isDirty = false;
    void this.persist(folderId, progress);
  }

  private async persist(folderId: string, progress: FolderProgress): Promise<void> {
    const result = await this.folders.saveFolderProgress(folderId, progress);

    this.saveErrorState.set(result.ok ? undefined : result.message);
  }
}
