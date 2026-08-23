import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { MIN_PASSWORD_LENGTH } from './auth.constants';

/**
 * Deliberately coarse: something before the @, something after it, ending in a dot with at least
 * two characters. An RFC 5322 compliant pattern would be many times longer and would still not
 * catch a single additional typo.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The validators carry their own German message rather than a key the template has to translate.
 * Angular's built-in Validators only report which rule failed, and the wording here differs per
 * field ("Bitte Vornamen eintragen." vs. "Bitte E-Mail eintragen.").
 */
function failWith(message: string): ValidationErrors {
  return { message };
}

function valueOf(control: AbstractControl): string {
  return typeof control.value === 'string' ? control.value : '';
}

export function firstNameValidator(control: AbstractControl): ValidationErrors | null {
  return valueOf(control).trim().length === 0 ? failWith('Bitte Vornamen eintragen.') : null;
}

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const trimmed = valueOf(control).trim();

  if (trimmed.length === 0) return failWith('Bitte E-Mail eintragen.');
  if (!EMAIL_PATTERN.test(trimmed)) return failWith('Adresse unvollständig.');

  return null;
}

/**
 * Same symbol set Supabase accepts under Authentication -> Providers -> Email -> Password
 * Requirements — matching it here means a password valid in the browser is never rejected by the
 * server for a symbol this pattern missed.
 */
const SYMBOL_PATTERN = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

/**
 * Mirrors the "Lowercase, uppercase letters, digits and symbols" policy set in the Supabase
 * dashboard. Checking it here means a weak password is caught while typing, with a specific
 * reason — not after submit, as a generic server error the user has no way to act on.
 */
export function newPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value = valueOf(control);

  if (value.length === 0) return failWith('Bitte Passwort wählen.');
  if (value.length < MIN_PASSWORD_LENGTH) return failWith('Noch zu kurz.');
  if (!/[a-zäöüß]/.test(value)) return failWith('Braucht noch einen Kleinbuchstaben.');
  if (!/[A-ZÄÖÜ]/.test(value)) return failWith('Braucht noch einen Großbuchstaben.');
  if (!/\d/.test(value)) return failWith('Braucht noch eine Ziffer.');
  if (!SYMBOL_PATTERN.test(value)) return failWith('Braucht noch ein Sonderzeichen, z. B. !?-_.');

  return null;
}

/**
 * Signing in deliberately does not check the length: an older account may have a shorter
 * password, and "too short" would be an error message about a password that works.
 */
export function currentPasswordValidator(control: AbstractControl): ValidationErrors | null {
  return valueOf(control).length === 0 ? failWith('Bitte Passwort eingeben.') : null;
}

export function privacyConsentValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === true ? null : failWith('Bitte Datenschutzerklärung bestätigen.');
}

/**
 * The message a field should show. Before the first submit the form stays quiet — being told off
 * at the first character feels supervised rather than guided. Afterwards every field corrects
 * itself again as soon as it is right, which is why this keys off submission and not on `touched`.
 */
export function errorMessageOf(
  control: AbstractControl,
  wasSubmitted: boolean,
): string | undefined {
  if (!wasSubmitted) return undefined;

  const message: unknown = control.errors?.['message'];

  return typeof message === 'string' ? message : undefined;
}

/**
 * Jumps into the first field that still needs something. Without it, on a phone you have to hunt
 * for which field further up turned red. Order of entries = order on screen.
 */
export function focusFirstInvalidField(fields: [id: string, invalid: boolean][]): void {
  const firstInvalid = fields.find(([, invalid]) => invalid);
  if (firstInvalid === undefined) return;

  const element = document.getElementById(firstInvalid[0]);
  element?.focus();
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
