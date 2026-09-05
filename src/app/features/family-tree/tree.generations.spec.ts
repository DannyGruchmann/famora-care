import { assignGenerations, buildGraph, groupByGeneration } from './tree.generations';
import type { TreePerson, TreeRelation } from './tree.types';

function people(...names: string[]): TreePerson[] {
  return names.map((name) => ({
    id: name,
    treeId: 'tree-1',
    name,
    birthYear: null,
    deceased: false,
    deathYear: null,
  }));
}

function parentOf(parent: string, child: string): TreeRelation {
  return {
    id: `${parent}>${child}`,
    treeId: 'tree-1',
    kind: 'parent',
    personA: parent,
    personB: child,
  };
}

function partners(first: string, second: string): TreeRelation {
  return {
    id: `${first}=${second}`,
    treeId: 'tree-1',
    kind: 'partner',
    personA: first,
    personB: second,
  };
}

describe('buildGraph', () => {
  it('reads a parent edge from both ends', () => {
    const graph = buildGraph([parentOf('anna', 'carl')]);

    expect(graph.childrenOf.get('anna')).toEqual(['carl']);
    expect(graph.parentsOf.get('carl')).toEqual(['anna']);
  });

  it('reads a partner edge as pointing both ways, because it does', () => {
    const graph = buildGraph([partners('anna', 'bernd')]);

    expect(graph.partnersOf.get('anna')).toEqual(['bernd']);
    expect(graph.partnersOf.get('bernd')).toEqual(['anna']);
  });
});

describe('assignGenerations', () => {
  it('puts a parent one row above and a child one row below the focus', () => {
    const relations = [parentOf('anna', 'carl'), parentOf('carl', 'dora')];
    const generations = assignGenerations(people('anna', 'carl', 'dora'), relations, 'carl');

    expect(generations.get('anna')).toBe(0);
    expect(generations.get('carl')).toBe(1);
    expect(generations.get('dora')).toBe(2);
  });

  it('keeps a partner in the same row', () => {
    const generations = assignGenerations(
      people('anna', 'bernd'),
      [partners('anna', 'bernd')],
      'anna',
    );

    expect(generations.get('bernd')).toBe(generations.get('anna'));
  });

  it('gives somebody nobody linked up a row of their own rather than dropping them', () => {
    const generations = assignGenerations(
      people('anna', 'carl', 'lone'),
      [parentOf('anna', 'carl')],
      'anna',
    );

    expect(generations.has('lone')).toBe(true);
  });

  it('comes to a stop when the data says somebody is their own ancestor', () => {
    const cycle = [parentOf('anna', 'bernd'), parentOf('bernd', 'anna')];

    const generations = assignGenerations(people('anna', 'bernd'), cycle, 'anna');

    expect(generations.size).toBe(2);
  });

  it('starts the topmost row at zero, whichever person the walk began from', () => {
    const relations = [parentOf('anna', 'carl'), parentOf('carl', 'dora')];
    const generations = assignGenerations(people('anna', 'carl', 'dora'), relations, 'dora');

    expect(Math.min(...generations.values())).toBe(0);
  });
});

describe('groupByGeneration', () => {
  it('turns six generations into six rows', () => {
    const names = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
    const chain = names.slice(1).map((name, index) => parentOf(names[index], name));
    const persons = people(...names);

    const rows = groupByGeneration(persons, assignGenerations(persons, chain, 'g1'));

    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.length === 1)).toBe(true);
  });

  it('puts everyone of one generation into the same row', () => {
    const relations = [parentOf('anna', 'carl'), parentOf('anna', 'dora')];
    const persons = people('anna', 'carl', 'dora');

    const rows = groupByGeneration(persons, assignGenerations(persons, relations, 'anna'));

    expect(rows[1].map((person) => person.id)).toEqual(['carl', 'dora']);
  });
});
