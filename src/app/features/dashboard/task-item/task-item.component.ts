import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { getDeadlineLabel } from '../dashboard.utils';
import type { Helper, Task } from '../dashboard.types';

@Component({
  selector: 'famora-task-item',
  templateUrl: './task-item.component.html',
  styleUrl: './task-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly helpers = input.required<Helper[]>();

  readonly toggled = output<void>();
  /** The id of the chosen person, or an empty string for "nobody yet". */
  readonly assigned = output<string>();

  protected readonly assignId = computed(() => `assign-${this.task().id}`);

  protected readonly isOverdue = computed(() => {
    const daysLeft = this.task().daysLeft;

    return daysLeft !== null && daysLeft < 0;
  });

  protected readonly deadlineLabel = computed(() => {
    const daysLeft = this.task().daysLeft;

    return daysLeft === null ? '' : getDeadlineLabel(daysLeft);
  });

  /** Only worth offering once somebody is entered and the task is still open. */
  protected readonly showsAssignment = computed(
    () => this.helpers().length > 0 && !this.task().done,
  );

  protected onAssignChange(event: Event): void {
    this.assigned.emit((event.target as HTMLSelectElement).value);
  }
}
