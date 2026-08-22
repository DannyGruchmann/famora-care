import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROUTES } from '@/app/routes.constants';

/**
 * Imprint and privacy policy have to be reachable from every page (§ 5 DDG). Hence a component
 * of its own instead of copied links.
 */
@Component({
  selector: 'famora-legal-footer',
  imports: [RouterLink],
  templateUrl: './legal-footer.component.html',
  styleUrl: './legal-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalFooter {
  protected readonly routes = ROUTES;
}
