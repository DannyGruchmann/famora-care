import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from '@/app/components/button/button.component';
import { ROUTES } from '@/app/routes.constants';
import { AuthLayout } from '../auth-layout/auth-layout.component';
import { AuthSwitchLink } from '../auth-switch-link/auth-switch-link.component';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';
import { AuthQueries } from '../auth.queries';
import { AuthService } from '../auth.service';
import { errorMessageOf, focusFirstInvalidField, newPasswordValidator } from '../auth.validators';
import { PasswordField } from '../password-field/password-field.component';
import { PasswordStrength } from '../password-strength/password-strength.component';

const PASSWORD_FIELD_ID = 'new-password';

/**
 * Target of the link from the reset email. Supabase reads the token out of the address on load
 * and creates a session from it — which is why this page must not sit behind the auth guard: an
 * expired link should be explained here and not silently end up on the sign-in page.
 */
@Component({
  selector: 'famora-reset-password-page',
  imports: [
    ReactiveFormsModule,
    AuthLayout,
    AuthSwitchLink,
    Button,
    PasswordField,
    PasswordStrength,
  ],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authQueries = inject(AuthQueries);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly passwordFieldId = PASSWORD_FIELD_ID;
  protected readonly routes = ROUTES;
  protected readonly passwordHint = `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
  protected readonly status = this.auth.status;

  protected readonly form = this.formBuilder.nonNullable.group({
    password: ['', newPasswordValidator],
  });

  protected readonly wasSubmitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | undefined>(undefined);

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly password = computed(() => this.value().password ?? '');

  protected readonly passwordError = computed(() => {
    this.value();

    return errorMessageOf(this.form.controls.password, this.wasSubmitted());
  });

  protected async onSubmit(): Promise<void> {
    this.wasSubmitted.set(true);
    this.serverError.set(undefined);

    if (this.form.invalid) {
      focusFirstInvalidField([[PASSWORD_FIELD_ID, true]]);
      return;
    }

    await this.savePassword();
  }

  protected async requestNewLink(): Promise<void> {
    await this.router.navigateByUrl(ROUTES.forgotPassword);
  }

  private async savePassword(): Promise<void> {
    this.isSubmitting.set(true);
    const result = await this.authQueries.updatePassword(this.form.getRawValue().password);
    this.isSubmitting.set(false);

    if (!result.ok) {
      this.serverError.set(result.message);
      return;
    }

    // The session from the link stays in place — the user is signed in now.
    await this.router.navigateByUrl(ROUTES.dashboard, { replaceUrl: true });
  }
}
