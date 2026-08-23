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
import { LucideMailCheck } from '@lucide/angular';
import { Button } from '@/app/components/button/button.component';
import { environment } from '@/environments/environment';
import { ROUTES } from '@/app/routes.constants';
import { AuthLayout } from '../auth-layout/auth-layout.component';
import { AuthSwitchLink } from '../auth-switch-link/auth-switch-link.component';
import { AuthQueries } from '../auth.queries';
import { loadAuthDraft } from '../auth.storage';
import { emailValidator, errorMessageOf, focusFirstInvalidField } from '../auth.validators';
import { TextField } from '@/app/components/text-field/text-field.component';
import { TurnstileWidget } from '../turnstile-widget/turnstile-widget.component';

const EMAIL_FIELD_ID = 'reset-email';

@Component({
  selector: 'famora-forgot-password-page',
  imports: [
    ReactiveFormsModule,
    LucideMailCheck,
    AuthLayout,
    AuthSwitchLink,
    Button,
    TextField,
    TurnstileWidget,
  ],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authQueries = inject(AuthQueries);

  protected readonly emailFieldId = EMAIL_FIELD_ID;
  protected readonly routes = ROUTES;
  protected readonly turnstileSiteKey = environment.turnstileSiteKey;

  private readonly turnstile = viewChild(TurnstileWidget);
  protected readonly captchaToken = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    email: [loadAuthDraft().email, emailValidator],
  });

  protected readonly wasSubmitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | undefined>(undefined);
  protected readonly linkSent = signal(false);

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly email = computed(() => this.value().email ?? '');

  protected readonly emailError = computed(() => {
    this.value();

    return errorMessageOf(this.form.controls.email, this.wasSubmitted());
  });

  /** Blocks submit until the widget has a token — a configured Turnstile is not optional to solve. */
  protected readonly canSubmit = computed(
    () =>
      !this.isSubmitting() && (this.turnstileSiteKey.length === 0 || this.captchaToken() !== ''),
  );

  protected async onSubmit(): Promise<void> {
    this.wasSubmitted.set(true);
    this.serverError.set(undefined);

    // The button already disables itself while unsolved — this catches Enter, which ignores that.
    if (this.form.invalid || !this.canSubmit()) {
      focusFirstInvalidField([[EMAIL_FIELD_ID, true]]);
      return;
    }

    await this.requestLink();
  }

  private async requestLink(): Promise<void> {
    const captchaToken = this.captchaToken() || undefined;

    this.isSubmitting.set(true);
    const result = await this.authQueries.requestPasswordReset(
      this.form.getRawValue().email,
      captchaToken,
    );
    this.isSubmitting.set(false);

    if (!result.ok) {
      this.turnstile()?.reset();
      this.captchaToken.set('');
      this.serverError.set(result.message);
      return;
    }

    this.linkSent.set(true);
  }
}
