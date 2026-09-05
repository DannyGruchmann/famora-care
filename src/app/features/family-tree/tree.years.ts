import type { PersonDraft } from './tree.types';

/**
 * Years, and what the form refuses to send.
 *
 * The database enforces a range too (family-tree.sql §2), but only a fixed one: a check constraint
 * may call nothing but immutable functions, so it cannot know what year it is. "Not in the future"
 * is therefore a rule the form has to keep, and this is where it lives.
 */

const EARLIEST_YEAR = 1000;

/** null for an empty field and for anything that is not a plain number. */
export function parseYear(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d{1,4}$/.test(trimmed)) return null;

  return Number(trimmed);
}

export function yearToInput(year: number | null): string {
  return year === null ? '' : String(year);
}

/**
 * What is wrong with the years, in one sentence, or undefined when nothing is. One message rather
 * than one per field: the two years are read together, and so is what is wrong with them.
 */
export function checkYears(draft: PersonDraft, thisYear: number): string | undefined {
  return checkBirthYear(draft, thisYear) ?? checkDeathYear(draft, thisYear);
}

function checkBirthYear(draft: PersonDraft, thisYear: number): string | undefined {
  if (draft.birthYear === null) return undefined;
  if (draft.birthYear > thisYear) return 'Das Geburtsjahr liegt in der Zukunft.';
  if (draft.birthYear < EARLIEST_YEAR) return `Bitte ein Jahr ab ${EARLIEST_YEAR} eintragen.`;

  return undefined;
}

function checkDeathYear(draft: PersonDraft, thisYear: number): string | undefined {
  if (!draft.deceased || draft.deathYear === null) return undefined;
  if (draft.deathYear > thisYear) return 'Das Sterbejahr liegt in der Zukunft.';
  if (draft.deathYear < EARLIEST_YEAR) return `Bitte ein Jahr ab ${EARLIEST_YEAR} eintragen.`;
  if (draft.birthYear !== null && draft.deathYear < draft.birthYear) {
    return 'Das Sterbejahr liegt vor dem Geburtsjahr.';
  }

  return undefined;
}
