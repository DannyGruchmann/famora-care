import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from '@/app/components/button/button.component';
import { StickyCta } from '@/app/components/sticky-cta/sticky-cta.component';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import { LegalFooter } from '@/app/features/legal/legal-footer/legal-footer.component';
import { FOLDER_PARAM, folderPath, ROUTES } from '@/app/routes.constants';
import { MODE_PARAM, toMode } from '../onboarding.questions';
import { OnboardingStore } from '../onboarding.store';
import { OnboardingProgress } from '../onboarding-progress/onboarding-progress.component';
import { QuestionBody } from '../question-body/question-body.component';

@Component({
  selector: 'famora-onboarding-page',
  imports: [Button, StickyCta, LegalFooter, OnboardingProgress, QuestionBody],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Provided here, not in root: every visit starts with a fresh wizard.
  providers: [OnboardingStore],
})
export class OnboardingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly folders = inject(FoldersQueries);

  protected readonly store = inject(OnboardingStore);

  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | undefined>(undefined);

  /**
   * With a folder id the details of an existing folder are captured anew; without one a new
   * folder is left at the end. Deliberately without prefilling: capture again, do not edit.
   */
  private readonly editFolderId = this.route.snapshot.queryParamMap.get(FOLDER_PARAM);

  protected readonly continueLabel = computed(() => {
    if (this.isSaving()) return 'Wird gespeichert …';

    return this.store.isLastStep() ? 'Meine Checkliste öffnen' : 'Weiter';
  });

  constructor() {
    this.store.initialise(toMode(this.route.snapshot.queryParamMap.get(MODE_PARAM)));
  }

  protected async onBack(): Promise<void> {
    if (this.store.stepIndex() === 0) {
      await this.router.navigateByUrl(ROUTES.landing);
      return;
    }

    this.store.goBack();
  }

  protected async onContinue(): Promise<void> {
    if (!this.store.isLastStep()) {
      this.store.goNext();
      return;
    }

    await this.saveAndOpen();
  }

  /**
   * Only saved at the end: before that the answers are incomplete and would produce a folder
   * with half a list.
   */
  private async saveAndOpen(): Promise<void> {
    this.saveError.set(undefined);
    this.isSaving.set(true);

    const folderId = await this.persistAnswers();
    this.isSaving.set(false);

    if (folderId === null) return;

    await this.router.navigateByUrl(folderPath(folderId), { replaceUrl: true });
  }

  /** Returns the folder to open, or null when saving failed and the message is already set. */
  private async persistAnswers(): Promise<string | null> {
    const answers = this.store.answers();
    const editId = this.editFolderId;

    if (editId !== null) {
      const result = await this.folders.updateFolderAnswers(editId, answers);
      if (!result.ok) this.saveError.set(result.message);

      return result.ok ? editId : null;
    }

    const result = await this.folders.createFolder(answers);
    if (!result.ok) this.saveError.set(result.message);

    return result.ok ? result.data.id : null;
  }
}
