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
 * The multi-line sibling of TextField. A separate component rather than a flag on that one:
 * a template switching between input and textarea would have to repeat every binding, and the
 * pair that drifts first is the accessibility wiring.
 */
@Component({
  selector: 'famora-text-area',
  imports: [FormField],
  templateUrl: './text-area.component.html',
  styleUrl: './text-area.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextArea), multi: true }],
})
export class TextArea implements ControlValueAccessor {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly placeholder = input<string>();
  readonly rows = input(3);
  readonly maxlength = input<number>();

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
    const next = (event.target as HTMLTextAreaElement).value;

    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
