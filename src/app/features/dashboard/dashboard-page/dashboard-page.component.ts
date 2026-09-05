import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LucidePrinter, LucideTrash2 } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { ConfirmDialog } from '@/app/components/confirm-dialog/confirm-dialog.component';
import { LoadingScreen } from '@/app/components/loading-screen/loading-screen.component';
import { EntriesPanel } from '@/app/features/entries/entries-panel/entries-panel.component';
import { EntriesStore } from '@/app/features/entries/entries.store';
import { MyTreesService } from '@/app/features/family-tree/my-trees.service';
import { TreeSummaryCard } from '@/app/features/family-tree/tree-summary-card/tree-summary-card.component';
import { describeTree } from '@/app/features/family-tree/tree.labels';
import { folderLabel } from '@/app/features/folders/folder.label';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import { LegalFooter } from '@/app/features/legal/legal-footer/legal-footer.component';
import { isPreparing } from '@/app/features/onboarding/onboarding.questions';
import { emergencySheetPath, FOLDER_ID_PARAM, ROUTES } from '@/app/routes.constants';
import { URGENCY_ORDER } from '../dashboard.data';
import { DashboardStore } from '../dashboard.store';
import { DashboardAppBar } from '../dashboard-app-bar/dashboard-app-bar.component';
import { DocumentsSection } from '../documents-section/documents-section.component';
import { FamilySection } from '../family-section/family-section.component';
import { ProgressHero } from '../progress-hero/progress-hero.component';
import { SectionCard } from '../section-card/section-card.component';
import { TaskItem } from '../task-item/task-item.component';

const DELETE_DESCRIPTION =
  'Die Checkliste, der Fortschritt und die eingetragenen Personen dieses Ordners werden gelöscht. Das lässt sich nicht rückgängig machen.';

function describeEntryCount(count: number): string {
  if (count === 0) return 'Noch nichts eingetragen';
  if (count === 1) return '1 Eintrag';

  return `${count} Einträge`;
}

function describeHelperCount(count: number): string {
  if (count === 0) return 'Noch niemand eingetragen';
  if (count === 1) return '1 Person hilft mit';

  return `${count} Personen helfen mit`;
}

@Component({
  selector: 'famora-dashboard-page',
  imports: [
    Button,
    ConfirmDialog,
    LoadingScreen,
    LegalFooter,
    DashboardAppBar,
    DocumentsSection,
    EntriesPanel,
    FamilySection,
    ProgressHero,
    SectionCard,
    TaskItem,
    TreeSummaryCard,
    LucideTrash2,
    LucidePrinter,
    RouterLink,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Provided here, not in root: the state belongs to this visit and to this folder.
  providers: [DashboardStore, EntriesStore],
  // On the host rather than on an inner element, so the confirmation dialog and the failure
  // screen are inside the repainted area too — both sit outside .dashboard-page.
  host: { '[class.dashboard-page--prepare]': 'isPrecautionFolder()' },
})
export class DashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly folders = inject(FoldersQueries);

  protected readonly store = inject(DashboardStore);
  protected readonly entries = inject(EntriesStore);
  protected readonly trees = inject(MyTreesService);
  protected readonly urgencies = URGENCY_ORDER;

  protected readonly isDeleteOpen = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteError = signal<string | undefined>(undefined);

  /**
   * The user menu links to other folders, so the parameter can change while this page stays
   * alive. A snapshot would then show the previous folder.
   */
  private readonly folderId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get(FOLDER_ID_PARAM) ?? '')),
    { initialValue: '' },
  );

  protected readonly heading = computed(() => folderLabel(this.store.answers()));

  /**
   * Only the precaution folder holds entries — after a death there is nothing to write down. It
   * also carries its own colour, which the host binding above hangs off.
   */
  protected readonly isPrecautionFolder = computed(() => isPreparing(this.store.answers()));

  protected readonly registerSubtitle = computed(() =>
    describeEntryCount(this.entries.entryCount()),
  );

  protected readonly sheetPath = computed(() => emergencySheetPath(this.folderId()));

  protected readonly isLoading = computed(
    () => this.store.status() === 'loading' || this.store.status() === 'missing',
  );

  /** null whenever the checklist cannot be shown — loading error included. */
  protected readonly readyPreset = computed(() =>
    this.store.status() === 'ready' ? this.store.preset() : null,
  );

  protected readonly checklistSubtitle = computed(() => {
    const done = this.store.doneCount();

    return `${this.store.tasks().length - done} offen, ${done} erledigt`;
  });

  protected readonly documentsSubtitle = computed(
    () => `${this.store.documents().length} Dokumente, die Sie brauchen`,
  );

  protected readonly helperSubtitle = computed(() =>
    describeHelperCount(this.store.helpers().length),
  );

  /**
   * Says what is in the tree before it is opened, or invites making one when there is none. The
   * order matters: the count arrives a moment after the tree itself, and reading it first would
   * make the card announce "no tree yet" to somebody who has one.
   */
  protected readonly treeSubtitle = computed(() => {
    if (!this.trees.hasTree()) return 'Noch kein Stammbaum angelegt';

    const summary = this.trees.summary();
    if (summary === null) return 'Stammbaum wird geladen';

    return describeTree(summary.personCount, summary.generationCount);
  });

  /** Empty groups would otherwise leave a heading without a list underneath. */
  protected readonly filledUrgencies = computed(() => {
    const grouped = this.store.tasksByUrgency();

    return URGENCY_ORDER.filter((urgency) => grouped[urgency].length > 0);
  });

  protected readonly deleteHeading = computed(() => `${this.heading()} wirklich löschen?`);
  protected readonly deleteDescription = computed(() => this.deleteError() ?? DELETE_DESCRIPTION);
  protected readonly confirmLabel = computed(() =>
    this.isDeleting() ? 'Wird gelöscht …' : 'Ja, löschen',
  );

  constructor() {
    effect(() => {
      this.store.setFolderId(this.folderId());
    });

    effect(() => {
      if (this.store.status() === 'missing') void this.leaveMissingFolder();
    });

    // Only once the answers are in: the checklist path has no register, and asking for entries
    // it will never show is a wasted request on every folder that is not a precaution one.
    effect(() => {
      if (this.isPrecautionFolder()) this.entries.setFolderId(this.folderId());
    });

    // The checklist does not read the register itself — it is told, so it stays testable alone.
    effect(() => {
      this.store.setFilledEntryKinds(this.entries.filledKinds());
    });
  }

  protected async onBack(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.landing);
  }

  protected openDeleteDialog(): void {
    this.isDeleteOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    this.isDeleteOpen.set(false);
    this.deleteError.set(undefined);
  }

  protected async confirmDelete(): Promise<void> {
    this.isDeleting.set(true);
    const result = await this.folders.deleteFolder(this.folderId());
    this.isDeleting.set(false);

    if (!result.ok) {
      this.deleteError.set(result.message);
      return;
    }

    this.isDeleteOpen.set(false);
    await this.router.navigateByUrl(ROUTES.dashboard, { replaceUrl: true });
  }

  /**
   * Deleted, or the address belongs to someone else's account — for the user the same thing. The
   * junction looks for the next folder instead of explaining something that is none of their
   * business.
   */
  private async leaveMissingFolder(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.dashboard, { replaceUrl: true });
  }
}
