import { getPersonName, isPreparing } from '@/app/features/onboarding/onboarding.questions';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import { findRelation } from './family.relations';
import type { Helper, Relation } from './family.types';

/** A person as the tree draws them. Flattened on purpose: the view renders one shape, not four. */
export interface TreePerson {
  id: string;
  name: string;
  /**
   * Only where the row heading does not already say it — the partners standing beside the centre.
   * Empty everywhere else, because repeating "Kind" under a row called "Kinder" is noise.
   */
  roleLabel: string;
  /** The person the folder is about. Drawn filled, and not removable from here. */
  isCentre: boolean;
  deceased: boolean;
}

/** One generation. Rows without anybody in them are never built. */
export interface TreeRow {
  id: string;
  /** Empty for the centre row, which carries two roles and lets the cards explain themselves. */
  label: string;
  people: TreePerson[];
  /**
   * Drawn below the tree without a connector. Somebody who is not a relative has no generation to
   * sit in, and inventing one for them would say something the folder never claimed.
   */
  isOutsideTree: boolean;
}

export interface FamilyTree {
  /** Top to bottom. Always holds at least the centre row. */
  rows: TreeRow[];
  /** Nobody entered yet: the centre stands alone and the view says what to add. */
  isEmpty: boolean;
}

const ROWS_ABOVE: Relation[] = ['parent', 'sibling'];
const ROWS_BELOW: Relation[] = ['child', 'grandchild'];
const CENTRE_ROW_ID = 'centre';

const UNNAMED_AFTER_DEATH = 'Die verstorbene Person';
const UNNAMED_PREPARE = 'Ich';

/**
 * Who the tree is drawn around: the person who died, or whoever the account belongs to. Every
 * relation points at this one person, which is what keeps the whole thing free of edges between
 * third parties — nobody ever has to describe how their aunt relates to their stepfather.
 */
export function familyCentreName(answers: OnboardingAnswers, firstName: string): string {
  if (!isPreparing(answers)) return getPersonName(answers) ?? UNNAMED_AFTER_DEATH;

  const trimmed = firstName.trim();

  return trimmed === '' ? UNNAMED_PREPARE : trimmed;
}

export function buildFamilyTree(people: Helper[], centreName: string): FamilyTree {
  const rows = [
    ...buildRows(people, ROWS_ABOVE),
    buildCentreRow(people, centreName),
    ...buildRows(people, ROWS_BELOW),
    ...buildRows(people, ['other'], true),
  ];

  return { rows, isEmpty: people.length === 0 };
}

/** Empty rows are dropped: a heading over nothing says less than no heading at all. */
function buildRows(people: Helper[], relations: Relation[], isOutsideTree = false): TreeRow[] {
  return relations
    .map((relation) => toRow(people, relation, isOutsideTree))
    .filter((row) => row.people.length > 0);
}

function toRow(people: Helper[], relation: Relation, isOutsideTree: boolean): TreeRow {
  return {
    id: relation,
    label: findRelation(relation).groupLabel,
    people: toPeople(people, relation),
    isOutsideTree,
  };
}

/** The centre and its partners share a row, the way a couple shares one in any family tree. */
function buildCentreRow(people: Helper[], centreName: string): TreeRow {
  const partnerLabel = findRelation('partner').groupLabel;
  const partners = toPeople(people, 'partner').map((person) => ({
    ...person,
    roleLabel: partnerLabel,
  }));

  return {
    id: CENTRE_ROW_ID,
    label: '',
    people: [toCentre(centreName), ...partners],
    isOutsideTree: false,
  };
}

/**
 * No "verstorben" on the centre of an after-death folder. The folder already says so, and putting
 * the word under the name of the person being mourned tells them nothing they came here to learn.
 */
function toCentre(name: string): TreePerson {
  return { id: CENTRE_ROW_ID, name, roleLabel: '', isCentre: true, deceased: false };
}

function toPeople(people: Helper[], relation: Relation): TreePerson[] {
  return people.filter((person) => person.relation === relation).map(toTreePerson);
}

function toTreePerson(person: Helper): TreePerson {
  return {
    id: person.id,
    name: person.name,
    roleLabel: '',
    isCentre: false,
    deceased: person.deceased,
  };
}
