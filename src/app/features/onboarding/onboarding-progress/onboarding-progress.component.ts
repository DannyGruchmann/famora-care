import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';
import { IconButton } from '@/app/components/icon-button/icon-button.component';

@Component({
  selector: 'famora-onboarding-progress',
  imports: [IconButton, LucideArrowLeft],
  templateUrl: './onboarding-progress.component.html',
  styleUrl: './onboarding-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingProgress {
  readonly stepIndex = input.required<number>();
  /** null while the total number of questions is not yet settled. */
  readonly totalSteps = input.required<number | null>();

  readonly back = output<void>();

  protected readonly rate = computed(() => {
    const total = this.totalSteps();

    return total === null ? 0 : Math.round(((this.stepIndex() + 1) / total) * 100);
  });

  protected readonly caption = computed(() => {
    const total = this.totalSteps();

    return total === null ? 'Frage 1' : `Frage ${this.stepIndex() + 1} von ${total}`;
  });
}
