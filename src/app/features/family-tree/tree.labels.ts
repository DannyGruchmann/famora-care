import type { RelativeKind, TreePerson } from './tree.types';

/**
 * The German the tree screens show. Kept together and away from the templates so that the wording
 * is decided once — the same person appears on a card, in the panel and in the list for screen
 * readers, and three places phrasing it slightly differently is how copy drifts apart.
 */

/**
 * "1932–2019" rather than a name with "verstorben" stamped underneath. It says the same in fewer
 * words, and it keeps a dead relative legible instead of greying them out of their own tree.
 */
export function describeLifespan(person: TreePerson): string {
  if (person.deceased) return deceasedYears(person);
  if (person.birthYear !== null) return `geb. ${person.birthYear}`;

  return '';
}

function deceasedYears(person: TreePerson): string {
  if (person.birthYear !== null && person.deathYear !== null) {
    return `${person.birthYear}–${person.deathYear}`;
  }
  if (person.deathYear !== null) return `gest. ${person.deathYear}`;
  if (person.birthYear !== null) return `geb. ${person.birthYear}, verstorben`;

  return 'verstorben';
}

/** Everything a screen reader needs about one person in one sentence. */
export function describePerson(person: TreePerson): string {
  const years = describeLifespan(person);

  return years === '' ? person.name : `${person.name}, ${years}`;
}

export function describePersonCount(count: number): string {
  return count === 1 ? '1 Person' : `${count} Personen`;
}

export function describeGenerationCount(count: number): string {
  return count === 1 ? '1 Generation' : `${count} Generationen`;
}

/** The one line the folder card shows about a tree that already exists. */
export function describeTree(personCount: number, generationCount: number): string {
  return `${describePersonCount(personCount)}, ${describeGenerationCount(generationCount)}`;
}

const RELATIVE_LABELS: Record<RelativeKind, string> = {
  parent: 'Elternteil',
  partner: 'Partner/in',
  child: 'Kind',
};

export function describeRelativeKind(kind: RelativeKind): string {
  return RELATIVE_LABELS[kind];
}

/** The heading over the form that adds somebody, e.g. "Elternteil von Anna Berger". */
export function describeAddRelative(kind: RelativeKind, anchorName: string): string {
  return `${describeRelativeKind(kind)} von ${anchorName}`;
}
