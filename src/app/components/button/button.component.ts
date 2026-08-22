import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Click handlers are not forwarded through an output: a click on the inner button bubbles up to
 * <famora-button>, so `(click)` works on the host directly. A disabled button emits no click at
 * all, which keeps that behaviour correct too.
 */
@Component({
  selector: 'famora-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.button-host--full-width]': 'fullWidth()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly fullWidth = input(false);
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);

  private readonly control = viewChild.required<ElementRef<HTMLButtonElement>>('control');

  readonly variantClass = computed(() => `button--${this.variant()}`);

  /** Lets a caller move focus onto the real button, e.g. when a dialog opens. */
  focus(): void {
    this.control().nativeElement.focus();
  }
}
