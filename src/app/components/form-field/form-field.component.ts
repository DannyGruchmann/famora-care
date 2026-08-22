import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { fieldErrorId, fieldHintId } from './field-ids';

/**
 * Label, hint and error line around an input. Purely presentational — the input itself is
 * projected in, so text-field and password-field can each be their own ControlValueAccessor
 * instead of nesting one inside the other.
 */
@Component({
  selector: 'famora-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormField {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();

  protected readonly hintId = computed(() => fieldHintId(this.fieldId()));
  protected readonly errorId = computed(() => fieldErrorId(this.fieldId()));
}
