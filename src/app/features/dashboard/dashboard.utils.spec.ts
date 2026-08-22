import { findFederalState } from '@/app/shared/federal-states.data';
import { getDeadlineLabel, getStateHint, matchesRequirements } from './dashboard.utils';

/** Never asserted against a literal number: the point is that hint and deadline share one source. */
function stateOrFail(id: string) {
  const state = findFederalState(id);
  if (state === null) throw new Error(`unknown federal state ${id}`);

  return state;
}

describe('matchesRequirements', () => {
  it('shows an entry without requirements to everyone', () => {
    expect(matchesRequirements(undefined, [])).toBe(true);
  });

  it('demands every requirement, not just one of them', () => {
    expect(matchesRequirements(['rental', 'property'], ['rental'])).toBe(false);
    expect(matchesRequirements(['rental', 'property'], ['rental', 'property'])).toBe(true);
  });
});

describe('getStateHint', () => {
  it('takes the number of days from the data instead of repeating it in prose', () => {
    const thuringia = stateOrFail('th');

    expect(getStateHint(thuringia)).toContain(`${thuringia.burialWithinDays} Tage`);
    expect(getStateHint(thuringia)).toContain(thuringia.law);
  });

  it('adds the urn deadline and the note only where the state has them', () => {
    const bavaria = stateOrFail('by');
    const hint = getStateHint(bavaria);

    expect(bavaria.urnDeadline).toBeUndefined();
    expect(hint).not.toContain('Urnenbeisetzung');
    expect(hint).toContain(bavaria.note ?? '');
  });
});

describe('getDeadlineLabel', () => {
  it('names the day rather than counting it', () => {
    expect(getDeadlineLabel(0)).toBe('heute fällig');
    expect(getDeadlineLabel(1)).toBe('morgen fällig');
  });

  it('counts forward from two days on', () => {
    expect(getDeadlineLabel(2)).toBe('noch 2 Tage');
  });

  it('reports an overdue task in positive days', () => {
    expect(getDeadlineLabel(-1)).toBe('1 Tag überfällig');
    expect(getDeadlineLabel(-5)).toBe('5 Tage überfällig');
  });
});
