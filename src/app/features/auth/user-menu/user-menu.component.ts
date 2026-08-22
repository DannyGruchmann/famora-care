import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideFolderOpen, LucideLogOut, LucidePlus, LucideUser } from '@lucide/angular';
import { folderLabel } from '@/app/features/folders/folder.label';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import type { Folder } from '@/app/features/folders/folder.types';
import { getMode, MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import { folderPath, ROUTES } from '@/app/routes.constants';
import { AuthQueries } from '../auth.queries';
import { AuthService } from '../auth.service';

@Component({
  selector: 'famora-user-menu',
  imports: [RouterLink, LucideFolderOpen, LucideLogOut, LucidePlus, LucideUser],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'closeOnOutsidePointer($event)',
    '(document:keydown.escape)': 'closeAndRestoreFocus()',
  },
})
export class UserMenu {
  private readonly auth = inject(AuthService);
  private readonly authQueries = inject(AuthQueries);
  private readonly foldersQueries = inject(FoldersQueries);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly routes = ROUTES;
  protected readonly folderPath = folderPath;
  protected readonly folderLabel = folderLabel;

  protected readonly isOpen = signal(false);
  protected readonly folders = signal<Folder[]>([]);
  protected readonly isLoadingFolders = signal(false);
  protected readonly foldersFailed = signal(false);

  protected readonly isSignedIn = computed(() => this.auth.status() === 'signed-in');
  protected readonly email = computed(() => this.auth.user()?.email ?? '');
  protected readonly firstName = this.auth.firstName;
  protected readonly initial = computed(() => this.firstName().slice(0, 1).toUpperCase());

  protected readonly accountLabel = computed(() => {
    const name = this.firstName();

    return name === '' ? 'Konto' : `Konto von ${name}`;
  });

  constructor() {
    /**
     * Reloaded on every open. The menu sits outside the routes and is never rebuilt — a list
     * fetched once would be stale after the next folder is created.
     */
    effect((onCleanup) => {
      if (!this.isOpen()) return;

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      void this.reloadFolders(() => cancelled);
    });
  }

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  /** Same colour the folder carries on the overview, so the menu names the same thing. */
  protected isPrepareFolder(folder: Folder): boolean {
    return getMode(folder.answers) === MODE_PREPARE;
  }

  protected isCurrentFolder(folder: Folder): boolean {
    return this.router.url === folderPath(folder.id);
  }

  /** No confirmation: the folders live in the account, signing out loses nothing. */
  protected async signOut(): Promise<void> {
    this.close();
    await this.authQueries.signOut();
    await this.router.navigateByUrl(ROUTES.login, { replaceUrl: true });
  }

  protected closeOnOutsidePointer(event: Event): void {
    if (!this.isOpen()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;

    this.close();
  }

  protected closeAndRestoreFocus(): void {
    if (!this.isOpen()) return;

    this.close();
    this.trigger()?.focus();
  }

  private trigger(): HTMLButtonElement | null {
    return this.host.nativeElement.querySelector('.user-menu__trigger');
  }

  private async reloadFolders(isCancelled: () => boolean): Promise<void> {
    this.isLoadingFolders.set(true);
    this.foldersFailed.set(false);

    const result = await this.foldersQueries.listFolders();
    if (isCancelled()) return;

    this.isLoadingFolders.set(false);

    // On failure the last known list stays put — it is the better answer than an empty menu.
    // What must not happen is a failure looking like "you have no folders".
    if (result.ok) this.folders.set(result.data);
    else this.foldersFailed.set(true);
  }
}
