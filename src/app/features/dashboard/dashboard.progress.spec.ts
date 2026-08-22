import {
  MODE_AFTER_DEATH,
  MODE_PREPARE,
  OPTION,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import {
  buildFolderTasks,
  resolveCompletedIds,
  summarizeTasks,
  type FolderTaskInput,
} from './dashboard.progress';
import type { Task } from './dashboard.types';

const PREPARE_ANSWERS: OnboardingAnswers = {
  mode: [MODE_PREPARE],
  'prepare-focus': [OPTION.focusDocuments],
};

/** A precaution folder that chose the documents area, with nothing done and nothing written. */
function emptyInput(): FolderTaskInput {
  return {
    answers: PREPARE_ANSWERS,
    completedTaskIds: [],
    assignments: {},
    filledKinds: [],
  };
}

function taskWith(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    detail: '',
    urgency: 'now',
    done: false,
    daysLeft: null,
    assignedTo: null,
    isAutomatic: false,
    ...overrides,
  };
}

describe('resolveCompletedIds', () => {
  it('starts a never-saved folder with what the onboarding already reported as done', () => {
    const answers: OnboardingAnswers = {
      mode: [MODE_AFTER_DEATH],
      done: [OPTION.doneCertificate],
    };

    expect(resolveCompletedIds(answers, null)).toEqual(['d-certificate']);
  });

  // null and an empty list mean different things — otherwise unticking would not survive a reload.
  it('leaves a deliberately emptied list empty', () => {
    const answers: OnboardingAnswers = {
      mode: [MODE_AFTER_DEATH],
      done: [OPTION.doneCertificate],
    };

    expect(resolveCompletedIds(answers, [])).toEqual([]);
  });
});

describe('buildFolderTasks', () => {
  it('has nothing to show for answers that never named a path', () => {
    expect(buildFolderTasks({ ...emptyInput(), answers: {} })).toEqual([]);
  });

  it('ticks off a task as soon as its register section holds an entry', () => {
    const tasks = buildFolderTasks({ ...emptyInput(), filledKinds: ['location'] });
    const collecting = tasks.find((task) => task.id === 'p-documents-collect');

    expect(collecting?.done).toBe(true);
    expect(collecting?.isAutomatic).toBe(true);
  });

  it('leaves that task open while the section is empty', () => {
    const tasks = buildFolderTasks(emptyInput());

    expect(tasks.find((task) => task.id === 'p-documents-collect')?.done).toBe(false);
  });

  it('leaves out tasks the answers never asked for', () => {
    const tasks = buildFolderTasks(emptyInput());

    // Contracts were not among the chosen areas, so their tasks have no business here.
    expect(tasks.some((task) => task.id === 'p-contracts-list')).toBe(false);
  });
});

describe('summarizeTasks', () => {
  it('counts what is done and turns it into a percentage', () => {
    const summary = summarizeTasks([taskWith('a', { done: true }), taskWith('b'), taskWith('c')]);

    expect(summary).toMatchObject({ doneCount: 1, totalCount: 3, completionRate: 33 });
  });

  it('reports no deadline and no progress for an empty checklist', () => {
    expect(summarizeTasks([])).toEqual({
      doneCount: 0,
      totalCount: 0,
      completionRate: 0,
      nextDeadline: null,
    });
  });

  it('names the most pressing open deadline', () => {
    const summary = summarizeTasks([
      taskWith('later', { daysLeft: 10 }),
      taskWith('overdue', { daysLeft: -2 }),
    ]);

    expect(summary.nextDeadline?.id).toBe('overdue');
  });

  it('passes over a deadline that is already done', () => {
    const summary = summarizeTasks([
      taskWith('done', { daysLeft: -2, done: true }),
      taskWith('open', { daysLeft: 10 }),
    ]);

    expect(summary.nextDeadline?.id).toBe('open');
  });
});
