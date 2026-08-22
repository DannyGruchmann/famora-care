import { inject, Injectable } from '@angular/core';
import type { AuthError } from '@supabase/supabase-js';
import { SupabaseService } from '@/app/lib/supabase.service';
import { ROUTES } from '@/app/routes.constants';
import type { AuthResult, SignUpInput } from './auth.types';

const GENERIC_ERROR =
  'Das hat gerade nicht geklappt. Bitte versuchen Sie es in einem Moment noch einmal.';

const NOT_CONFIGURED: AuthResult = { ok: false, message: GENERIC_ERROR };

/**
 * Supabase answers in English and partly in technical terms. Only what the user can change is
 * translated — everything else stays deliberately vague, so no conclusions about existing
 * accounts are possible.
 *
 * A lookup instead of a switch: the mapping is data, and it stays one screenful that way.
 */
const ERROR_MESSAGES: Record<string, string | undefined> = {
  user_already_exists: 'Zu dieser Adresse gibt es schon ein Konto. Melden Sie sich stattdessen an.',
  email_exists: 'Zu dieser Adresse gibt es schon ein Konto. Melden Sie sich stattdessen an.',
  weak_password: 'Dieses Passwort ist zu leicht zu erraten. Bitte wählen Sie ein längeres.',
  over_email_send_rate_limit: 'Zu viele Versuche. Bitte warten Sie einen Moment.',
  over_request_rate_limit: 'Zu viele Versuche. Bitte warten Sie einen Moment.',
  // Happens on typos in the domain ("@gmial.com"). Without its own message the user would only
  // see "did not work" — and start looking for the mistake on their side.
  email_address_invalid:
    'Diese E-Mail-Adresse akzeptiert der Server nicht. Bitte prüfen Sie die Schreibweise.',
  validation_failed:
    'Diese E-Mail-Adresse akzeptiert der Server nicht. Bitte prüfen Sie die Schreibweise.',
  // One single answer for "account does not exist" and "wrong password". Two different messages
  // would reveal which addresses have an account.
  invalid_credentials: 'E-Mail-Adresse oder Passwort stimmt nicht.',
  same_password: 'Das ist Ihr bisheriges Passwort. Bitte wählen Sie ein anderes.',
};

function toGermanMessage(error: AuthError): string {
  return ERROR_MESSAGES[error.code ?? ''] ?? GENERIC_ERROR;
}

/** Target for links from emails. Must be allowed under URL Configuration in the dashboard. */
function appUrl(route: string): string {
  return `${window.location.origin}${route}`;
}

function toResult(error: AuthError | null): AuthResult {
  return error === null ? { ok: true } : { ok: false, message: toGermanMessage(error) };
}

@Injectable({ providedIn: 'root' })
export class AuthQueries {
  private readonly supabase = inject(SupabaseService);

  /**
   * Creates the account and signs in directly. This assumes "Confirm email" is switched off under
   * Authentication -> Sign In / Providers in the Supabase project. If it is on, no session comes
   * back here and the user then faces an application that will not let them in.
   */
  async signUp({ email, password, firstName }: SignUpInput): Promise<AuthResult> {
    const client = this.supabase.client;

    // Missing configuration is a fault of the application, not of the user — the cause goes to
    // the console, they are only told it is not on them.
    if (client === null) return NOT_CONFIGURED;

    try {
      const { error } = await client.auth.signUp({
        email: email.trim(),
        password,
        // Lands in raw_user_meta_data. Enough for a display name; a profiles table only pays off
        // once relatives need real records.
        options: { data: { first_name: firstName.trim() } },
      });

      return toResult(error);
    } catch {
      // No network, dead DNS, paused project: all cases where the user did nothing wrong and
      // only needs to know that it is not on them.
      return NOT_CONFIGURED;
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const client = this.supabase.client;
    if (client === null) return NOT_CONFIGURED;

    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      return toResult(error);
    } catch {
      return NOT_CONFIGURED;
    }
  }

  /**
   * Signs out no matter what the server says: if the call fails, the local session is gone
   * anyway — and that is what the user expects when pressing sign out on someone else's device.
   */
  async signOut(): Promise<void> {
    const client = this.supabase.client;
    if (client === null) return;

    try {
      await client.auth.signOut();
    } catch {
      // Without a network the server-side token stays alive. Trying is all that can be done here.
    }
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const client = this.supabase.client;
    if (client === null) return NOT_CONFIGURED;

    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: appUrl(ROUTES.resetPassword),
      });

      return toResult(error);
    } catch {
      return NOT_CONFIGURED;
    }
  }

  /** Sets the password of the running session — after clicking the link from the email. */
  async updatePassword(password: string): Promise<AuthResult> {
    const client = this.supabase.client;
    if (client === null) return NOT_CONFIGURED;

    try {
      const { error } = await client.auth.updateUser({ password });
      return toResult(error);
    } catch {
      return NOT_CONFIGURED;
    }
  }
}
