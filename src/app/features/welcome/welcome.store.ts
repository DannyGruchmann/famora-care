import { effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@/app/features/auth/auth.service';
import { EntriesQueries } from '@/app/features/entries/entries.queries';
import type { EntryKind } from '@/app/features/entries/entry.types';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import type { Folder } from '@/app/features/folders/folder.types';
import { GENERIC_ERROR } from '@/app/lib/supabase-query';
import { MODE_PREPARE, getMode } from '@/app/features/onboarding/onboarding.questions';
import { toFolderSummaries, type FolderSummary } from './welcome.summary';

/**
 * landing: show the marketing page — nobody signed in, or signed in without a single folder.
 * folders: show the overview instead.
 */
export type WelcomeStatus = 'loading' | 'landing' | 'folders' | 'error';

function isPrepareFolder(folder: Folder): boolean {
  return getMode(folder.answers) === MODE_PREPARE;
}

/**
 * Decides which of the two welcomes someone gets. Provided by the page rather than in root, so a
 * fresh visit asks again instead of showing a list from an earlier session.
 */
@Injectable()
export class WelcomeStore {
  private readonly auth = inject(AuthService);
  private readonly foldersQueries = inject(FoldersQueries);
  private readonly entriesQueries = inject(EntriesQueries);

  private readonly statusState = signal<WelcomeStatus>('loading');
  private readonly summariesState = signal<FolderSummary[]>([]);
  private readonly errorState = signal(GENERIC_ERROR);
  private readonly attempt = signal(0);

  readonly status = this.statusState.asReadonly();
  readonly summaries = this.summariesState.asReadonly();
  readonly error = this.errorState.asReadonly();

  constructor() {
    effect((onCleanup) => {
      this.followSession(onCleanup);
    });
  }

  retry(): void {
    this.attempt.update((current) => current + 1);
  }

  /**
   * Nothing is decided while the session is still unknown: guessing would put the marketing page
   * in front of someone who has been using the app for months, for as long as the request runs.
   */
  private followSession(onCleanup: (fn: () => void) => void): void {
    const sessionStatus = this.auth.status();
    this.attempt();

    if (sessionStatus === 'signed-out') {
      this.statusState.set('landing');
      return;
    }
    if (sessionStatus === 'loading') {
      this.statusState.set('loading');
      return;
    }

    this.startLoading(onCleanup);
  }

  private startLoading(onCleanup: (fn: () => void) => void): void {
    this.statusState.set('loading');

    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    void this.loadFolders(() => cancelled);
  }

  private async loadFolders(isCancelled: () => boolean): Promise<void> {
    const result = await this.foldersQueries.listFolders();
    if (isCancelled()) return;

    if (!result.ok) {
      this.errorState.set(result.message);
      this.statusState.set('error');
      return;
    }

    // No folder yet means someone just registered — the marketing page is what explains the two
    // paths, so that is the right welcome for them.
    if (result.data.length === 0) {
      this.statusState.set('landing');
      return;
    }

    await this.showFolders(result.data, isCancelled);
  }

  private async showFolders(folders: Folder[], isCancelled: () => boolean): Promise<void> {
    const filledKinds = await this.loadFilledKinds(folders);
    if (isCancelled()) return;

    this.summariesState.set(toFolderSummaries(folders, filledKinds));
    this.statusState.set('folders');
  }

  /**
   * Only asked when a precaution folder is in the list — the after-death path has no register.
   * A failure is not fatal: seeing your folders matters more than a progress number that would
   * then be short by the tasks the register ticks off.
   */
  private async loadFilledKinds(folders: Folder[]): Promise<ReadonlyMap<string, EntryKind[]>> {
    if (!folders.some(isPrepareFolder)) return new Map();

    const result = await this.entriesQueries.listFilledKinds();

    return result.ok ? result.data : new Map();
  }
}
