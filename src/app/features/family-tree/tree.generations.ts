import type { TreePerson, TreeRelation } from './tree.types';

/**
 * The edges, turned inside out: who a person's parents, children and partners are. The layout asks
 * these questions thousands of times and the relation list would have to be scanned every time.
 */
export interface TreeGraph {
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  partnersOf: Map<string, string[]>;
}

export function buildGraph(relations: TreeRelation[]): TreeGraph {
  const graph: TreeGraph = {
    parentsOf: new Map(),
    childrenOf: new Map(),
    partnersOf: new Map(),
  };

  for (const relation of relations) {
    addEdge(graph, relation);
  }

  return graph;
}

function addEdge(graph: TreeGraph, relation: TreeRelation): void {
  if (relation.kind === 'parent') {
    append(graph.childrenOf, relation.personA, relation.personB);
    append(graph.parentsOf, relation.personB, relation.personA);
    return;
  }

  append(graph.partnersOf, relation.personA, relation.personB);
  append(graph.partnersOf, relation.personB, relation.personA);
}

function append(map: Map<string, string[]>, key: string, value: string): void {
  map.set(key, [...(map.get(key) ?? []), value]);
}

export function isPartnerOf(first: string, second: string, graph: TreeGraph): boolean {
  return (graph.partnersOf.get(first) ?? []).includes(second);
}

/**
 * Which row each person belongs in. Breadth-first from the focus person: a parent sits one row
 * above, a child one below, a partner in the same row.
 *
 * Two properties matter more than the exact numbers. Anyone the focus is not connected to starts a
 * sweep of their own, so a branch nobody linked up still lands somewhere instead of vanishing. And
 * a person already placed is never revisited, which is what makes a cycle in the data — somebody
 * entered as their own ancestor — come to a stop rather than loop forever.
 */
export function assignGenerations(
  persons: TreePerson[],
  relations: TreeRelation[],
  focusId: string | null,
): Map<string, number> {
  const graph = buildGraph(relations);
  const generations = new Map<string, number>();

  for (const start of sweepOrder(persons, focusId)) {
    if (generations.has(start)) continue;

    walkFrom(start, graph, generations);
  }

  return normalise(generations);
}

/** The focus person first, so the tree is laid out around them rather than around a random name. */
function sweepOrder(persons: TreePerson[], focusId: string | null): string[] {
  const ids = persons.map((person) => person.id);
  if (focusId === null || !ids.includes(focusId)) return ids;

  return [focusId, ...ids.filter((id) => id !== focusId)];
}

function walkFrom(start: string, graph: TreeGraph, generations: Map<string, number>): void {
  const queue = [start];
  generations.set(start, 0);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    for (const [neighbour, step] of neighboursOf(current, graph)) {
      if (generations.has(neighbour)) continue;

      generations.set(neighbour, (generations.get(current) ?? 0) + step);
      queue.push(neighbour);
    }
  }
}

/** Each neighbour with the row step that reaches it: up to a parent, down to a child, across to a partner. */
function neighboursOf(id: string, graph: TreeGraph): [string, number][] {
  return [
    ...(graph.parentsOf.get(id) ?? []).map((parent): [string, number] => [parent, -1]),
    ...(graph.childrenOf.get(id) ?? []).map((child): [string, number] => [child, 1]),
    ...(graph.partnersOf.get(id) ?? []).map((partner): [string, number] => [partner, 0]),
  ];
}

/** The topmost row becomes 0, so a generation number can be used as a row index. */
function normalise(generations: Map<string, number>): Map<string, number> {
  if (generations.size === 0) return generations;

  const top = Math.min(...generations.values());

  return new Map([...generations].map(([id, level]) => [id, level - top]));
}

/**
 * The people of each row, top to bottom. Rows are contiguous: every step of the walk above moves
 * by at most one, and every sweep starts at zero, so no generation in between can stay empty.
 */
export function groupByGeneration(
  persons: TreePerson[],
  generations: Map<string, number>,
): TreePerson[][] {
  const rows: TreePerson[][] = [];

  for (const person of persons) {
    const row = generations.get(person.id) ?? 0;
    rows[row] = [...(rows[row] ?? []), person];
  }

  return [...rows].map((row: TreePerson[] | undefined) => row ?? []);
}
