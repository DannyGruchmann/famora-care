import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import type { AnswerOption } from '../onboarding.types';

const PLACEHOLDER = 'Bitte auswählen';

@Component({
  selector: 'famora-select-answer-input',
  imports: [LucideChevronDown],
  templateUrl: './select-answer-input.component.html',
  styleUrl: './select-answer-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectAnswerInput {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<AnswerOption[]>();
  readonly value = input.required<string>();

  readonly changed = output<string>();

  protected readonly placeholder = PLACEHOLDER;

  protected onChange(event: Event): void {
    this.changed.emit((event.target as HTMLSelectElement).value);
  }
}
