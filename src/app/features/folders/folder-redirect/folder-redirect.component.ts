import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@/app/components/button/button.component';
import { LoadingScreen } from '@/app/components/loading-screen/loading-screen.component';
import { folderPath, ROUTES } from '@/app/routes.constants';
import { FoldersQueries } from '../folders.queries';

/**
 * /uebersicht has no view of its own. The address stays anyway: it appears in old links and is
 * the destination after signing in. It leads to the most recently created folder — or into the
 * onboarding when there is none yet.
 *
 * The localStorage migration the React version still had is gone: the backend has been live for
 * a while, so any real user's data already sits in Supabase.
 */
@Component({
  selector: 'famora-folder-redirect',
  imports: [Button, LoadingScreen],
  templateUrl: './folder-redirect.component.html',
  styleUrl: './folder-redirect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderRedirect {
  private readonly folders = inject(FoldersQueries);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.openNewestFolder();
  }

  protected retry(): void {
    this.error.set(null);
    void this.openNewestFolder();
  }

  private async openNewestFolder(): Promise<void> {
    const result = await this.folders.listFolders();

    if (!result.ok) {
      this.error.set(result.message);
      return;
    }

    const newest = result.data.at(-1);
    const target = newest === undefined ? ROUTES.onboarding : folderPath(newest.id);

    await this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
