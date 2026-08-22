import type { EntrySection } from '@/app/features/entries/entries.store';
import { findEntryKind } from '@/app/features/entries/entry.kinds';
import type { EntryKind, FolderEntry } from '@/app/features/entries/entry.types';
import { toSheetSections } from './emergency-sheet.sections';

function entryWith(kind: EntryKind, overrides: Partial<FolderEntry> = {}): FolderEntry {
  return {
    id: `${kind}-1`,
    folderId: 'folder-1',
    kind,
    title: 'Testament',
    detail: '',
    reference: '',
    contact: '',
    sortOrder: 0,
    ...overrides,
  };
}

function sectionWith(kind: EntryKind, entries: FolderEntry[]): EntrySection {
  return { config: findEntryKind(kind), entries };
}

describe('toSheetSections', () => {
  it('drops a section nobody filled in', () => {
    const sections = toSheetSections([
      sectionWith('location', [entryWith('location')]),
      sectionWith('contract', []),
    ]);

    expect(sections.map((section) => section.kind)).toEqual(['location']);
  });

  it('keeps only the fields that hold something, in reading order', () => {
    const entry = entryWith('location', {
      reference: 'Bankschließfach Sparkasse',
      detail: 'Zweiter Schlüssel im Schreibtisch.',
    });

    const [section] = toSheetSections([sectionWith('location', [entry])]);

    // The contact field stayed empty and must not print as a labelled blank line.
    expect(section.entries[0].fields).toEqual([
      { label: 'Wo liegt es?', value: 'Bankschließfach Sparkasse' },
      { label: 'Notiz', value: 'Zweiter Schlüssel im Schreibtisch.' },
    ]);
  });

  it('leaves out a field the section does not have at all', () => {
    const wish = entryWith('wish', { title: 'Bestattung', detail: 'Seebestattung.' });

    const [section] = toSheetSections([sectionWith('wish', [wish])]);

    // A wish references nothing, so entry.reference has no label to print it under.
    expect(section.entries[0].fields).toEqual([{ label: 'Ihr Wunsch', value: 'Seebestattung.' }]);
  });

  it('treats a field of nothing but spaces as empty', () => {
    const entry = entryWith('contract', { reference: '   ' });

    const [section] = toSheetSections([sectionWith('contract', [entry])]);

    expect(section.entries[0].fields).toEqual([]);
  });
});
