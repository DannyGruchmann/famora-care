/**
 * How somebody stands to the person a folder is about.
 *
 * Six values rather than a genealogy: these are the degrees German succession law turns on
 * (§§ 1924 ff. BGB) and the ones people name at a kitchen table. Everything further out — cousins,
 * step-relations, the neighbour with the spare key — is 'other', which the tree lists but does not
 * try to place.
 */
export type Relation = 'parent' | 'sibling' | 'partner' | 'child' | 'grandchild' | 'other';

/** What an unknown or missing relation reads as. Also what the form starts on. */
export const DEFAULT_RELATION: Relation = 'other';

/**
 * A person written into a folder. No account and no invitation — a name the owner typed.
 *
 * Still called Helper: it is what the jsonb column is called and what these people do, take work
 * off the list. The relation only says where they belong in the family, and a folder written
 * before the tree existed simply has everybody under 'other'.
 */
export interface Helper {
  id: string;
  name: string;
  relation: Relation;
  /** Kept out of the assignment list: a task cannot be handed to somebody who died. */
  deceased: boolean;
}

export interface HelperWithLoad extends Helper {
  openTaskCount: number;
}

/**
 * What the form collects. The id is minted on save, never typed by anyone — and on an edit it is
 * the id staying put that lets a person be renamed without losing the tasks assigned to them.
 */
export interface HelperDraft {
  name: string;
  relation: Relation;
  deceased: boolean;
}

export function emptyHelperDraft(): HelperDraft {
  return { name: '', relation: DEFAULT_RELATION, deceased: false };
}

export function toHelperDraft(person: Helper): HelperDraft {
  return { name: person.name, relation: person.relation, deceased: person.deceased };
}
