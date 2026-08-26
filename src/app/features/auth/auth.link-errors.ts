/**
 * GoTrue reports a refused link — expired, already used, cancelled — in the address fragment
 * instead of in a response. Whoever clicks an old reset link is sent to the Site URL, which is
 * the sign-in page: without reading the fragment they face a normal form and no explanation.
 */

/** The specific reason. GoTrue sends it next to the coarser `error`. */
const ERROR_CODE_PARAM = 'error_code';

/** The category, present even when GoTrue names no specific reason. */
const ERROR_PARAM = 'error';

const MESSAGES: Record<string, string> = {
  otp_expired:
    'Dieser Link ist abgelaufen oder wurde bereits geöffnet. Bitte fordern Sie einen neuen an.',
  access_denied: 'Dieser Link ist nicht mehr gültig. Bitte fordern Sie einen neuen an.',
};

const UNKNOWN_REASON =
  'Dieser Link konnte nicht geöffnet werden. Bitte fordern Sie einen neuen an.';

/**
 * Reads the failure out of an address fragment, or undefined when the visitor did not arrive
 * through a refused link. Has to run before the Supabase client starts, because clearing the
 * fragment is part of that startup.
 */
export function readLinkError(hash: string): string | undefined {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const reason = params.get(ERROR_CODE_PARAM) ?? params.get(ERROR_PARAM);

  return reason === null ? undefined : (MESSAGES[reason] ?? UNKNOWN_REASON);
}
