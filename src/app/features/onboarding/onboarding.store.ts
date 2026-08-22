import { computed, Injectable, signal } from '@angular/core';
import { MODE_QUESTION_ID, QUESTIONS } from './onboarding.questions';
import type { OnboardingAnswers, OnboardingMode, Question } from './onboarding.types';

/**
 * On multiple choice, exclusive options ("Noch nichts davon") and ordinary ones rule each other
 * out. Returns the option ids currently locked.
 */
function getBlockedIds(question: Question | undefined, selected: string[]): Set<string> {
  if (question?.kind !== 'choice' || question.multiple !== true) return new Set();

  const exclusive = question.options.filter((option) => option.exclusive === true);
  if (exclusive.length === 0 || selected.length === 0) return new Set();

  const isExclusiveSelected = exclusive.some((option) => selected.includes(option.id));
  const blocked = isExclusiveSelected
    ? question.options.filter((option) => option.exclusive !== true)
    : exclusive;

  return new Set(blocked.map((option) => option.id));
}

function initialAnswers(mode: OnboardingMode | null): OnboardingAnswers {
  return mode === null ? {} : { [MODE_QUESTION_ID]: [mode] };
}

/**
 * State machine of the onboarding: which question is visible, what was answered, may we continue.
 * The components stay pure presentation as a result.
 *
 * Deliberately not providedIn: 'root' — the page provides it, so every visit starts fresh, the
 * same way the React hook reset on each mount.
 */
@Injectable()
export class OnboardingStore {
  private readonly answersState = signal<OnboardingAnswers>({});
  private readonly stepIndexState = signal(0);

  readonly answers = this.answersState.asReadonly();
  readonly stepIndex = this.stepIndexState.asReadonly();

  /** Every follow-up question hangs off the chosen path. Before that the total is unknown. */
  private readonly isPathChosen = computed(
    () => this.answersState()[MODE_QUESTION_ID] !== undefined,
  );

  readonly visibleQuestions = computed(() =>
    QUESTIONS.filter((question) => question.showIf?.(this.answersState()) !== false),
  );

  readonly currentQuestion = computed(
    (): Question | undefined => this.visibleQuestions()[this.stepIndexState()],
  );

  readonly selectedIds = computed(() => {
    const question = this.currentQuestion();

    return question === undefined ? [] : (this.answersState()[question.id] ?? []);
  });

  readonly canContinue = computed(
    () => this.selectedIds().length > 0 || this.currentQuestion()?.optional === true,
  );

  readonly isLastStep = computed(
    () => this.isPathChosen() && this.stepIndexState() === this.visibleQuestions().length - 1,
  );

  readonly blockedIds = computed(() => getBlockedIds(this.currentQuestion(), this.selectedIds()));

  /** null while the path is unchosen — the total number of steps is unknown then. */
  readonly totalSteps = computed(() =>
    this.isPathChosen() ? this.visibleQuestions().length : null,
  );

  /**
   * When the path already comes from the landing page we skip the first question rather than ask
   * it a second time. Going back still leads to it.
   */
  initialise(mode: OnboardingMode | null): void {
    this.answersState.set(initialAnswers(mode));
    this.stepIndexState.set(mode === null ? 0 : 1);
  }

  selectOption(optionId: string): void {
    const question = this.currentQuestion();
    if (question?.kind !== 'choice') return;

    if (question.multiple !== true) {
      this.writeAnswer(question.id, [optionId]);
      return;
    }

    this.toggleOption(question.id, optionId);
  }

  /** For date, select and free text: they all deliver a value and share this setter. */
  setValue(value: string): void {
    const question = this.currentQuestion();
    if (question === undefined || question.kind === 'choice') return;

    // An empty entry means "no answer" — otherwise an empty string would let you continue. For
    // free text, whitespace only counts as no answer too.
    this.writeAnswer(question.id, value.trim() === '' ? [] : [value]);
  }

  goNext(): void {
    this.stepIndexState.update((current) => current + 1);
  }

  goBack(): void {
    this.stepIndexState.update((current) => Math.max(0, current - 1));
  }

  private toggleOption(questionId: string, optionId: string): void {
    const previous = this.answersState()[questionId] ?? [];

    // Ignore a locked option in case it is triggered anyway, e.g. via the keyboard.
    if (getBlockedIds(this.currentQuestion(), previous).has(optionId)) return;

    const next = previous.includes(optionId)
      ? previous.filter((id) => id !== optionId)
      : [...previous, optionId];

    this.writeAnswer(questionId, next);
  }

  private writeAnswer(questionId: string, value: string[]): void {
    this.answersState.update((current) => ({ ...current, [questionId]: value }));
  }
}
