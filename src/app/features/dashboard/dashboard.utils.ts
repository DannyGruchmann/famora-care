import type { FederalState } from '@/app/shared/federal-states.data';

/**
 * Conditional entries only show once every required onboarding option was chosen. Tasks and
 * documents share this rule.
 */
export function matchesRequirements(requires: string[] | undefined, chosenIds: string[]): boolean {
  if (requires === undefined) return true;

  return requires.every((id) => chosenIds.includes(id));
}

/**
 * State law as prose. The number of days is built from the data rather than written next to it —
 * otherwise the deadline and its description drift apart eventually.
 */
export function getStateHint(state: FederalState): string {
  const parts = [
    `In ${state.label} spätestens ${state.burialWithinDays} Tage nach dem Tod (${state.law}).`,
  ];

  if (state.urnDeadline !== undefined) {
    parts.push(`Frist für die Urnenbeisetzung: ${state.urnDeadline}.`);
  }
  if (state.note !== undefined) {
    parts.push(state.note);
  }

  return parts.join(' ');
}

/** Deadline text for the progress card and the checklist — one place, so both show the same. */
export function getDeadlineLabel(daysLeft: number): string {
  if (daysLeft < -1) return `${Math.abs(daysLeft)} Tage überfällig`;
  if (daysLeft === -1) return '1 Tag überfällig';
  if (daysLeft === 0) return 'heute fällig';
  if (daysLeft === 1) return 'morgen fällig';

  return `noch ${daysLeft} Tage`;
}
