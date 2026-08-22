import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalFooter } from '@/app/features/legal/legal-footer/legal-footer.component';
import { FormError } from '../form-error/form-error.component';
import { ROUTES } from '@/app/routes.constants';

@Component({
  selector: 'famora-auth-layout',
  imports: [RouterLink, LegalFooter, FormError],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  readonly heading = input.required<string>();
  /** One sentence under the heading. Left out when the page speaks for itself. */
  readonly intro = input<string>();
  /**
   * What went wrong on the last submit. Takes the place of the intro rather than being added to
   * it: the slot is reserved for the taller of the two, so the card below never moves.
   */
  readonly error = input<string>();

  protected readonly routes = ROUTES;
}
