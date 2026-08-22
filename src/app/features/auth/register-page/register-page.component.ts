import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideCheck } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { ROUTES } from '@/app/routes.constants';
import { AuthLayout } from '../auth-layout/auth-layout.component';
import { AuthSwitchLink } from '../auth-switch-link/auth-switch-link.component';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';
import { AuthQueries } from '../auth.queries';
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from '../auth.storage';
import {
  emailValidator,
  errorMessageOf,
  firstNameValidator,
  focusFirstInvalidField,
  newPasswordValidator,
  privacyConsentValidator,
} from '../auth.validators';
import { fieldErrorId } from '@/app/components/form-field/field-ids';
import { PasswordField } from '../password-field/password-field.component';
import { PasswordStrength } from '../password-strength/password-strength.component';
import { TextField } from '@/app/components/text-field/text-field.component';

const FIELD_IDS = {
  firstName: 'register-first-name',
  email: 'register-email',
  password: 'register-password',
  privacy: 'register-privacy',
} as const;

@Component({
  selector: 'famora-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideCheck,
    AuthLayout,
    AuthSwitchLink,
    Button,
    PasswordField,
    PasswordStrength,
    TextField,
  ],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authQueries = inject(AuthQueries);
  private readonly router = inject(Router);

  protected readonly fieldIds = FIELD_IDS;
  protected readonly routes = ROUTES;
  protected readonly privacyErrorId = fieldErrorId(FIELD_IDS.privacy);
  protected readonly passwordHint = `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: [loadAuthDraft().firstName, firstNameValidator],
    email: [loadAuthDraft().email, emailValidator],
    password: ['', newPasswordValidator],
    privacy: [false, privacyConsentValidator],
  });

  protected readonly wasSubmitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | undefined>(undefined);

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly password = computed(() => this.value().password ?? '');

  protected readonly firstNameError = computed(() => this.errorFor('firstName'));
  protected readonly emailError = computed(() => this.errorFor('email'));
  protected readonly passwordError = computed(() => this.errorFor('password'));
  protected readonly privacyError = computed(() => this.errorFor('privacy'));

  constructor() {
    // So that a look at the privacy policy does not cost half the input.
    this.form.valueChanges.subscribe(({ firstName, email }) => {
      saveAuthDraft({ firstName: firstName ?? '', email: email ?? '' });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.wasSubmitted.set(true);
    this.serverError.set(undefined);

    if (this.form.invalid) {
      this.focusFirstProblem();
      return;
    }

    await this.createAccount();
  }

  private errorFor(name: 'firstName' | 'email' | 'password' | 'privacy'): string | undefined {
    this.value();

    return errorMessageOf(this.form.controls[name], this.wasSubmitted());
  }

  private focusFirstProblem(): void {
    const controls = this.form.controls;

    focusFirstInvalidField([
      [FIELD_IDS.firstName, controls.firstName.invalid],
      [FIELD_IDS.email, controls.email.invalid],
      [FIELD_IDS.password, controls.password.invalid],
      [FIELD_IDS.privacy, controls.privacy.invalid],
    ]);
  }

  private async createAccount(): Promise<void> {
    const { firstName, email, password } = this.form.getRawValue();

    this.isSubmitting.set(true);
    const result = await this.authQueries.signUp({ email, password, firstName });
    this.isSubmitting.set(false);

    if (!result.ok) {
      this.serverError.set(result.message);
      return;
    }

    clearAuthDraft();

    /**
     * To the welcome page rather than straight into the questions: the account is a step along
     * the way, not the goal. Anyone dropped into the questionnaire immediately has not yet read
     * what they are getting into — and in this situation that needs time.
     */
    await this.router.navigateByUrl(ROUTES.landing, { replaceUrl: true });
  }
}
