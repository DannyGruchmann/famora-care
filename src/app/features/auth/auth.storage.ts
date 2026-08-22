/**
 * Remembers first name and email between the auth pages. Meant for the trip to the privacy policy
 * and back: without it the user returns to an empty form, and that is exactly where most
 * registrations are abandoned.
 *
 * sessionStorage rather than localStorage, so nothing outlives the tab. The password is
 * deliberately not stored.
 */
const KEY = 'famora.auth-draft';

export interface AuthDraft {
  firstName: string;
  email: string;
}

const EMPTY_DRAFT: AuthDraft = { firstName: '', email: '' };

function toDraft(parsed: unknown): AuthDraft {
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_DRAFT;

  const { firstName, email } = parsed as Partial<AuthDraft>;

  return {
    firstName: typeof firstName === 'string' ? firstName : '',
    email: typeof email === 'string' ? email : '',
  };
}

export function loadAuthDraft(): AuthDraft {
  // sessionStorage can throw — Safari in private mode, cookies disabled.
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return EMPTY_DRAFT;

    return toDraft(JSON.parse(raw));
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveAuthDraft(draft: AuthDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Without the draft the form is empty after a page change — annoying, but no reason to let
    // the input crash.
  }
}

/** After a successful sign-in: the draft has served its purpose. */
export function clearAuthDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Failing to clear is no reason to fail the registration.
  }
}
