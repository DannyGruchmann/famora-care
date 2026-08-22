/**
 * The five sections of a precaution folder. The values match the kind column in
 * supabase/folder-entries.sql — renaming one orphans every stored row.
 */
export type EntryKind = 'location' | 'contract' | 'account' | 'contact' | 'wish';

/** One thing worth writing down before it is needed. */
export interface FolderEntry {
  id: string;
  folderId: string;
  kind: EntryKind;
  /** What it is: "Testament", "Allianz Hausrat", "Google". */
  title: string;
  /** Free text — what should happen with it, what matters about it. */
  detail: string;
  /**
   * The identifying string, and what it means depends on the kind: where it is kept, the policy
   * number, the user name. Never a password — see the note in folder-entries.sql.
   */
  reference: string;
  /** Who helps with this, with a phone number. */
  contact: string;
  sortOrder: number;
}

/** What the form hands over. No id, no folder, no order — those are not the user's business. */
export interface EntryDraft {
  title: string;
  detail: string;
  reference: string;
  contact: string;
}

export function emptyDraft(): EntryDraft {
  return { title: '', detail: '', reference: '', contact: '' };
}

export function toDraft(entry: FolderEntry): EntryDraft {
  return {
    title: entry.title,
    detail: entry.detail,
    reference: entry.reference,
    contact: entry.contact,
  };
}
