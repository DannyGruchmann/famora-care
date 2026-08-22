import { findEntryKind } from '@/app/features/entries/entry.kinds';
import type { EntryKind } from '@/app/features/entries/entry.types';
import {
  getCompletedOptionIds,
  getDeathDate,
  getMode,
  getRequirementIds,
  getStateId,
} from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import { daysSince } from '@/app/shared/date.utils';
import { findFederalState, type FederalState } from '@/app/shared/federal-states.data';
import { PRESETS } from './dashboard.data';
import { getStateHint, matchesRequirements } from './dashboard.utils';
import type { DeadlineTask, Task, TaskDefinition } from './dashboard.types';

/** Everything a catalogue task needs to know about one folder to become a real task. */
export interface FolderTaskInput {
  answers: OnboardingAnswers;
  /** Already resolved — see resolveCompletedIds() for what a never-saved folder starts with. */
  completedTaskIds: string[];
  assignments: Record<string, string>;
  /** Register sections that already hold an entry. */
  filledKinds: readonly EntryKind[];
}

/** How far one folder has come. The same numbers on the overview and inside the folder. */
export interface TaskSummary {
  doneCount: number;
  totalCount: number;
  /** Completion in percent, 0 to 100. */
  completionRate: number;
  nextDeadline: DeadlineTask | null;
}

interface TaskContext {
  state: FederalState | null;
  daysElapsed: number | null;
  completedIds: string[];
  assignments: Record<string, string>;
  filledKinds: readonly EntryKind[];
}

/** Burial law is state law: those tasks get their deadline from the chosen state, not the catalogue. */
function resolveDueInDays(
  definition: TaskDefinition,
  state: FederalState | null,
): number | undefined {
  if (definition.usesStateDeadline !== true) return definition.dueInDays;

  return state?.burialWithinDays;
}

/** The state law is spelled out behind the description, so number and prose cannot drift apart. */
function resolveDetail(definition: TaskDefinition, state: FederalState | null): string {
  if (definition.usesStateDeadline !== true || state === null) return definition.detail;

  return `${definition.detail} ${getStateHint(state)}`;
}

/** Says where the tick comes from, so an inert checkbox does not look broken. */
function entryHint(kind: EntryKind): string {
  return `Das hakt sich ab, sobald unter „${findEntryKind(kind).label}“ ein Eintrag steht.`;
}

function describeTask(definition: TaskDefinition, state: FederalState | null): string {
  const kind = definition.completedByEntries;
  if (kind === undefined) return resolveDetail(definition, state);

  return `${definition.detail} ${entryHint(kind)}`;
}

function isDone(definition: TaskDefinition, context: TaskContext): boolean {
  const kind = definition.completedByEntries;
  if (kind !== undefined) return context.filledKinds.includes(kind);

  return context.completedIds.includes(definition.id);
}

/** Adds everything to a catalogue task that only follows from the user's answers. */
function toTask(definition: TaskDefinition, context: TaskContext): Task {
  const { state, daysElapsed, assignments } = context;
  const dueInDays = resolveDueInDays(definition, state);

  return {
    ...definition,
    dueInDays,
    detail: describeTask(definition, state),
    done: isDone(definition, context),
    daysLeft: dueInDays === undefined || daysElapsed === null ? null : dueInDays - daysElapsed,
    assignedTo: assignments[definition.id] ?? null,
    isAutomatic: definition.completedByEntries !== undefined,
  };
}

function toTaskContext(input: FolderTaskInput): TaskContext {
  const deathDate = getDeathDate(input.answers);

  return {
    state: findFederalState(getStateId(input.answers)),
    daysElapsed: deathDate === null ? null : daysSince(deathDate),
    completedIds: input.completedTaskIds,
    assignments: input.assignments,
    filledKinds: input.filledKinds,
  };
}

/**
 * What a folder that was never saved starts with: the tasks the onboarding already reported as
 * done. null and an empty list mean different things — see the column comment in schema.sql.
 */
export function resolveCompletedIds(answers: OnboardingAnswers, stored: string[] | null): string[] {
  if (stored !== null) return stored;

  const mode = getMode(answers);
  if (mode === null) return [];

  const chosen = new Set(getCompletedOptionIds(answers));

  return PRESETS[mode].tasks
    .filter((task) => task.completedBy !== undefined && chosen.has(task.completedBy))
    .map((task) => task.id);
}

/**
 * The checklist of one folder. Pure on purpose: the dashboard reads it through its store, the
 * overview reads it for every folder at once, and both have to arrive at the same numbers.
 *
 * Answers that never named a path yield no tasks — for the screen that folder does not exist.
 */
export function buildFolderTasks(input: FolderTaskInput): Task[] {
  const mode = getMode(input.answers);
  if (mode === null) return [];

  const context = toTaskContext(input);
  const chosenIds = getRequirementIds(input.answers);

  return PRESETS[mode].tasks
    .filter((definition) => matchesRequirements(definition.requires, chosenIds))
    .map((definition) => toTask(definition, context));
}

/** The most pressing open deadline — a finished task is no longer pressing. */
function findNextDeadline(tasks: Task[]): DeadlineTask | null {
  const open = tasks.filter((task): task is DeadlineTask => !task.done && task.daysLeft !== null);

  return [...open].sort((a, b) => a.daysLeft - b.daysLeft)[0] ?? null;
}

export function summarizeTasks(tasks: Task[]): TaskSummary {
  const doneCount = tasks.filter((task) => task.done).length;

  return {
    doneCount,
    totalCount: tasks.length,
    completionRate: tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100),
    nextDeadline: findNextDeadline(tasks),
  };
}
