import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { FormField } from '@/app/components/form-field/form-field.component';
import { fieldDescribedBy } from '@/app/components/form-field/field-ids';

/**
 * current-password when signing in, new-password when registering — otherwise password managers
 * suggest the old password during registration.
 */
export type PasswordAutocomplete = 'current-password' | 'new-password';

@Component({
  selector: 'famora-password-field',
  imports: [FormField, LucideEye, LucideEyeOff],
  templateUrl: './password-field.component.html',
  styleUrl: './password-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordField), multi: true },
  ],
})
export class PasswordField implements ControlValueAccessor {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly autocomplete = input.required<PasswordAutocomplete>();

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);
  protected readonly isVisible = signal(false);

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.fieldId(), this.hint() !== undefined),
  );

  protected readonly toggleLabel = computed(() =>
    this.isVisible() ? 'Passwort verbergen' : 'Passwort anzeigen',
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

  protected toggleVisibility(): void {
    this.isVisible.update((visible) => !visible);
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
