import {
  buildFolderTasks,
  resolveCompletedIds,
  summarizeTasks,
} from '@/app/features/dashboard/dashboard.progress';
import type { DeadlineTask } from '@/app/features/dashboard/dashboard.types';
import type { EntryKind } from '@/app/features/entries/entry.types';
import { folderLabel } from '@/app/features/folders/folder.label';
import type { Folder } from '@/app/features/folders/folder.types';
import { getMode } from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingMode } from '@/app/features/onboarding/onboarding.types';

/** One folder as the overview shows it: a card, not a whole dashboard. */
export interface FolderSummary {
  id: string;
  label: string;
  mode: OnboardingMode;
  doneCount: number;
  totalCount: number;
  /** Completion in percent, 0 to 100. */
  completionRate: number;
  nextDeadline: DeadlineTask | null;
}

function toSummary(folder: Folder, mode: OnboardingMode, filledKinds: EntryKind[]): FolderSummary {
  const tasks = buildFolderTasks({
    answers: folder.answers,
    completedTaskIds: resolveCompletedIds(folder.answers, folder.completedTaskIds),
    assignments: folder.assignments,
    filledKinds,
  });

  return { id: folder.id, label: folderLabel(folder.answers), mode, ...summarizeTasks(tasks) };
}

/**
 * Folders whose answers never named a path are left out: the dashboard treats those as missing
 * and sends you away again, and a card leading nowhere is worse than no card.
 */
export function toFolderSummaries(
  folders: Folder[],
  filledKinds: ReadonlyMap<string, EntryKind[]>,
): FolderSummary[] {
  return folders.flatMap((folder) => {
    const mode = getMode(folder.answers);
    if (mode === null) return [];

    return [toSummary(folder, mode, filledKinds.get(folder.id) ?? [])];
  });
}
