import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { todayIso } from '@/app/shared/date.utils';

@Component({
  selector: 'famora-date-answer-input',
  templateUrl: './date-answer-input.component.html',
  styleUrl: './date-answer-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateAnswerInput {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();

  readonly changed = output<string>();

  /** A date of death in the future would turn every deadline negative. */
  protected readonly maxDate = todayIso();

  protected onInput(event: Event): void {
    this.changed.emit((event.target as HTMLInputElement).value);
  }
}
