import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

/**
 * Sits in the reserved notice slot of the auth layout, so showing it moves nothing on the page.
 *
 * role="alert" puts the message straight into the screen reader's announcement: the user just
 * submitted and is waiting for exactly this information. Focus follows, because on a tall form
 * the message can be off screen — and focusing an element scrolls it into view by itself, which
 * is why there is no scroll call here.
 */
@Component({
  selector: 'famora-form-error',
  templateUrl: './form-error.component.html',
  styleUrl: './form-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormError {
  readonly message = input<string>();

  private readonly alert = viewChild<ElementRef<HTMLElement>>('alert');

  constructor() {
    effect(() => {
      if (this.message() === undefined) return;

      const element = this.alert()?.nativeElement;
      if (element === undefined) return;

      element.focus();
    });
  }
}
