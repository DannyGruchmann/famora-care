import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '@/app/components/button/button.component';

/**
 * Native <dialog>, so the browser handles the backdrop, focus trap and Esc. The `open` input is
 * mirrored onto the element through an effect — showModal() and close() are imperative calls that
 * cannot be expressed as a binding.
 *
 * The heading input is deliberately not called `title`: that is a global HTML attribute and would
 * additionally surface as a tooltip on the host element.
 */
@Component({
  selector: 'famora-confirm-dialog',
  imports: [Button],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input('Abbrechen');
  readonly confirmDisabled = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelButton = viewChild.required<Button>('cancelButton');

  constructor() {
    effect(() => {
      this.syncDialogState(this.open());
    });
  }

  private syncDialogState(shouldBeOpen: boolean): void {
    const dialog = this.dialog().nativeElement;

    if (shouldBeOpen && !dialog.open) {
      dialog.showModal();
      // Focus starts on the harmless option, not on the destructive one.
      this.cancelButton().focus();
    }

    if (!shouldBeOpen && dialog.open) dialog.close();
  }

  /**
   * Esc fires "cancel" and would close the dialog behind the caller's back — the open input would
   * then say open while the element is closed. Preventing it keeps the caller the single source
   * of truth.
   */
  protected onDialogCancel(event: Event): void {
    event.preventDefault();
    this.cancelled.emit();
  }
}
