/**
 * Answers: question id -> list of chosen option ids (also for single choice, then with one entry).
 * Date questions store their ISO date as the single entry, so the storage format stays the same.
 */
export type OnboardingAnswers = Record<string, string[]>;

/** Which of the two paths the folder follows: an actual death, or planning ahead. */
export type OnboardingMode = 'after-death' | 'prepare';

export interface AnswerOption {
  id: string;
  label: string;
  hint?: string;
  /** On multiple choice: rules out every other option, e.g. "None of these". */
  exclusive?: boolean;
}

interface BaseQuestion {
  id: string;
  /** Small label above the question, e.g. "Ihre Situation". */
  eyebrow: string;
  title: string;
  hint?: string;
  /** Only show the question when this condition matches the answers so far. */
  showIf?: (answers: OnboardingAnswers) => boolean;
  /**
   * Allowed to continue without an answer. Only for details that steer nothing — a question whose
   * answer changes the task list must not be skippable.
   */
  optional?: boolean;
}

export interface ChoiceQuestion extends BaseQuestion {
  kind: 'choice';
  options: AnswerOption[];
  multiple?: boolean;
}

export interface DateQuestion extends BaseQuestion {
  kind: 'date';
  label: string;
}

/** For long lists such as the 16 federal states — as buttons that would be half a page of scrolling. */
export interface SelectQuestion extends BaseQuestion {
  kind: 'select';
  label: string;
  options: AnswerOption[];
}

/** Free text for what no list can capture — so far only the name. */
export interface TextQuestion extends BaseQuestion {
  kind: 'text';
  label: string;
  placeholder?: string;
}

export type Question = ChoiceQuestion | DateQuestion | SelectQuestion | TextQuestion;
