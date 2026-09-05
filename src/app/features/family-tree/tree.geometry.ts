import type { TreePerson } from './tree.types';

/**
 * The measurements the layout and the connectors both work in, plus the handful of small helpers
 * they share. Kept apart from either so neither has to import the other.
 */

export const CARD_WIDTH = 176;
export const CARD_HEIGHT = 76;
/** Distance from the top of one row to the top of the next. */
export const ROW_HEIGHT = 156;

export const GAP_X = 40;
/** Partners sit closer to each other than to anyone else — that is what makes a couple read as one. */
export const GAP_PARTNER = 14;
/** Corner radius on a connector that turns. */
export const CORNER = 8;

export interface Point {
  x: number;
  y: number;
}

/** One card. Width and height are fixed, so the canvas needs only the top left corner. */
export interface LayoutNode {
  person: TreePerson;
  x: number;
  y: number;
  generation: number;
}

export function middleX(node: LayoutNode): number {
  return node.x + CARD_WIDTH / 2;
}

export function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Half pixels blur a 1.5 px line, and shorter path data is less for the browser to parse. */
export function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
