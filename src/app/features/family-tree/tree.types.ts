/**
 * What a member of a tree may do. The values match the role column in supabase/family-tree.sql —
 * renaming one locks every stored membership out of its own tree.
 */
export type TreeRole = 'owner' | 'editor' | 'viewer';

/** How the database stores a connection. The values match the kind column. */
export type RelationKind = 'parent' | 'partner';

/**
 * How somebody adds a connection. "child" is not a kind of its own: it is a parent edge pointing
 * the other way, which is why the database knows only two and this knows three.
 */
export type RelativeKind = 'parent' | 'child' | 'partner';

/** The tree itself. Neither the owner nor the member count lives here — see family-tree.sql §1. */
export interface FamilyTree {
  id: string;
  name: string;
  /** The person the tree opens on. Empty until the first person exists. */
  rootPersonId: string | null;
}

/**
 * One human being in the tree. Everything the plan decided against — photo, full date of birth,
 * free text, contact details, gender — is absent here because it is absent in the table.
 */
export interface TreePerson {
  id: string;
  treeId: string;
  name: string;
  /** A year, not a date. Enough to sort generations, not enough to impersonate anybody. */
  birthYear: number | null;
  deceased: boolean;
  /** Optional even when deceased is true: the fact is often known when the year is not. */
  deathYear: number | null;
}

/** One edge. For 'parent', personA is the parent; for 'partner' the two ends are interchangeable. */
export interface TreeRelation {
  id: string;
  treeId: string;
  kind: RelationKind;
  personA: string;
  personB: string;
}

/** Who may see or change a tree. */
export interface TreeMember {
  treeId: string;
  userId: string;
  role: TreeRole;
  createdAt: string;
}

/**
 * An outstanding invitation as the owner sees it. The token hash is deliberately not part of this
 * shape: nothing in the app needs it, and a field that exists is a field that ends up on a screen.
 */
export interface TreeInvitation {
  id: string;
  treeId: string;
  role: TreeRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const TREE_ROLES: TreeRole[] = ['owner', 'editor', 'viewer'];
const RELATION_KINDS: RelationKind[] = ['parent', 'partner'];

/** null for a value this version does not know — one odd row must not take the whole tree down. */
export function toTreeRole(value: string): TreeRole | null {
  return TREE_ROLES.some((role) => role === value) ? (value as TreeRole) : null;
}

export function toRelationKind(value: string): RelationKind | null {
  return RELATION_KINDS.some((kind) => kind === value) ? (value as RelationKind) : null;
}

/** What the person form hands over. No id and no tree — those are not the user's business. */
export interface PersonDraft {
  name: string;
  birthYear: number | null;
  deceased: boolean;
  deathYear: number | null;
}

export function emptyPersonDraft(): PersonDraft {
  return { name: '', birthYear: null, deceased: false, deathYear: null };
}

export function toPersonDraft(person: TreePerson): PersonDraft {
  return {
    name: person.name,
    birthYear: person.birthYear,
    deceased: person.deceased,
    deathYear: person.deathYear,
  };
}

/** The two ends of a relation, in the order the table stores them. */
export interface RelationEdge {
  kind: RelationKind;
  personA: string;
  personB: string;
}

/**
 * A partner edge is undirected, so (A, B) and (B, A) would mean the same thing and the unique key
 * would store both. The check constraint compares the two ids, so the smaller one goes first and
 * every couple has exactly one possible row.
 */
export function orderPartners(first: string, second: string): { personA: string; personB: string } {
  return first < second ? { personA: first, personB: second } : { personA: second, personB: first };
}

/**
 * Turns "add a parent of Anna" into the row the table takes. A parent edge points from parent to
 * child, so which end the new person goes on is the whole difference between 'parent' and 'child'.
 */
export function toRelationEdge(
  kind: RelativeKind,
  anchorId: string,
  relativeId: string,
): RelationEdge {
  if (kind === 'parent') return { kind: 'parent', personA: relativeId, personB: anchorId };
  if (kind === 'child') return { kind: 'parent', personA: anchorId, personB: relativeId };

  return { kind: 'partner', ...orderPartners(anchorId, relativeId) };
}
