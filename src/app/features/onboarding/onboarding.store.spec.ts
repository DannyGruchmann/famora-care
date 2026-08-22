import { TestBed } from '@angular/core/testing';
import { MODE_AFTER_DEATH, MODE_PREPARE, OPTION } from './onboarding.questions';
import { OnboardingStore } from './onboarding.store';
import type { OnboardingMode } from './onboarding.types';

function storeFor(mode: OnboardingMode | null): OnboardingStore {
  TestBed.configureTestingModule({ providers: [OnboardingStore] });
  const store = TestBed.inject(OnboardingStore);
  store.initialise(mode);

  return store;
}

/** Walks to the question with the given id by answering nothing and stepping forward. */
function stepTo(store: OnboardingStore, questionId: string): void {
  for (let guard = 0; guard < 20; guard += 1) {
    if (store.currentQuestion()?.id === questionId) return;
    store.goNext();
  }

  throw new Error(`question ${questionId} never became current`);
}

describe('OnboardingStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts at the path question when no mode is preselected', () => {
    const store = storeFor(null);

    expect(store.stepIndex()).toBe(0);
    expect(store.currentQuestion()?.id).toBe('mode');
    // The total is unknown until the path decides which questions follow.
    expect(store.totalSteps()).toBeNull();
  });

  it('skips the path question when the landing page already chose one', () => {
    const store = storeFor(MODE_AFTER_DEATH);

    expect(store.stepIndex()).toBe(1);
    expect(store.answers()['mode']).toEqual([MODE_AFTER_DEATH]);
    expect(store.totalSteps()).not.toBeNull();
  });

  it('shows only the after-death questions on that path', () => {
    const visible = storeFor(MODE_AFTER_DEATH)
      .visibleQuestions()
      .map((question) => question.id);

    expect(visible).toContain('death-date');
    expect(visible).not.toContain('prepare-focus');
  });

  it('shows only the provision questions on that path', () => {
    const visible = storeFor(MODE_PREPARE)
      .visibleQuestions()
      .map((question) => question.id);

    expect(visible).toContain('prepare-focus');
    expect(visible).not.toContain('death-date');
  });

  it('going back from the preselected path reaches the path question again', () => {
    const store = storeFor(MODE_PREPARE);
    store.goBack();

    expect(store.currentQuestion()?.id).toBe('mode');
  });

  describe('mutually exclusive options', () => {
    it('locks the ordinary options once the exclusive one is chosen', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'done');

      store.selectOption(OPTION.doneNothing);

      expect(store.blockedIds().has(OPTION.doneCertificate)).toBe(true);
      expect(store.blockedIds().has(OPTION.doneNothing)).toBe(false);
    });

    it('locks the exclusive option once an ordinary one is chosen', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'done');

      store.selectOption(OPTION.doneCertificate);

      expect(store.blockedIds().has(OPTION.doneNothing)).toBe(true);
      expect(store.blockedIds().has(OPTION.doneFuneral)).toBe(false);
    });

    it('ignores a locked option even when it is triggered anyway', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'done');

      store.selectOption(OPTION.doneNothing);
      store.selectOption(OPTION.doneCertificate);

      expect(store.selectedIds()).toEqual([OPTION.doneNothing]);
    });

    it('collects several ordinary options on a multiple choice question', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'done');

      store.selectOption(OPTION.doneCertificate);
      store.selectOption(OPTION.doneFuneral);

      expect(store.selectedIds()).toEqual([OPTION.doneCertificate, OPTION.doneFuneral]);
    });

    it('deselects an already chosen option on a second click', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'done');

      store.selectOption(OPTION.doneCertificate);
      store.selectOption(OPTION.doneCertificate);

      expect(store.selectedIds()).toEqual([]);
    });
  });

  it('replaces the answer on a single choice question', () => {
    const store = storeFor(MODE_AFTER_DEATH);
    stepTo(store, 'relation');

    store.selectOption(OPTION.relPartner);
    store.selectOption(OPTION.relChild);

    expect(store.selectedIds()).toEqual([OPTION.relChild]);
  });

  describe('canContinue', () => {
    it('blocks a mandatory question until it is answered', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'relation');

      expect(store.canContinue()).toBe(false);
      store.selectOption(OPTION.relPartner);
      expect(store.canContinue()).toBe(true);
    });

    it('lets an optional question pass unanswered', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'person-name');

      expect(store.canContinue()).toBe(true);
    });
  });

  describe('setValue', () => {
    it('stores a value on a text question', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'person-name');

      store.setValue('Maria');

      expect(store.selectedIds()).toEqual(['Maria']);
    });

    it('treats whitespace only as no answer', () => {
      const store = storeFor(MODE_AFTER_DEATH);
      stepTo(store, 'person-name');

      store.setValue('   ');

      expect(store.selectedIds()).toEqual([]);
    });
  });

  it('never steps below the first question', () => {
    const store = storeFor(null);

    store.goBack();
    store.goBack();

    expect(store.stepIndex()).toBe(0);
  });
});
