import { MODE_AFTER_DEATH, MODE_PREPARE } from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import { buildFamilyTree, familyCentreName, type TreeRow } from './family.tree';
import type { Helper, Relation } from './family.types';

const CENTRE = 'Maria';

function personWith(overrides: Partial<Helper> = {}): Helper {
  return { id: 'p-1', name: 'Anna', relation: 'other', deceased: false, ...overrides };
}

/** People in the order the tree draws them, centre row included. */
function rowIds(people: Helper[]): string[] {
  return buildFamilyTree(people, CENTRE).rows.map((row) => row.id);
}

function rowById(people: Helper[], id: string): TreeRow {
  const row = buildFamilyTree(people, CENTRE).rows.find((entry) => entry.id === id);
  if (row === undefined) throw new Error(`row ${id} was not built`);

  return row;
}

function peopleOfEachRelation(): Helper[] {
  const relations: Relation[] = ['grandchild', 'other', 'child', 'partner', 'sibling', 'parent'];

  return relations.map((relation, index) =>
    personWith({ id: `p-${index}`, name: relation, relation }),
  );
}

describe('buildFamilyTree', () => {
  it('stands the centre alone while nobody else is entered', () => {
    const tree = buildFamilyTree([], CENTRE);

    expect(tree.isEmpty).toBe(true);
    expect(tree.rows).toHaveLength(1);
    expect(tree.rows[0].people).toEqual([
      { id: 'centre', name: CENTRE, roleLabel: '', isCentre: true, deceased: false },
    ]);
  });

  it('orders the generations from the oldest down, whatever order they were entered in', () => {
    expect(rowIds(peopleOfEachRelation())).toEqual([
      'parent',
      'sibling',
      'centre',
      'child',
      'grandchild',
      'other',
    ]);
  });

  it('builds no row for a generation nobody is in', () => {
    const ids = rowIds([personWith({ relation: 'child' })]);

    expect(ids).toEqual(['centre', 'child']);
  });

  it('seats the partners beside the centre and labels them there', () => {
    const row = rowById([personWith({ name: 'Josef', relation: 'partner' })], 'centre');

    expect(row.people.map((person) => person.name)).toEqual([CENTRE, 'Josef']);
    expect(row.people[1].roleLabel).toBe('Partnerin oder Partner');
    expect(row.people[1].isCentre).toBe(false);
  });

  it('leaves the role off cards whose row heading already says it', () => {
    const row = rowById([personWith({ relation: 'child' })], 'child');

    expect(row.label).toBe('Kinder');
    expect(row.people[0].roleLabel).toBe('');
  });

  it('places everyone who is not a relative outside the tree', () => {
    const row = rowById([personWith({ relation: 'other' })], 'other');

    expect(row.isOutsideTree).toBe(true);
    expect(rowById([personWith({ relation: 'child' })], 'child').isOutsideTree).toBe(false);
  });

  it('keeps a deceased relative in the tree and marks them', () => {
    const row = rowById([personWith({ relation: 'parent', deceased: true })], 'parent');

    expect(row.people[0].deceased).toBe(true);
  });

  /** The folder already says who died — repeating it under their name helps nobody. */
  it('never marks the centre as deceased', () => {
    const row = rowById([], 'centre');

    expect(row.people[0].deceased).toBe(false);
  });
});

describe('familyCentreName', () => {
  function answersFor(mode: string): OnboardingAnswers {
    return { mode: [mode], 'person-name': ['Maria'] };
  }

  it('uses the name of the person who died on the after-death path', () => {
    expect(familyCentreName(answersFor(MODE_AFTER_DEATH), 'Danny')).toBe('Maria');
  });

  it('uses the signed-in first name on the precaution path', () => {
    expect(familyCentreName(answersFor(MODE_PREPARE), 'Danny')).toBe('Danny');
  });

  it('falls back to a description when the name was skipped', () => {
    expect(familyCentreName({ mode: [MODE_AFTER_DEATH] }, '')).toBe('Die verstorbene Person');
    expect(familyCentreName({ mode: [MODE_PREPARE] }, '   ')).toBe('Ich');
  });
});
