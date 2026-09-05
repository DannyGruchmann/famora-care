import { toConnectors, type LayoutConnector } from './tree.connectors';
import {
  assignGenerations,
  buildGraph,
  groupByGeneration,
  isPartnerOf,
  type TreeGraph,
} from './tree.generations';
import {
  average,
  CARD_HEIGHT,
  CARD_WIDTH,
  GAP_PARTNER,
  GAP_X,
  ROW_HEIGHT,
  type LayoutNode,
} from './tree.geometry';
import type { TreePerson, TreeRelation } from './tree.types';

export interface TreeLayout {
  nodes: LayoutNode[];
  connectors: LayoutConnector[];
  size: { width: number; height: number };
}

/**
 * Fixed rather than "until it settles". Four passes are enough for the trees this is for, and a
 * fixed count means no shape of data — a cycle, a hundred siblings — can make this run forever.
 */
const SWEEPS = 4;

type Positions = Map<string, number>;

/**
 * Everything the canvas needs to draw a tree: where each card goes, the lines between them, and
 * how much room the whole thing takes. Pure — no Angular, no DOM, nothing measured in a browser.
 */
export function layoutTree(
  persons: TreePerson[],
  relations: TreeRelation[],
  focusId: string | null,
): TreeLayout {
  const graph = buildGraph(relations);
  const generations = assignGenerations(persons, relations, focusId);
  const rows = orderRows(groupByGeneration(persons, generations), graph);
  const nodes = toNodes(rows, placeRows(rows, graph));

  return { nodes, connectors: toConnectors(nodes, relations), size: sizeOf(nodes) };
}

/**
 * Row by row from the top: children follow the order of their parents, and partners end up beside
 * each other. Anyone with no parent in the row above keeps the order they arrived in, by name.
 */
function orderRows(rows: TreePerson[][], graph: TreeGraph): TreePerson[][] {
  const ordered: TreePerson[][] = [];

  for (const [index, row] of rows.entries()) {
    const above = ordered[index - 1] ?? [];
    ordered.push(keepPartnersTogether(sortByParents(row, above, graph), graph));
  }

  return ordered;
}

function sortByParents(row: TreePerson[], above: TreePerson[], graph: TreeGraph): TreePerson[] {
  const places = new Map(above.map((person, index) => [person.id, index]));
  const rankOf = (person: TreePerson) => parentRank(person, places, graph);

  return [...row].sort((first, second) => rankOf(first) - rankOf(second));
}

/**
 * The average place of a person's parents in the row above. A large finite number rather than
 * Infinity for the parentless: two of those would subtract to NaN and the sort would give up.
 */
function parentRank(person: TreePerson, places: Map<string, number>, graph: TreeGraph): number {
  const found = (graph.parentsOf.get(person.id) ?? [])
    .map((parent) => places.get(parent))
    .filter((place): place is number => place !== undefined);

  return found.length === 0 ? Number.MAX_SAFE_INTEGER : average(found);
}

/** Walks the row once and pulls each person's partners in directly behind them. */
function keepPartnersTogether(row: TreePerson[], graph: TreeGraph): TreePerson[] {
  const waiting = [...row];
  const ordered: TreePerson[] = [];

  while (waiting.length > 0) {
    const next = waiting.shift();
    if (next === undefined) break;

    ordered.push(next, ...takePartnersFrom(next, waiting, graph));
  }

  return ordered;
}

/** Removes the partners from `waiting` and hands them back, so the caller can place them at once. */
function takePartnersFrom(
  person: TreePerson,
  waiting: TreePerson[],
  graph: TreeGraph,
): TreePerson[] {
  const found = waiting.filter((candidate) => isPartnerOf(person.id, candidate.id, graph));

  for (const partner of found) {
    waiting.splice(waiting.indexOf(partner), 1);
  }

  return found;
}

/**
 * Positions are found by placing blocks, not single cards. A block is a group that has to stay
 * together — a set of siblings, or a couple — and it is placed so that its middle sits under (or
 * over) the middle of whatever it hangs from. A block only slides right, never left, and only far
 * enough to clear the block before it.
 *
 * Two directions, repeated: children under their parents, then parents over their children. It
 * ends on a downward pass, so the last word belongs to "children sit under their parents", which
 * is the relationship the eye checks first.
 */
function placeRows(rows: TreePerson[][], graph: TreeGraph): Positions {
  const positions = initialPositions(rows, graph);

  for (let sweep = 0; sweep < SWEEPS; sweep += 1) {
    placeUnderParents(rows, positions, graph);
    placeOverChildren(rows, positions, graph);
  }

  placeUnderParents(rows, positions, graph);

  return shiftToZero(positions);
}

/** A starting point for rows no pass reaches — a tree of one generation has only this. */
function initialPositions(rows: TreePerson[][], graph: TreeGraph): Positions {
  const positions: Positions = new Map();

  for (const row of rows) {
    layOutBlock(row, 0, positions, graph);
  }

  return positions;
}

