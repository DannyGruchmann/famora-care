const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today's date as YYYY-MM-DD — the format <input type="date"> works with. */
export function todayIso(): string {
  const today = new Date();

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

/**
 * Days elapsed since the date, negative for a date in the future. null on invalid input —
 * stored values are not trustworthy.
 */
export function daysSince(isoDate: string): number | null {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const [year, month, day] = parts;
  const then = new Date(year, month - 1, day);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Rounded, not floored: daylight saving changes make a day 23 or 25 hours long.
  return Math.round((startOfToday.getTime() - then.getTime()) / MS_PER_DAY);
}

/**
 * German long date, as in "22. August 2026". Intl is used rather than Angular's DatePipe: the
 * pipe ships only en-US and would need registerLocaleData for anything else.
 */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
