import type { Helper } from '@/app/features/dashboard/dashboard.types';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';

/** A folder as the app sees it — the table itself writes snake_case. */
export interface Folder {
  id: string;
  answers: OnboardingAnswers;
  /** null means "never saved" — see the column comment in schema.sql. */
  completedTaskIds: string[] | null;
  helpers: Helper[];
  assignments: Record<string, string>;
  createdAt: string;
}

export interface FolderProgress {
  /** null stays null: otherwise "never opened" would turn into "nothing done yet". */
  completedTaskIds: string[] | null;
  helpers: Helper[];
  assignments: Record<string, string>;
}
