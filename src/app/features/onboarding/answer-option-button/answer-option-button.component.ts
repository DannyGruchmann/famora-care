import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import type { AnswerOption } from '../onboarding.types';

@Component({
  selector: 'famora-answer-option-button',
  imports: [LucideCheck],
  templateUrl: './answer-option-button.component.html',
  styleUrl: './answer-option-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerOptionButton {
  readonly option = input.required<AnswerOption>();
  readonly selected = input.required<boolean>();
  /** Locked by a mutually exclusive selection. */
  readonly disabled = input(false);

  readonly chosen = output<string>();
}
