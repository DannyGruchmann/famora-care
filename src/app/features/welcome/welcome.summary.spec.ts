import type { EntryKind } from '@/app/features/entries/entry.types';
import type { Folder } from '@/app/features/folders/folder.types';
import {
  MODE_AFTER_DEATH,
  MODE_PREPARE,
  OPTION,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import { toFolderSummaries } from './welcome.summary';

const PREPARE_ANSWERS: OnboardingAnswers = {
  mode: [MODE_PREPARE],
  'prepare-focus': [OPTION.focusDocuments],
};

function folderWith(id: string, answers: OnboardingAnswers): Folder {
  return {
    id,
    answers,
    completedTaskIds: [],
    helpers: [],
    assignments: {},
    createdAt: '2026-08-01T00:00:00Z',
  };
}

function filledKinds(entries: [string, EntryKind[]][]): ReadonlyMap<string, EntryKind[]> {
  return new Map(entries);
}

describe('toFolderSummaries', () => {
  it('names the folder and its path', () => {
    const folders = [
      folderWith('folder-1', PREPARE_ANSWERS),
      folderWith('folder-2', { mode: [MODE_AFTER_DEATH], 'person-name': ['Thomas'] }),
    ];

    expect(toFolderSummaries(folders, filledKinds([]))).toMatchObject([
      { id: 'folder-1', label: 'Meine Vorsorge', mode: MODE_PREPARE },
      { id: 'folder-2', label: "Thomas' Ordner", mode: MODE_AFTER_DEATH },
    ]);
  });

  // A card leading to a page that sends you straight back is worse than no card at all.
  it('leaves out a folder whose answers never named a path', () => {
    const folders = [folderWith('folder-1', {}), folderWith('folder-2', PREPARE_ANSWERS)];

    expect(toFolderSummaries(folders, filledKinds([])).map((entry) => entry.id)).toEqual([
      'folder-2',
    ]);
  });

  it('counts a register entry towards its own folder and no other', () => {
    const folders = [
      folderWith('folder-1', PREPARE_ANSWERS),
      folderWith('folder-2', PREPARE_ANSWERS),
    ];
    const summaries = toFolderSummaries(folders, filledKinds([['folder-1', ['location']]]));

    expect(summaries[0].doneCount).toBe(1);
    expect(summaries[1].doneCount).toBe(0);
  });

  it('reports the same total for both, so only the progress differs', () => {
    const folders = [
      folderWith('folder-1', PREPARE_ANSWERS),
      folderWith('folder-2', PREPARE_ANSWERS),
    ];
    const summaries = toFolderSummaries(folders, filledKinds([['folder-1', ['location']]]));

    expect(summaries[0].totalCount).toBe(summaries[1].totalCount);
    expect(summaries[0].completionRate).toBeGreaterThan(summaries[1].completionRate);
  });
});
