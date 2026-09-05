import {
  orderPartners,
  toPersonDraft,
  toRelationEdge,
  toRelationKind,
  toTreeRole,
  type TreePerson,
} from './tree.types';

function person(overrides: Partial<TreePerson> = {}): TreePerson {
  return {
    id: 'person-1',
    treeId: 'tree-1',
    name: 'Anna Berger',
    birthYear: 1951,
    deceased: false,
    deathYear: null,
    ...overrides,
  };
}

describe('toRelationEdge', () => {
  it('puts the new person on the parent end when a parent is added', () => {
    expect(toRelationEdge('parent', 'anna', 'mother')).toEqual({
      kind: 'parent',
      personA: 'mother',
      personB: 'anna',
    });
  });

  it('turns "add a child" into the same edge pointing the other way', () => {
    expect(toRelationEdge('child', 'anna', 'son')).toEqual({
      kind: 'parent',
      personA: 'anna',
      personB: 'son',
    });
  });

  it('orders a partner edge by id, whichever of the two the action started from', () => {
    const fromAnna = toRelationEdge('partner', 'anna', 'bernd');
    const fromBernd = toRelationEdge('partner', 'bernd', 'anna');

    expect(fromAnna).toEqual({ kind: 'partner', personA: 'anna', personB: 'bernd' });
    expect(fromBernd).toEqual(fromAnna);
  });
});

describe('orderPartners', () => {
  it('gives a couple exactly one possible row, which is what the unique key needs', () => {
    expect(orderPartners('b', 'a')).toEqual({ personA: 'a', personB: 'b' });
    expect(orderPartners('a', 'b')).toEqual({ personA: 'a', personB: 'b' });
  });
});

describe('toTreeRole and toRelationKind', () => {
  it('accepts what the database stores', () => {
    expect(toTreeRole('owner')).toBe('owner');
    expect(toRelationKind('partner')).toBe('partner');
  });

  it('answers null for a value from a later version instead of guessing', () => {
    expect(toTreeRole('administrator')).toBeNull();
    expect(toRelationKind('adopted')).toBeNull();
  });
});

describe('toPersonDraft', () => {
  it('carries the four editable fields and nothing else', () => {
    expect(toPersonDraft(person({ deceased: true, deathYear: 2019 }))).toEqual({
      name: 'Anna Berger',
      birthYear: 1951,
      deceased: true,
      deathYear: 2019,
    });
  });
});
