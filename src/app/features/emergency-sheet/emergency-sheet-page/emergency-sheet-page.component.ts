import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { LucidePrinter } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { LoadingScreen } from '@/app/components/loading-screen/loading-screen.component';
import { DashboardStore } from '@/app/features/dashboard/dashboard.store';
import { EntriesStore } from '@/app/features/entries/entries.store';
import { folderLabel } from '@/app/features/folders/folder.label';
import { isPreparing } from '@/app/features/onboarding/onboarding.questions';
import { FOLDER_ID_PARAM, folderPath, ROUTES } from '@/app/routes.constants';
import { formatLongDate } from '@/app/shared/date.utils';
import { toSheetSections } from '../emergency-sheet.sections';

const LEAD =
  'Dieses Blatt fasst zusammen, was für den Ernstfall festgehalten wurde: wo die Papiere liegen, welche Verträge laufen und wer weiterhilft. Es enthält bewusst keine Passwörter und keine Dokumente – nur den Hinweis, wo beides zu finden ist.';

const SAFEKEEPING =
  'Bewahren Sie dieses Blatt dort auf, wo auch Ihre Ausweispapiere liegen. Wer es in die Hand bekommt, erfährt daraus, wo Ihre wichtigsten Unterlagen zu finden sind.';

/**
 * The register on paper.
 *
 * The point of the whole precaution path: everything written down here sits behind a login, and
 * in the situation it was written for, the one person who can sign in is the one who is gone.
 * Printed, it works without an account, without a device and without a password.
 */
@Component({
  selector: 'famora-emergency-sheet-page',
  imports: [Button, LoadingScreen, LucidePrinter],
  templateUrl: './emergency-sheet-page.component.html',
  styleUrl: './emergency-sheet-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The same two stores the dashboard uses: this is a second view of one folder, and loading it
  // a second way would be a second place for the loading to go wrong.
  providers: [DashboardStore, EntriesStore],
  // The sheet is the precaution folder's document and wears its colour. Bound rather than fixed,
  // because the address takes any folder id — an after-death folder lands on the blank state.
  host: { '[class.emergency-sheet--prepare]': 'isPrecautionFolder()' },
})
export class EmergencySheetPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly folder = inject(DashboardStore);
  protected readonly entries = inject(EntriesStore);

  protected readonly lead = LEAD;
  protected readonly safekeeping = SAFEKEEPING;

  /** Fixed for the visit rather than computed: the date the paper claims must not move under it. */
  protected readonly printedOn = formatLongDate(new Date());

  private readonly folderId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get(FOLDER_ID_PARAM) ?? '')),
    { initialValue: '' },
  );

  protected readonly heading = computed(() => folderLabel(this.folder.answers()));

  protected readonly isPrecautionFolder = computed(() => isPreparing(this.folder.answers()));

  protected readonly isLoading = computed(
    () => this.folder.status() === 'loading' || this.entries.status() === 'loading',
  );

  protected readonly sections = computed(() => toSheetSections(this.entries.sections()));

  protected readonly helpers = computed(() => this.folder.helpers());

  /** Nothing written down yet. Offering to print an empty sheet would waste a walk to the printer. */
  protected readonly isEmpty = computed(
    () => this.sections().length === 0 && this.helpers().length === 0,
  );

  constructor() {
    effect(() => {
      const folderId = this.folderId();
      this.folder.setFolderId(folderId);
      this.entries.setFolderId(folderId);
    });

    effect(() => {
      if (this.folder.status() === 'missing') void this.leaveMissingFolder();
    });
  }

  protected print(): void {
    window.print();
  }

  protected async onBack(): Promise<void> {
    await this.router.navigateByUrl(folderPath(this.folderId()));
  }

  /** Deleted, or somebody else's — the junction looks for the next folder, same as the dashboard. */
  private async leaveMissingFolder(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.dashboard, { replaceUrl: true });
  }
}
