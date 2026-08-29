import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '@/app/components/button/button.component';

/**
 * 'add' stays open at the bottom of the list and has nothing to cancel or delete; 'edit' takes the
 * place of one row and needs a way back out of both.
 */
export type HelperFormMode = 'add' | 'edit';

/**
 * The name of a person, whether they are being entered for the first time or corrected afterwards.
 * One form rather than two, because the two cases differ in their buttons, not in their field.
 */
@Component({
  selector: 'famora-helper-form',
  imports: [Button],
  templateUrl: './helper-form.component.html',
  styleUrl: './helper-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelperForm {
  /** Prefix for the field id — several of these forms can sit on one page. */
  readonly formId = input.required<string>();
  readonly mode = input<HelperFormMode>('add');
  readonly value = input('');

  readonly submitted = output<string>();
  readonly cancelled = output<void>();
  readonly deleted = output<void>();

  /** Follows the input until somebody types; their text then wins until the input changes again. */
  protected readonly name = linkedSignal(() => this.value());

  protected readonly isEditing = computed(() => this.mode() === 'edit');
  protected readonly submitLabel = computed(() => (this.isEditing() ? 'Speichern' : 'Hinzufügen'));
  protected readonly isEmpty = computed(() => this.name().trim() === '');

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    afterNextRender(() => this.focusNameWhenEditing());
  }

  /**
   * An edit form takes the place of the row whose button opened it, so that button is gone by the
   * time this renders and focus would otherwise fall to the document body. Only in 'edit': the add
   * form is there from the start and nobody asked for it.
   */
  private focusNameWhenEditing(): void {
    if (!this.isEditing()) return;

    this.nameInput().nativeElement.focus();
  }

  protected fieldId(field: string): string {
    return `${this.formId()}-${field}`;
  }

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isEmpty()) return;

    this.submitted.emit(this.name());

    // The add form stays open for the next person and clears itself. An edit form is closed by the
    // section instead, and blanking it here would empty the row for a frame on the way out.
    if (!this.isEditing()) this.name.set('');
  }
}
