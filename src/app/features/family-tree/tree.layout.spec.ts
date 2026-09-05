import { CARD_HEIGHT, CARD_WIDTH } from './tree.geometry';
import { layoutTree, type TreeLayout } from './tree.layout';
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

function middleOf(layout: TreeLayout, id: string): number {
  const node = layout.nodes.find((entry) => entry.person.id === id);
  if (node === undefined) throw new Error(`${id} was not placed`);

  return node.x + CARD_WIDTH / 2;
}

function rowOf(layout: TreeLayout, id: string): number {
  const node = layout.nodes.find((entry) => entry.person.id === id);
  if (node === undefined) throw new Error(`${id} was not placed`);

  return node.generation;
}

/** Two cards overlap when their horizontal ranges do, and they sit in the same row. */
function overlaps(layout: TreeLayout, first: string, second: string): boolean {
  const a = layout.nodes.find((node) => node.person.id === first);
  const b = layout.nodes.find((node) => node.person.id === second);
  if (a === undefined || b === undefined) return false;

  return a.y === b.y && a.x < b.x + CARD_WIDTH && b.x < a.x + CARD_WIDTH;
}

describe('layoutTree placement', () => {
  it('sits a child exactly between its two parents', () => {
    const persons = people('anna', 'bernd', 'carl');
    const relations = [
      partners('anna', 'bernd'),
      parentOf('anna', 'carl'),
      parentOf('bernd', 'carl'),
    ];

    const layout = layoutTree(persons, relations, 'carl');

    const between = (middleOf(layout, 'anna') + middleOf(layout, 'bernd')) / 2;
    expect(middleOf(layout, 'carl')).toBeCloseTo(between, 5);
  });

  it('centres a whole set of siblings under their parents, not just the first one', () => {
    const persons = people('anna', 'bernd', 'carl', 'dora', 'emil');
    const relations = [
      partners('anna', 'bernd'),
      ...['carl', 'dora', 'emil'].flatMap((child) => [
        parentOf('anna', child),
        parentOf('bernd', child),
      ]),
    ];

    const layout = layoutTree(persons, relations, 'anna');

    const parents = (middleOf(layout, 'anna') + middleOf(layout, 'bernd')) / 2;
    const children = (middleOf(layout, 'carl') + middleOf(layout, 'emil')) / 2;
    expect(children).toBeCloseTo(parents, 5);
  });

  it('keeps half-siblings in one row without letting their cards touch', () => {
    const persons = people('xaver', 'yvonne', 'zoe', 'carl', 'emil');
    const relations = [
      partners('xaver', 'yvonne'),
      partners('yvonne', 'zoe'),
      parentOf('xaver', 'carl'),
      parentOf('yvonne', 'carl'),
      parentOf('yvonne', 'emil'),
      parentOf('zoe', 'emil'),
    ];

    const layout = layoutTree(persons, relations, 'carl');

    expect(rowOf(layout, 'carl')).toBe(rowOf(layout, 'emil'));
    expect(overlaps(layout, 'carl', 'emil')).toBe(false);
  });

  it('leaves a partner with no children in the same row all the same', () => {
    const persons = people('anna', 'bernd', 'carl');
    const relations = [partners('anna', 'bernd'), parentOf('anna', 'carl')];

    const layout = layoutTree(persons, relations, 'anna');

    expect(rowOf(layout, 'bernd')).toBe(rowOf(layout, 'anna'));
    expect(overlaps(layout, 'anna', 'bernd')).toBe(false);
  });

  it('places somebody who is connected to nothing rather than dropping them', () => {
    const persons = people('anna', 'carl', 'lone');

    const layout = layoutTree(persons, [parentOf('anna', 'carl')], 'anna');

    expect(layout.nodes.map((node) => node.person.id)).toContain('lone');
    expect(overlaps(layout, 'anna', 'lone')).toBe(false);
  });

  it('finishes even when the data says somebody is their own ancestor', () => {
    const cycle = [parentOf('anna', 'bernd'), parentOf('bernd', 'anna')];

    const layout = layoutTree(people('anna', 'bernd'), cycle, 'anna');

    expect(layout.nodes).toHaveLength(2);
  });

  it('reports a size that covers every card', () => {
    const persons = people('anna', 'bernd', 'carl');
    const relations = [partners('anna', 'bernd'), parentOf('anna', 'carl')];

    const layout = layoutTree(persons, relations, 'anna');

    for (const node of layout.nodes) {
      expect(node.x + CARD_WIDTH).toBeLessThanOrEqual(layout.size.width);
      expect(node.y + CARD_HEIGHT).toBeLessThanOrEqual(layout.size.height);
    }
  });

  it('starts at the top left corner, so the canvas never sees a negative coordinate', () => {
    const layout = layoutTree(people('anna', 'bernd'), [partners('anna', 'bernd')], 'anna');

    expect(Math.min(...layout.nodes.map((node) => node.x))).toBe(0);
    expect(Math.min(...layout.nodes.map((node) => node.y))).toBe(0);
  });

  it('answers with nothing at all for an empty tree instead of throwing', () => {
    const layout = layoutTree([], [], null);

    expect(layout).toEqual({ nodes: [], connectors: [], size: { width: 0, height: 0 } });
  });
});

interface PathStep {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/** Every straight leg of an SVG path, including the two halves of each rounded corner. */
function legsOf(path: string): PathStep[] {
  const numbers = /-?\d+(?:\.\d+)?/g;
  const legs: PathStep[] = [];
  let current = { x: 0, y: 0 };

  for (const command of path.match(/[MLQ][^MLQ]*/g) ?? []) {
    const values = (command.match(numbers) ?? []).map(Number);

    if (command.startsWith('M')) current = { x: values[0], y: values[1] };
    if (command.startsWith('L')) {
      legs.push({ from: current, to: { x: values[0], y: values[1] } });
      current = { x: values[0], y: values[1] };
    }
    if (command.startsWith('Q')) {
      legs.push({ from: current, to: { x: values[0], y: values[1] } });
      legs.push({ from: { x: values[0], y: values[1] }, to: { x: values[2], y: values[3] } });
      current = { x: values[2], y: values[3] };
    }
  }

  return legs;
}

function isAxisAligned(leg: PathStep): boolean {
  return (
    Math.abs(leg.from.x - leg.to.x) < 0.51 ||
    Math.abs(leg.from.y - leg.to.y) < 0.51 ||
    (leg.from.x === leg.to.x && leg.from.y === leg.to.y)
  );
}

describe('layoutTree connectors', () => {
  const persons = people('anna', 'bernd', 'carl', 'dora');
  const relations = [
    partners('anna', 'bernd'),
    parentOf('anna', 'carl'),
    parentOf('bernd', 'carl'),
    parentOf('anna', 'dora'),
    parentOf('bernd', 'dora'),
  ];

  it('draws one bar for the couple and one connector for the family they share', () => {
    const layout = layoutTree(persons, relations, 'anna');

    expect(layout.connectors.filter((line) => line.kind === 'partner')).toHaveLength(1);
    expect(layout.connectors.filter((line) => line.kind === 'parent')).toHaveLength(1);
  });

  it('never draws a diagonal, which is what makes it read as a family tree', () => {
    const layout = layoutTree(persons, relations, 'anna');

    for (const connector of layout.connectors) {
      for (const leg of legsOf(connector.path)) {
        expect(isAxisAligned(leg)).toBe(true);
      }
    }
  });

  it('leaves out a connector whose people are not on the canvas', () => {
    const layout = layoutTree(people('anna'), [parentOf('anna', 'ghost')], 'anna');

    expect(layout.connectors).toHaveLength(0);
  });
});
