import type { Relation } from './family.types';

/** How one relation presents itself, in the tree and in the form. */
export interface RelationConfig {
  relation: Relation;
  /** Heading of the row in the tree. Always plural — a row can hold several people. */
  groupLabel: string;
  /** What the form offers and what stands next to a name in the list. Singular. */
  optionLabel: string;
}

/**
 * In the order the tree draws them, oldest generation first. The centre sits between 'sibling'
 * and 'child'; 'partner' shares the centre's row, and 'other' is no part of the tree at all.
 *
 * Relations are data, not markup — same reasoning as onboarding.questions.ts and entry.kinds.ts.
 * A seventh relation is an entry here, not a seventh component.
 */
export const RELATIONS: RelationConfig[] = [
  { relation: 'parent', groupLabel: 'Eltern', optionLabel: 'Elternteil' },
  { relation: 'sibling', groupLabel: 'Geschwister', optionLabel: 'Geschwister' },
  {
    relation: 'partner',
    groupLabel: 'Partnerin oder Partner',
    optionLabel: 'Partnerin oder Partner',
  },
  { relation: 'child', groupLabel: 'Kinder', optionLabel: 'Kind' },
  { relation: 'grandchild', groupLabel: 'Enkelkinder', optionLabel: 'Enkelkind' },
  { relation: 'other', groupLabel: 'Weitere Vertrauenspersonen', optionLabel: 'Weitere Person' },
];

/** What an unknown or missing relation reads as. Also what the form starts on. */
export const DEFAULT_RELATION: Relation = 'other';

/**
 * Anything the app does not know becomes 'other'. A folder written by a later version, or a row
 * edited by hand, must not take the overview down over one unfamiliar word.
 */
export function toRelation(value: unknown): Relation {
  const known = RELATIONS.some((config) => config.relation === value);

  return known ? (value as Relation) : DEFAULT_RELATION;
}

export function findRelation(relation: Relation): RelationConfig {
  const config = RELATIONS.find((entry) => entry.relation === relation);
  if (config === undefined) throw new Error(`unknown relation ${relation}`);

  return config;
}
