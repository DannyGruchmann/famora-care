/**
 * Supabase only enforces 6 characters by default. 10 is the lower bound at which a password is
 * worth anything against guessing — the final check (length, known leaks) still has to happen
 * server side.
 */
export const MIN_PASSWORD_LENGTH = 10;
