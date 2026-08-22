import {
  getMode,
  getPersonName,
  MODE_PREPARE,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';

/**
 * Names ending in s, ß, x or z only take an apostrophe in the German genitive: "Thomas' Ordner",
 * not "Thomass Ordner". Affects enough first names not to ignore it.
 */
function possessive(name: string): string {
  return /[sßxz]$/i.test(name) ? `${name}'` : `${name}s`;
}

/** What a folder is called. Without a name it keeps the generic title. */
export function folderLabel(answers: OnboardingAnswers): string {
  if (getMode(answers) === MODE_PREPARE) return 'Meine Vorsorge';

  const name = getPersonName(answers);

  return name === null ? 'Ihr Ordner' : `${possessive(name)} Ordner`;
}
