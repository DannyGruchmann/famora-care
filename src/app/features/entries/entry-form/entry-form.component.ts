import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Button } from '@/app/components/button/button.component';
import { TextArea } from '@/app/components/text-area/text-area.component';
import { TextField } from '@/app/components/text-field/text-field.component';
import { emptyDraft, type EntryDraft } from '../entry.types';
import type { EntryKindConfig } from '../entry.kinds';

/** Mirrors the check constraints in supabase/folder-entries.sql, so nobody runs into them. */
export const FIELD_LIMITS = {
  title: 120,
  reference: 300,
  contact: 300,
  detail: 2000,
} as const;

function control(): FormControl<string> {
  return new FormControl('', { nonNullable: true });
}

@Component({
  selector: 'famora-entry-form',
  imports: [ReactiveFormsModule, Button, TextField, TextArea],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryForm {
  readonly config = input.required<EntryKindConfig>();
  /** Prefix for the field ids — several of these forms can be open on one page. */
  readonly formId = input.required<string>();
  readonly value = input<EntryDraft>(emptyDraft());
  readonly isSaving = input(false);
  /** Only an existing entry can be deleted; the add form has nothing to remove. */
  readonly canDelete = input(false);

  readonly submitted = output<EntryDraft>();
  readonly cancelled = output<void>();
  readonly deleted = output<void>();

  protected readonly limits = FIELD_LIMITS;

  protected readonly form = new FormGroup({
    title: control(),
    reference: control(),
    contact: control(),
    detail: control(),
  });

  /**
   * Errors appear only after an attempt to save, not while typing — the same rule the auth forms
   * follow. Being told off for an empty field you have not reached yet is not help.
   */
  private readonly wasSubmitted = signal(false);
  private readonly title = toSignal(this.form.controls.title.valueChanges, { initialValue: '' });

  protected readonly titleError = computed(() =>
    this.wasSubmitted() && this.title().trim() === ''
      ? 'Bitte tragen Sie hier etwas ein.'
      : undefined,
  );

  constructor() {
    effect(() => {
      this.form.setValue({ ...this.value() });
      this.wasSubmitted.set(false);
    });
  }

  protected fieldId(field: string): string {
    return `${this.formId()}-${field}`;
  }

  protected onSubmit(): void {
    this.wasSubmitted.set(true);

    const draft = this.form.getRawValue();
    if (draft.title.trim() === '') return;

    this.submitted.emit(draft);
  }
}
