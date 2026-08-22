import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The link to the respective other auth page. Its own component because projected content keeps
 * the style encapsulation of the page that writes it, so auth-layout cannot style it from afar.
 */
@Component({
  selector: 'famora-auth-switch-link',
  imports: [RouterLink],
  templateUrl: './auth-switch-link.component.html',
  styleUrl: './auth-switch-link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSwitchLink {
  readonly target = input.required<string>();
}