function placeUnderParents(rows: TreePerson[][], positions: Positions, graph: TreeGraph): void {
  for (const row of rows.slice(1)) {
    const anchorOf = (block: TreePerson[]) => middleOfRelatives(block, graph.parentsOf, positions);

    placeBlocks(siblingBlocks(row, graph), positions, graph, anchorOf);
  }
}

function placeOverChildren(rows: TreePerson[][], positions: Positions, graph: TreeGraph): void {
  for (const row of [...rows].reverse().slice(1)) {
    const anchorOf = (block: TreePerson[]) => middleOfRelatives(block, graph.childrenOf, positions);

    placeBlocks(partnerBlocks(row, graph), positions, graph, anchorOf);
  }
}

/**
 * Left to right through one row. A block goes where its anchor wants it, unless the block before
 * it is already there — then it goes as far left as it can without touching.
 */
function placeBlocks(
  blocks: TreePerson[][],
  positions: Positions,
  graph: TreeGraph,
  anchorOf: (block: TreePerson[]) => number | null,
): void {
  let cursor: number | null = null;

  for (const block of blocks) {
    const width = blockWidth(block, graph);
    const anchor = anchorOf(block);
    // Both annotated: without them the inferred type of `left` depends on `cursor`, which is
    // assigned from `left` at the end of the loop, and TypeScript refuses the circle.
    const wanted: number = anchor === null ? (cursor ?? 0) : anchor - width / 2;
    const left: number = cursor === null ? wanted : Math.max(wanted, cursor);

    layOutBlock(block, left, positions, graph);
    cursor = left + width + GAP_X;
  }
}

function blockWidth(block: TreePerson[], graph: TreeGraph): number {
  const gaps = block
    .slice(1)
    .reduce((total, person, index) => total + gapBefore(person, block[index], graph), 0);

  return block.length * CARD_WIDTH + gaps;
}

function layOutBlock(
  block: TreePerson[],
  left: number,
  positions: Positions,
  graph: TreeGraph,
): void {
  let x = left;

  for (const [index, person] of block.entries()) {
    x += index === 0 ? 0 : CARD_WIDTH + gapBefore(person, block[index - 1], graph);
    positions.set(person.id, x);
  }
}

/** Siblings — everyone in the row with the same set of parents. Ordering already made them neighbours. */
function siblingBlocks(row: TreePerson[], graph: TreeGraph): TreePerson[][] {
  return groupNeighbours(
    row,
    (person, previous) => parentKey(person, graph) === parentKey(previous, graph),
  );
}

/** A couple, and anyone else joined to them, so that a pair is never split by something between. */
function partnerBlocks(row: TreePerson[], graph: TreeGraph): TreePerson[][] {
  return groupNeighbours(row, (person, previous) => isPartnerOf(person.id, previous.id, graph));
}

function groupNeighbours(
  row: TreePerson[],
  belongsWithPrevious: (person: TreePerson, previous: TreePerson) => boolean,
): TreePerson[][] {
  const blocks: TreePerson[][] = [];

  for (const [index, person] of row.entries()) {
    const previous = row[index - 1];
    const current = blocks[blocks.length - 1];

    if (current === undefined || !belongsWithPrevious(person, previous)) blocks.push([person]);
    else current.push(person);
  }

  return blocks;
}

function parentKey(person: TreePerson, graph: TreeGraph): string {
  return [...(graph.parentsOf.get(person.id) ?? [])].sort().join('+');
}

/**
 * The middle of everyone the block is connected to in one direction, as one number. null when the
 * block hangs from nothing — a top row, or somebody nobody linked up.
 */
function middleOfRelatives(
  block: TreePerson[],
  links: Map<string, string[]>,
  positions: Positions,
): number | null {
  const related = new Set(block.flatMap((person) => links.get(person.id) ?? []));
  const middles = [...related]
    .map((id) => positions.get(id))
    .filter((x): x is number => x !== undefined)
    .map((x) => x + CARD_WIDTH / 2);

  return middles.length === 0 ? null : average(middles);
}

function gapBefore(person: TreePerson, previous: TreePerson, graph: TreeGraph): number {
  return isPartnerOf(person.id, previous.id, graph) ? GAP_PARTNER : GAP_X;
}

/** The leftmost card sits at 0, so the canvas never has to deal with negative coordinates. */
function shiftToZero(positions: Positions): Positions {
  if (positions.size === 0) return positions;

  const left = Math.min(...positions.values());

  return new Map([...positions].map(([id, x]) => [id, x - left]));
}

function toNodes(rows: TreePerson[][], positions: Positions): LayoutNode[] {
  return rows.flatMap((row, generation) =>
    row.map((person) => ({
      person,
      generation,
      x: positions.get(person.id) ?? 0,
      y: generation * ROW_HEIGHT,
    })),
  );
}

function sizeOf(nodes: LayoutNode[]): { width: number; height: number } {
  if (nodes.length === 0) return { width: 0, height: 0 };

  return {
    width: Math.max(...nodes.map((node) => node.x)) + CARD_WIDTH,
    height: Math.max(...nodes.map((node) => node.y)) + CARD_HEIGHT,
  };
}
