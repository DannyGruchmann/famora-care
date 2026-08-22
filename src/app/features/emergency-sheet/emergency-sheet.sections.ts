import type { EntryKindConfig } from '@/app/features/entries/entry.kinds';
import type { EntrySection } from '@/app/features/entries/entries.store';
import type { EntryKind, FolderEntry } from '@/app/features/entries/entry.types';

/** One labelled line under an entry. */
export interface SheetField {
  label: string;
  value: string;
}

export interface SheetEntry {
  id: string;
  title: string;
  fields: SheetField[];
}

export interface SheetSection {
  kind: EntryKind;
  label: string;
  entries: SheetEntry[];
}

/**
 * The register as it goes onto paper.
 *
 * Two things happen here that the screen does not do. Empty sections are dropped — on screen an
 * empty section invites you to fill it, on paper it is a heading over nothing. And empty fields
 * are dropped with them, because the labels come from the section rather than from the entry:
 * every entry carries all four columns, most of them blank.
 */
export function toSheetSections(sections: EntrySection[]): SheetSection[] {
  return sections
    .filter((section) => section.entries.length > 0)
    .map((section) => ({
      kind: section.config.kind,
      label: section.config.label,
      entries: section.entries.map((entry) => toSheetEntry(entry, section.config)),
    }));
}

function toSheetEntry(entry: FolderEntry, config: EntryKindConfig): SheetEntry {
  return { id: entry.id, title: entry.title, fields: toFields(entry, config) };
}

/** Reading order on paper: what it is, who to ask, then the note about it. */
function toFields(entry: FolderEntry, config: EntryKindConfig): SheetField[] {
  const candidates = [
    { label: config.referenceLabel, value: entry.reference },
    { label: config.contactLabel, value: entry.contact },
    { label: config.detailLabel, value: entry.detail },
  ];

  return candidates.filter(isFilledField);
}

/** A field without a label is one this section does not have — a wish references nothing. */
function isFilledField(field: { label?: string; value: string }): field is SheetField {
  return field.label !== undefined && field.value.trim() !== '';
}
