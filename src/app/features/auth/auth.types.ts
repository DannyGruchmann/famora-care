import type { User } from '@supabase/supabase-js';

/**
 * "loading" is not a detail but a state of its own: on reload the app does not know for a moment
 * whether anyone is signed in. Treating that moment as "signed out" throws signed-in users out on
 * every reload.
 */
export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

/** What the status settles on once the session is known. */
export type ResolvedAuthStatus = Exclude<AuthStatus, 'loading'>;

export interface AuthState {
  status: AuthStatus;
  user: User | null;
}

/**
 * A result instead of an exception: the caller should display the error, not have to catch it.
 * Everything coming back here is already worded for the user.
 */
export type AuthResult = { ok: true } | { ok: false; message: string };

/**
 * Separate from AuthResult: whether an account was created and whether it can sign in right away
 * are two different questions. With email confirmation switched on in the Supabase project, an
 * account exists but has no session yet — the caller needs to know that to show the right screen.
 */
export type SignUpResult =
  { ok: true; needsEmailConfirmation: boolean } | { ok: false; message: string };

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  captchaToken?: string;
}
