import { TestBed } from '@angular/core/testing';
import { FoldersQueries } from '@/app/features/folders/folders.queries';
import type { Folder } from '@/app/features/folders/folder.types';
import {
  MODE_AFTER_DEATH,
  MODE_PREPARE,
  OPTION,
} from '@/app/features/onboarding/onboarding.questions';
import { findFederalState } from '@/app/shared/federal-states.data';
import { DashboardStore } from './dashboard.store';
import type { Task } from './dashboard.types';

const STATE_ID = 'th';
/** Deadline of the task that has none of its own — it reads the state's burial deadline. */
const BURIAL_TASK_ID = 'd-burial';
/** Notifying the life insurer: two days after the death, the shortest fixed deadline there is. */
const INSURANCE_TASK_ID = 'd-life-insurance';
/** Precaution task the register ticks off: it is the "Wo liegt was" section in task form. */
const DOCUMENTS_TASK_ID = 'p-documents-collect';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local date parts, the same way date.utils reads a stored date. */
function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function folderWith(overrides: Partial<Folder> = {}): Folder {
  return {
    id: 'folder-1',
    answers: {
      mode: [MODE_AFTER_DEATH],
      'death-date': [isoDaysAgo(2)],
      state: [STATE_ID],
    },
    completedTaskIds: [],
    helpers: [],
    assignments: {},
    createdAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function storeWithFolder(folder: Folder | null) {
  const loadFolder = vi.fn().mockResolvedValue({ ok: true, data: folder });
  const saveFolderProgress = vi.fn().mockResolvedValue({ ok: true, data: undefined });

  TestBed.configureTestingModule({
    providers: [
      DashboardStore,
      { provide: FoldersQueries, useValue: { loadFolder, saveFolderProgress } },
    ],
  });

  return { store: TestBed.inject(DashboardStore), loadFolder, saveFolderProgress };
}

async function openFolder(store: DashboardStore): Promise<void> {
  store.setFolderId('folder-1');
  TestBed.tick();

  await vi.waitFor(() => {
    if (store.status() === 'loading') throw new Error('folder is still loading');
  });
}

function taskById(store: DashboardStore, id: string): Task {
  const task = store.tasks().find((entry) => entry.id === id);
  if (task === undefined) throw new Error(`task ${id} is not in the list`);

  return task;
}

describe('DashboardStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('takes the burial deadline from the chosen federal state', async () => {
    const { store } = storeWithFolder(folderWith());
    await openFolder(store);

    const state = findFederalState(STATE_ID);
    const burial = taskById(store, BURIAL_TASK_ID);

    expect(burial.dueInDays).toBe(state?.burialWithinDays);
    // Two days have already passed since the death.
    expect(burial.daysLeft).toBe((state?.burialWithinDays ?? 0) - 2);
    expect(burial.detail).toContain(state?.law ?? '');
  });

  it('leaves every deadline unknown when no date of death was given', async () => {
    const answers = { mode: [MODE_AFTER_DEATH], state: [STATE_ID] };
    const { store } = storeWithFolder(folderWith({ answers }));
    await openFolder(store);

    expect(taskById(store, INSURANCE_TASK_ID).daysLeft).toBeNull();
    expect(store.nextDeadline()).toBeNull();
  });

  it('reports a passed deadline as overdue rather than as remaining days', async () => {
    const { store } = storeWithFolder(folderWith({ answers: overdueAnswers() }));
    await openFolder(store);

    expect(taskById(store, INSURANCE_TASK_ID).daysLeft).toBe(-3);
  });

  it('picks the most pressing open deadline and drops it once it is done', async () => {
    const { store } = storeWithFolder(folderWith());
    await openFolder(store);

    expect(store.nextDeadline()?.id).toBe(INSURANCE_TASK_ID);

    store.toggleTask(INSURANCE_TASK_ID);

    expect(store.nextDeadline()?.id).not.toBe(INSURANCE_TASK_ID);
  });

  it('seeds the done tasks from the onboarding only for a folder never opened before', async () => {
    const answers = { ...folderWith().answers, done: [OPTION.doneCertificate] };
    const { store } = storeWithFolder(folderWith({ answers, completedTaskIds: null }));
    await openFolder(store);

    expect(taskById(store, 'd-certificate').done).toBe(true);
  });

  it('keeps an empty stored list empty instead of seeding it again', async () => {
    const answers = { ...folderWith().answers, done: [OPTION.doneCertificate] };
    const { store } = storeWithFolder(folderWith({ answers, completedTaskIds: [] }));
    await openFolder(store);

    expect(taskById(store, 'd-certificate').done).toBe(false);
  });

  it('hides a conditional task until the matching onboarding option is chosen', async () => {
    const { store } = storeWithFolder(folderWith());
    await openFolder(store);

    expect(store.tasks().some((task) => task.id === 'd-weapons')).toBe(false);

    const answers = { ...folderWith().answers, circumstances: [OPTION.hasWeapons] };
    TestBed.resetTestingModule();
    const withWeapons = storeWithFolder(folderWith({ answers }));
    await openFolder(withWeapons.store);

    expect(withWeapons.store.tasks().some((task) => task.id === 'd-weapons')).toBe(true);
  });

  it('drops the assignments of a removed helper', async () => {
    const helpers = [{ id: 'helper-1', name: 'Anna' }];
    const assignments = { [INSURANCE_TASK_ID]: 'helper-1' };
    const { store } = storeWithFolder(folderWith({ helpers, assignments }));
    await openFolder(store);

    expect(taskById(store, INSURANCE_TASK_ID).assignedTo).toBe('helper-1');

    store.removeHelper('helper-1');

    expect(store.helpers()).toEqual([]);
    expect(taskById(store, INSURANCE_TASK_ID).assignedTo).toBeNull();
  });

  /**
   * The reason editing exists at all: correcting a name must not cost the person their tasks, and
   * deleting them to enter them again would do exactly that.
   */
  it('renames a person without losing the task assigned to them', async () => {
    const helpers = [{ id: 'helper-1', name: 'Anna' }];
    const assignments = { [INSURANCE_TASK_ID]: 'helper-1' };
    const { store } = storeWithFolder(folderWith({ helpers, assignments }));
    await openFolder(store);

    store.renameHelper('helper-1', '  Anna Weber  ');

    expect(store.helpers()[0].name).toBe('Anna Weber');
    expect(taskById(store, INSURANCE_TASK_ID).assignedTo).toBe('helper-1');
  });

  it('ignores a rename that would leave a person without a name', async () => {
    const { store } = storeWithFolder(folderWith({ helpers: [{ id: 'helper-1', name: 'Anna' }] }));
    await openFolder(store);

    store.renameHelper('helper-1', '   ');

    expect(store.helpers()[0].name).toBe('Anna');
  });

  it('leaves everybody alone when the renamed id belongs to no one', async () => {
    const { store } = storeWithFolder(folderWith({ helpers: [{ id: 'helper-1', name: 'Anna' }] }));
    await openFolder(store);

    store.renameHelper('helper-2', 'Bernd');

    expect(store.helpers()).toEqual([expect.objectContaining({ name: 'Anna' })]);
  });

  it('counts only the open tasks against a helper', async () => {
    const helpers = [{ id: 'helper-1', name: 'Anna' }];
    const assignments = { [INSURANCE_TASK_ID]: 'helper-1' };
    const { store } = storeWithFolder(folderWith({ helpers, assignments }));
    await openFolder(store);

    expect(store.helpers()[0].openTaskCount).toBe(1);

    store.toggleTask(INSURANCE_TASK_ID);

    expect(store.helpers()[0].openTaskCount).toBe(0);
  });

  it('does not write back what it just read', async () => {
    const { store, saveFolderProgress } = storeWithFolder(folderWith());
    await openFolder(store);
    TestBed.tick();

    expect(saveFolderProgress).not.toHaveBeenCalled();
  });

  it('saves after a change by the user', async () => {
    const { store, saveFolderProgress } = storeWithFolder(folderWith());
    await openFolder(store);

    store.toggleTask(INSURANCE_TASK_ID);
    TestBed.tick();

    expect(saveFolderProgress).toHaveBeenCalledWith(
      'folder-1',
      expect.objectContaining({ completedTaskIds: [INSURANCE_TASK_ID] }),
    );
  });

  it('leaves a task the register owns open while its section is empty', async () => {
    const { store } = storeWithFolder(folderWith({ answers: prepareAnswers() }));
    await openFolder(store);

    const task = taskById(store, DOCUMENTS_TASK_ID);

    expect(task.done).toBe(false);
    expect(task.isAutomatic).toBe(true);
    // Says where the tick comes from, so an inert checkbox does not look broken.
    expect(task.detail).toContain('Wo liegt was');
  });

  it('ticks that task off as soon as the register section holds something', async () => {
    const { store } = storeWithFolder(folderWith({ answers: prepareAnswers() }));
    await openFolder(store);

    store.setFilledEntryKinds(['location']);

    expect(taskById(store, DOCUMENTS_TASK_ID).done).toBe(true);
    // A different section must not tick this one off.
    store.setFilledEntryKinds(['wish']);
    expect(taskById(store, DOCUMENTS_TASK_ID).done).toBe(false);
  });

  it('ignores a click on a task the register owns', async () => {
    const { store, saveFolderProgress } = storeWithFolder(
      folderWith({ answers: prepareAnswers() }),
    );
    await openFolder(store);

    store.toggleTask(DOCUMENTS_TASK_ID);
    TestBed.tick();

    expect(taskById(store, DOCUMENTS_TASK_ID).done).toBe(false);
    expect(saveFolderProgress).not.toHaveBeenCalled();
  });

  it('treats an unknown folder as missing rather than as an error', async () => {
    const { store } = storeWithFolder(null);
    await openFolder(store);

    expect(store.status()).toBe('missing');
  });
});

/** A precaution folder that shows the tasks the register has taken over. */
function prepareAnswers() {
  return { mode: [MODE_PREPARE], 'prepare-focus': [OPTION.focusDocuments] };
}

/** The life insurance is due after two days; five days ago puts it three days past due. */
function overdueAnswers() {
  return { mode: [MODE_AFTER_DEATH], 'death-date': [isoDaysAgo(5)], state: [STATE_ID] };
}
