import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Keeps the folder title on one line. */
const MAX_LENGTH = 40;

@Component({
  selector: 'famora-text-answer-input',
  templateUrl: './text-answer-input.component.html',
  styleUrl: './text-answer-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextAnswerInput {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input<string>();
  readonly value = input.required<string>();

  readonly changed = output<string>();

  protected readonly maxLength = MAX_LENGTH;

  protected onInput(event: Event): void {
    this.changed.emit((event.target as HTMLInputElement).value);
  }
}
