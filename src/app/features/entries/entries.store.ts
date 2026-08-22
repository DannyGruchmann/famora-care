import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { ApiResult } from '@/app/lib/supabase-query';
import { ENTRY_KINDS, type EntryKindConfig } from './entry.kinds';
import { EntriesQueries } from './entries.queries';
import type { EntryDraft, EntryKind, FolderEntry } from './entry.types';

export type EntriesStatus = 'loading' | 'ready' | 'error';

/** One section of the folder, ready for the template. */
export interface EntrySection {
  config: EntryKindConfig;
  entries: FolderEntry[];
}

/**
 * The content of a precaution folder.
 *
 * Unlike DashboardStore this writes every change on its own rather than saving the whole folder:
 * entries are typed text, and rewriting the entire row on each keystroke would be both wasteful
 * and a good way to lose what a second open tab just wrote.
 *
 * Provided by the page, not in root — the state belongs to one folder.
 */
@Injectable()
export class EntriesStore {
  private readonly queries = inject(EntriesQueries);

  /** null until the page reports the folder. Nothing is loaded before that. */
  private readonly folderIdState = signal<string | null>(null);
  private readonly entriesState = signal<FolderEntry[]>([]);
  private readonly statusState = signal<EntriesStatus>('loading');
  private readonly errorState = signal<string | undefined>(undefined);
  private readonly isSavingState = signal(false);

  readonly status = this.statusState.asReadonly();
  /** Set after a failed read or write. The screen keeps what it has and says what went wrong. */
  readonly error = this.errorState.asReadonly();
  readonly isSaving = this.isSavingState.asReadonly();

  readonly sections = computed((): EntrySection[] =>
    ENTRY_KINDS.map((config) => ({
      config,
      entries: this.entriesState().filter((entry) => entry.kind === config.kind),
    })),
  );

  readonly entryCount = computed(() => this.entriesState().length);

  /** The sections that already hold something. The checklist reads this to tick itself off. */
  readonly filledKinds = computed(() => [
    ...new Set(this.entriesState().map((entry) => entry.kind)),
  ]);

  constructor() {
    effect((onCleanup) => {
      this.startLoading(onCleanup);
    });
  }

  setFolderId(folderId: string): void {
    this.folderIdState.set(folderId);
  }

  async addEntry(kind: EntryKind, draft: EntryDraft): Promise<boolean> {
    const folderId = this.folderIdState();
    if (folderId === null || draft.title.trim() === '') return false;

    const result = await this.write(() =>
      this.queries.createEntry(folderId, kind, draft, this.nextSortOrder(kind)),
    );
    if (!result.ok) return false;

    this.entriesState.update((current) => [...current, result.data]);

    return true;
  }

  async updateEntry(id: string, draft: EntryDraft): Promise<boolean> {
    if (draft.title.trim() === '') return false;

    const result = await this.write(() => this.queries.updateEntry(id, draft));
    if (!result.ok) return false;

    this.entriesState.update((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...trimmed(draft) } : entry)),
    );

    return true;
  }

  async removeEntry(id: string): Promise<boolean> {
    const result = await this.write(() => this.queries.deleteEntry(id));
    if (!result.ok) return false;

    this.entriesState.update((current) => current.filter((entry) => entry.id !== id));

    return true;
  }

  /** Appends rather than sorts alphabetically: which entry matters most is nobody else's call. */
  private nextSortOrder(kind: EntryKind): number {
    const orders = this.entriesState()
      .filter((entry) => entry.kind === kind)
      .map((entry) => entry.sortOrder);

    return orders.length === 0 ? 0 : Math.max(...orders) + 1;
  }

  /** Shared around every write: the busy flag and the error message behave the same each time. */
  private async write<T>(operation: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    this.errorState.set(undefined);
    this.isSavingState.set(true);

    const result = await operation();
    this.isSavingState.set(false);

    if (!result.ok) this.errorState.set(result.message);

    return result;
  }

  private startLoading(onCleanup: (fn: () => void) => void): void {
    const folderId = this.folderIdState();
    if (folderId === null) return;

    this.statusState.set('loading');

    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    void this.loadEntries(folderId, () => cancelled);
  }

  private async loadEntries(folderId: string, isCancelled: () => boolean): Promise<void> {
    const result = await this.queries.listEntries(folderId);
    if (isCancelled()) return;

    if (!result.ok) {
      this.errorState.set(result.message);
      this.statusState.set('error');
      return;
    }

    this.entriesState.set(result.data);
    this.statusState.set('ready');
  }
}

/** The database trims on write; the local copy has to match, or the two drift until a reload. */
function trimmed(draft: EntryDraft): EntryDraft {
  return {
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    reference: draft.reference.trim(),
    contact: draft.contact.trim(),
  };
}
