import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@/app/components/button/button.component';
import { StickyCta } from '@/app/components/sticky-cta/sticky-cta.component';
import { AuthService } from '@/app/features/auth/auth.service';
import { LegalFooter } from '@/app/features/legal/legal-footer/legal-footer.component';
import { ROUTES } from '@/app/routes.constants';
import { HeroSection } from '../hero-section/hero-section.component';
import { PathsSection } from '../paths-section/paths-section.component';
import { StepsSection } from '../steps-section/steps-section.component';
import { TrustSection } from '../trust-section/trust-section.component';

@Component({
  selector: 'famora-landing-view',
  imports: [Button, StickyCta, LegalFooter, HeroSection, PathsSection, StepsSection, TrustSection],
  templateUrl: './landing-view.component.html',
  styleUrl: './landing-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingView {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * You land here right after registering. Anyone who already has an account should then go to
   * the questions and not be sent back into the registration.
   */
  protected readonly isSignedIn = computed(() => this.auth.status() === 'signed-in');

  protected readonly ctaNote = computed(() =>
    this.isSignedIn()
      ? 'Sie können jederzeit unterbrechen.'
      : 'Kostenlos. In zwei Minuten eingerichtet.',
  );

  protected async start(): Promise<void> {
    await this.router.navigateByUrl(this.isSignedIn() ? ROUTES.onboarding : ROUTES.register);
  }
}
