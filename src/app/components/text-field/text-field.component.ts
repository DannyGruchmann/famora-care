import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { FormField } from '@/app/components/form-field/form-field.component';
import { fieldDescribedBy } from '@/app/components/form-field/field-ids';

/**
 * A field with label, hint and error text. The aria-describedby wiring happens centrally here —
 * on each individual field it would be forgotten.
 */
@Component({
  selector: 'famora-text-field',
  imports: [FormField],
  templateUrl: './text-field.component.html',
  styleUrl: './text-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextField), multi: true },
  ],
})
export class TextField implements ControlValueAccessor {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly type = input('text');
  readonly autocomplete = input<string>();
  readonly placeholder = input<string>();
  readonly maxlength = input<number>();
  readonly required = input(false);

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.fieldId(), this.hint() !== undefined),
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;

    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
