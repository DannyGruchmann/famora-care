import {
  average,
  CARD_HEIGHT,
  CARD_WIDTH,
  CORNER,
  isPresent,
  middleX,
  round,
  type LayoutNode,
  type Point,
} from './tree.geometry';
import type { RelationKind, TreeRelation } from './tree.types';

/** One line between cards, as SVG path data. Orthogonal only — never a diagonal. */
export interface LayoutConnector {
  id: string;
  kind: RelationKind;
  path: string;
}

type NodesById = Map<string, LayoutNode>;

interface Family {
  parentIds: string[];
  childIds: string[];
}

export function toConnectors(nodes: LayoutNode[], relations: TreeRelation[]): LayoutConnector[] {
  const byId: NodesById = new Map(nodes.map((node) => [node.person.id, node]));

  return [...partnerConnectors(relations, byId), ...familyConnectors(relations, byId)];
}

function partnerConnectors(relations: TreeRelation[], byId: NodesById): LayoutConnector[] {
  return relations
    .filter((relation) => relation.kind === 'partner')
    .map((relation) => partnerConnector(relation, byId))
    .filter(isPresent);
}

/** A short bar between the two cards, at the height of their middle. */
function partnerConnector(relation: TreeRelation, byId: NodesById): LayoutConnector | null {
  const first = byId.get(relation.personA);
  const second = byId.get(relation.personB);
  if (first === undefined || second === undefined) return null;

  const [left, right] = first.x <= second.x ? [first, second] : [second, first];
  const y = left.y + CARD_HEIGHT / 2;
  const path = straight({ x: left.x + CARD_WIDTH, y }, { x: right.x, y });

  return { id: relation.id, kind: 'partner', path };
}

/**
 * One connector per set of parents rather than one per edge: two parents and three children share
 * a single bar with one line into each child, which is what a family tree looks like on paper.
 */
function familyConnectors(relations: TreeRelation[], byId: NodesById): LayoutConnector[] {
  return [...groupFamilies(relations)]
    .map(([key, family]) => familyConnector(key, family, byId))
    .filter(isPresent);
}

function groupFamilies(relations: TreeRelation[]): Map<string, Family> {
  const families = new Map<string, Family>();

  for (const [childId, parentIds] of parentsPerChild(relations)) {
    const sorted = [...parentIds].sort();
    const key = sorted.join('+');
    const family = families.get(key) ?? { parentIds: sorted, childIds: [] };

    families.set(key, { ...family, childIds: [...family.childIds, childId] });
  }

  return families;
}

function parentsPerChild(relations: TreeRelation[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();

  for (const relation of relations) {
    if (relation.kind !== 'parent') continue;

    parents.set(relation.personB, [...(parents.get(relation.personB) ?? []), relation.personA]);
  }

  return parents;
}

/**
 * A drop from each parent to a bar halfway down the gap, and from the middle of that bar one line
 * per child. The horizontal leg has zero length when a child sits directly below, which the corner
 * helper handles on its own — so the common case comes out as a single straight line.
 */
function familyConnector(key: string, family: Family, byId: NodesById): LayoutConnector | null {
  const parents = family.parentIds.map((id) => byId.get(id)).filter(isPresent);
  const children = family.childIds.map((id) => byId.get(id)).filter(isPresent);
  if (parents.length === 0 || children.length === 0) return null;

  const barY = junctionBetween(parents, children);
  const origin = { x: average(parents.map(middleX)), y: barY };
  const segments = [
    ...parents.map((parent) => dropFrom(parent, barY)),
    ...parentBar(parents, barY),
    ...children.map((child) => branchTo(origin, child)),
  ];

  return { id: `parents-${key}`, kind: 'parent', path: segments.join(' ') };
}

function dropFrom(parent: LayoutNode, barY: number): string {
  const x = middleX(parent);

  return straight({ x, y: parent.y + CARD_HEIGHT }, { x, y: barY });
}

/** Only needed once two people share the children: it joins their two drops. */
function parentBar(parents: LayoutNode[], barY: number): string[] {
  if (parents.length < 2) return [];

  const middles = parents.map(middleX);

  return [straight({ x: Math.min(...middles), y: barY }, { x: Math.max(...middles), y: barY })];
}

function branchTo(origin: Point, child: LayoutNode): string {
  const x = middleX(child);

  return orthogonalPath([origin, { x, y: origin.y }, { x, y: child.y }]);
}

/** Halfway down the gap between the rows, so a bar never touches a card. */
function junctionBetween(parents: LayoutNode[], children: LayoutNode[]): number {
  const bottom = Math.max(...parents.map((node) => node.y + CARD_HEIGHT));
  const top = Math.min(...children.map((node) => node.y));

  return bottom + (top - bottom) / 2;
}

function straight(from: Point, to: Point): string {
  return `M ${round(from.x)} ${round(from.y)} L ${round(to.x)} ${round(to.y)}`;
}

/**
 * A path through the given points with the corners rounded. Every leg stays horizontal or
 * vertical: a diagonal is what makes a diagram read as a network graph instead of a family tree.
 */
function orthogonalPath(points: Point[]): string {
  if (points.length < 2) return '';

  const last = points[points.length - 1];
  const corners = points
    .slice(1, -1)
    .map((corner, index) => roundedCorner(points[index], corner, points[index + 2]));

  return [start(points[0]), ...corners, lineTo(last)].join(' ');
}

function roundedCorner(from: Point, corner: Point, to: Point): string {
  const entry = towards(corner, from);
  const exit = towards(corner, to);

  return `${lineTo(entry)} Q ${round(corner.x)} ${round(corner.y)} ${round(exit.x)} ${round(exit.y)}`;
}

/** One corner radius away from `from` towards `to`, and never past the halfway mark between them. */
function towards(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return from;

  const step = Math.min(CORNER, length / 2);

  return { x: from.x + (dx / length) * step, y: from.y + (dy / length) * step };
}

function start(point: Point): string {
  return `M ${round(point.x)} ${round(point.y)}`;
}

function lineTo(point: Point): string {
  return `L ${round(point.x)} ${round(point.y)}`;
}
