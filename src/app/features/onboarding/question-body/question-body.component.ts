import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AnswerOptionButton } from '../answer-option-button/answer-option-button.component';
import { DateAnswerInput } from '../date-answer-input/date-answer-input.component';
import { SelectAnswerInput } from '../select-answer-input/select-answer-input.component';
import { TextAnswerInput } from '../text-answer-input/text-answer-input.component';
import type {
  ChoiceQuestion,
  DateQuestion,
  Question,
  SelectQuestion,
  TextQuestion,
} from '../onboarding.types';

/**
 * Picks the input that fits the question kind. Angular templates cannot narrow a discriminated
 * union, so each kind gets a typed accessor here instead of an $any cast in the template.
 */
@Component({
  selector: 'famora-question-body',
  imports: [AnswerOptionButton, DateAnswerInput, SelectAnswerInput, TextAnswerInput],
  templateUrl: './question-body.component.html',
  styleUrl: './question-body.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBody {
  readonly question = input.required<Question>();
  readonly selectedIds = input.required<string[]>();
  readonly blockedIds = input.required<Set<string>>();

  readonly optionChosen = output<string>();
  readonly valueChanged = output<string>();

  protected readonly singleValue = computed(() => this.selectedIds()[0] ?? '');

  protected readonly dateQuestion = computed((): DateQuestion | null =>
    this.question().kind === 'date' ? (this.question() as DateQuestion) : null,
  );

  protected readonly textQuestion = computed((): TextQuestion | null =>
    this.question().kind === 'text' ? (this.question() as TextQuestion) : null,
  );

  protected readonly selectQuestion = computed((): SelectQuestion | null =>
    this.question().kind === 'select' ? (this.question() as SelectQuestion) : null,
  );

  protected readonly choiceQuestion = computed((): ChoiceQuestion | null =>
    this.question().kind === 'choice' ? (this.question() as ChoiceQuestion) : null,
  );

  protected isSelected(optionId: string): boolean {
    return this.selectedIds().includes(optionId);
  }

  protected isBlocked(optionId: string): boolean {
    return this.blockedIds().has(optionId);
  }
}
