import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { LoadingScreen } from '@/app/components/loading-screen/loading-screen.component';
import { AuthService } from '@/app/features/auth/auth.service';
import { LandingView } from '@/app/features/landing/landing-view/landing-view.component';
import { LegalFooter } from '@/app/features/legal/legal-footer/legal-footer.component';
import { ROUTES } from '@/app/routes.constants';
import { FolderCard } from '../folder-card/folder-card.component';
import { WelcomeStore } from '../welcome.store';

/**
 * What sits behind /willkommen. Two different pages share the address: the marketing page for
 * anyone without a folder, and the overview for everyone else.
 *
 * One address rather than two, because the decision needs an answer from the server. A second
 * route would have to be chosen before that answer exists — by the back arrow of the dashboard,
 * by the redirect after registering, by a bookmark — and each of them would sometimes be wrong.
 */
@Component({
  selector: 'famora-welcome-page',
  imports: [Button, LoadingScreen, LandingView, LegalFooter, FolderCard, RouterLink, LucidePlus],
  templateUrl: './welcome-page.component.html',
  styleUrl: './welcome-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WelcomeStore],
})
export class WelcomePage {
  private readonly auth = inject(AuthService);

  protected readonly store = inject(WelcomeStore);
  protected readonly routes = ROUTES;

  protected readonly greeting = computed(() => {
    const name = this.auth.firstName();

    return name === '' ? 'Willkommen zurück.' : `Willkommen zurück, ${name}.`;
  });
}
