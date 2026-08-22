import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideClock, LucideHeartHandshake, LucideShieldCheck } from '@lucide/angular';
import { ProgressRing } from '@/app/components/progress-ring/progress-ring.component';
import { getDeadlineLabel } from '@/app/features/dashboard/dashboard.utils';
import { MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import { folderPath } from '@/app/routes.constants';
import type { FolderSummary } from '../welcome.summary';

const MODE_LABELS = {
  'after-death': 'Nach einem Todesfall',
  prepare: 'Vorsorge',
} as const;

function describeProgress(done: number, total: number): string {
  if (total === 0) return 'Noch keine Aufgaben';

  return `${done} von ${total} erledigt`;
}

@Component({
  selector: 'famora-folder-card',
  imports: [RouterLink, ProgressRing, LucideClock, LucideHeartHandshake, LucideShieldCheck],
  templateUrl: './folder-card.component.html',
  styleUrl: './folder-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderCard {
  readonly folder = input.required<FolderSummary>();

  /** The precaution folder carries its own colour, so the two paths stay apart at a glance. */
  protected readonly isPreparing = computed(() => this.folder().mode === MODE_PREPARE);

  protected readonly path = computed(() => folderPath(this.folder().id));
  protected readonly modeLabel = computed(() => MODE_LABELS[this.folder().mode]);

  protected readonly progressLabel = computed(() =>
    describeProgress(this.folder().doneCount, this.folder().totalCount),
  );

  protected readonly deadlineLabel = computed(() => {
    const deadline = this.folder().nextDeadline;

    return deadline === null ? '' : getDeadlineLabel(deadline.daysLeft);
  });
}
