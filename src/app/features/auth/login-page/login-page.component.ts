import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCompass } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { environment } from '@/environments/environment';
import { REDIRECT_PARAM, ROUTES } from '@/app/routes.constants';
import { AuthLayout } from '../auth-layout/auth-layout.component';
import { AuthSwitchLink } from '../auth-switch-link/auth-switch-link.component';
import { AuthQueries } from '../auth.queries';
import { AuthService } from '../auth.service';
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from '../auth.storage';
import {
  currentPasswordValidator,
  emailValidator,
  errorMessageOf,
  focusFirstInvalidField,
} from '../auth.validators';
import { PasswordField } from '../password-field/password-field.component';
import { TextField } from '@/app/components/text-field/text-field.component';
import { TurnstileWidget } from '../turnstile-widget/turnstile-widget.component';

const FIELD_IDS = {
  email: 'login-email',
  password: 'login-password',
} as const;

@Component({
  selector: 'famora-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideCompass,
    AuthLayout,
    AuthSwitchLink,
    Button,
    PasswordField,
    TextField,
    TurnstileWidget,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authQueries = inject(AuthQueries);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly fieldIds = FIELD_IDS;
  protected readonly routes = ROUTES;
  /** Empty means: no Turnstile widget configured — the form then submits without a token. */
  protected readonly turnstileSiteKey = environment.turnstileSiteKey;

  private readonly turnstile = viewChild(TurnstileWidget);
  protected readonly captchaToken = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    email: [loadAuthDraft().email, emailValidator],
    password: ['', currentPasswordValidator],
  });

  protected readonly wasSubmitted = signal(false);
  protected readonly isSubmitting = signal(false);
  // An expired or reused link is sent here by the Site URL fallback. It shares the slot with a
  // failed sign-in, so the next attempt clears it on its own.
  protected readonly serverError = signal(this.auth.linkError);

  /** Control errors are not signals, so the error texts re-derive from every value change. */
  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly emailError = computed(() => {
    this.value();

    return errorMessageOf(this.form.controls.email, this.wasSubmitted());
  });

  protected readonly passwordError = computed(() => {
    this.value();

    return errorMessageOf(this.form.controls.password, this.wasSubmitted());
  });

  /** Blocks submit until the widget has a token — a configured Turnstile is not optional to solve. */
  protected readonly canSubmit = computed(
    () =>
      !this.isSubmitting() && (this.turnstileSiteKey.length === 0 || this.captchaToken() !== ''),
  );

  constructor() {
    // So that a look at the imprint does not cost the input.
    this.form.controls.email.valueChanges.subscribe((email) => {
      saveAuthDraft({ firstName: loadAuthDraft().firstName, email });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.wasSubmitted.set(true);
    this.serverError.set(undefined);

    // The button already disables itself while unsolved — this catches Enter, which ignores that.
    if (this.form.invalid || !this.canSubmit()) {
      focusFirstInvalidField([
        [FIELD_IDS.email, this.form.controls.email.invalid],
        [FIELD_IDS.password, this.form.controls.password.invalid],
      ]);
      return;
    }

    await this.signIn();
  }

  protected async continueAsGuest(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.landing);
  }

  private async signIn(): Promise<void> {
    const { email, password } = this.form.getRawValue();

    this.isSubmitting.set(true);
    const result = await this.authQueries.signIn(email, password, this.captchaToken() || undefined);
    this.isSubmitting.set(false);

    if (!result.ok) {
      // A Turnstile token is good for one request. After a wrong password the next attempt would
      // fail on the spent token instead of the password, so the widget starts over.
      this.turnstile()?.reset();
      this.captchaToken.set('');
      this.serverError.set(result.message);
      return;
    }

    clearAuthDraft();
    await this.router.navigateByUrl(this.redirectTarget(), { replaceUrl: true });
  }

  /**
   * Where the guard intercepted the visitor. Without it, signing in always lands on the overview,
   * even when they wanted to go somewhere else.
   */
  private redirectTarget(): string {
    return this.route.snapshot.queryParamMap.get(REDIRECT_PARAM) ?? ROUTES.dashboard;
  }
}
