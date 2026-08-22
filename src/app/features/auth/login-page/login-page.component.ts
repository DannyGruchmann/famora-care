import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCompass } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { REDIRECT_PARAM, ROUTES } from '@/app/routes.constants';
import { AuthLayout } from '../auth-layout/auth-layout.component';
import { AuthSwitchLink } from '../auth-switch-link/auth-switch-link.component';
import { AuthQueries } from '../auth.queries';
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from '../auth.storage';
import {
  currentPasswordValidator,
  emailValidator,
  errorMessageOf,
  focusFirstInvalidField,
} from '../auth.validators';
import { PasswordField } from '../password-field/password-field.component';
import { TextField } from '@/app/components/text-field/text-field.component';

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

  protected readonly fieldIds = FIELD_IDS;
  protected readonly routes = ROUTES;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: [loadAuthDraft().email, emailValidator],
    password: ['', currentPasswordValidator],
  });

  protected readonly wasSubmitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | undefined>(undefined);

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

  constructor() {
    // So that a look at the imprint does not cost the input.
    this.form.controls.email.valueChanges.subscribe((email) => {
      saveAuthDraft({ firstName: loadAuthDraft().firstName, email });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.wasSubmitted.set(true);
    this.serverError.set(undefined);

    if (this.form.invalid) {
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
    const result = await this.authQueries.signIn(email, password);
    this.isSubmitting.set(false);

    if (!result.ok) {
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
