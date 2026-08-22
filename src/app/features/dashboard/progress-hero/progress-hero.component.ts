import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideClock } from '@lucide/angular';
import { ProgressRing } from '@/app/components/progress-ring/progress-ring.component';
import { getDeadlineLabel } from '../dashboard.utils';
import type { DeadlineTask } from '../dashboard.types';

@Component({
  selector: 'famora-progress-hero',
  imports: [ProgressRing, LucideClock],
  templateUrl: './progress-hero.component.html',
  styleUrl: './progress-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressHero {
  readonly doneCount = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly completionRate = input.required<number>();
  readonly nextDeadline = input.required<DeadlineTask | null>();

  protected readonly deadlineLabel = computed(() => {
    const deadline = this.nextDeadline();

    return deadline === null ? '' : getDeadlineLabel(deadline.daysLeft);
  });
}
