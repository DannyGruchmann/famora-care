import type { EntryKind } from '@/app/features/entries/entry.types';

export type Urgency = 'now' | 'week' | 'month' | 'later';

/** A task as the catalogue holds it — without any state. */
export interface TaskDefinition {
  id: string;
  title: string;
  /** One or two sentences: why the task matters and who is responsible. */
  detail: string;
  /**
   * Group within the checklist. Deliberately independent of `dueInDays`: some tasks are urgent
   * without a statutory deadline attached to them.
   */
  urgency: Urgency;
  /** Statutory deadline in days after the day of death. Not computable without a death date. */
  dueInDays?: number;
  /** The deadline is state law: the number of days then comes from the chosen federal state. */
  usesStateDeadline?: boolean;
  /** Counts as done on first open when this onboarding option was chosen. */
  completedBy?: string;
  /**
   * Ticks itself off as soon as the register section holds an entry. For tasks the register has
   * taken over — asking someone to write something down and then also tick a box is bookkeeping,
   * not help.
   */
  completedByEntries?: EntryKind;
  /** The task only appears once all of these onboarding options were chosen. */
  requires?: string[];
}

/** A task with derived state, the way the UI sees it. */
export interface Task extends TaskDefinition {
  done: boolean;
  /** Days until the deadline, negative when overdue. null without a deadline or a death date. */
  daysLeft: number | null;
  /** Id of the person taking this on. null when nobody is assigned. */
  assignedTo: string | null;
  /** The register decides this one, so the checkbox is shown but cannot be operated. */
  isAutomatic: boolean;
}

/** A person helping with the folder. No account, just a name inside the folder. */
export interface Helper {
  id: string;
  name: string;
}

export interface HelperWithLoad extends Helper {
  openTaskCount: number;
}

/** A document needed along the way. Purely informational, nothing to tick off. */
export interface RequiredDocument {
  id: string;
  title: string;
  /** Where to get it and what it is needed for. */
  detail: string;
  requires?: string[];
}

/** A task with a computable deadline — only those show up in the deadline hint. */
export type DeadlineTask = Task & { daysLeft: number };

/** Everything that differs between the after-death and the precaution path. */
export interface DashboardPreset {
  urgencyLabels: Record<Urgency, string>;
  tasks: TaskDefinition[];
  documents: RequiredDocument[];
  /** Intro of the documents section, meant differently on the precaution path. */
  documentsHint: string;
  familyHint: string;
}
