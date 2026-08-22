import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideHeartHandshake, LucideShieldCheck } from '@lucide/angular';
import { ThreadSection } from '@/app/components/thread-section/thread-section.component';
import { AuthService } from '@/app/features/auth/auth.service';
import {
  MODE_AFTER_DEATH,
  MODE_PARAM,
  MODE_PREPARE,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingMode } from '@/app/features/onboarding/onboarding.types';
import { ROUTES } from '@/app/routes.constants';

interface PathOption {
  id: OnboardingMode;
  title: string;
  description: string;
  /** Built once here: Angular templates cannot write a computed property key. */
  queryParams: Record<string, string>;
}

const PATH_OPTIONS: PathOption[] = [
  {
    id: MODE_AFTER_DEATH,
    title: 'Jemand ist gestorben',
    description: 'Wir sortieren mit Ihnen, was sofort zählt – und was warten kann.',
    queryParams: { [MODE_PARAM]: MODE_AFTER_DEATH },
  },
  {
    id: MODE_PREPARE,
    title: 'Ich möchte vorsorgen',
    description: 'Legen Sie in Ruhe ab, was Ihre Familie im Ernstfall wissen muss.',
    queryParams: { [MODE_PARAM]: MODE_PREPARE },
  },
];

@Component({
  selector: 'famora-paths-section',
  imports: [RouterLink, ThreadSection, LucideArrowRight, LucideHeartHandshake, LucideShieldCheck],
  templateUrl: './paths-section.component.html',
  styleUrl: './paths-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathsSection {
  private readonly auth = inject(AuthService);

  protected readonly options = PATH_OPTIONS;
  protected readonly afterDeath = MODE_AFTER_DEATH;

  protected readonly isSignedIn = computed(() => this.auth.status() === 'signed-in');

  /** Signed in it goes straight to the questions, otherwise the way leads via registration. */
  protected readonly target = computed(() =>
    this.isSignedIn() ? ROUTES.onboarding : ROUTES.register,
  );
}
