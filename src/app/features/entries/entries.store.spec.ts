import { TestBed } from '@angular/core/testing';
import { EntriesQueries } from './entries.queries';
import { EntriesStore } from './entries.store';
import type { EntryDraft, EntryKind, FolderEntry } from './entry.types';

function entry(overrides: Partial<FolderEntry> = {}): FolderEntry {
  return {
    id: 'entry-1',
    folderId: 'folder-1',
    kind: 'location',
    title: 'Testament',
    detail: '',
    reference: 'Bankschließfach',
    contact: '',
    sortOrder: 0,
    ...overrides,
  };
}

function draft(overrides: Partial<EntryDraft> = {}): EntryDraft {
  return { title: 'Neuer Eintrag', detail: '', reference: '', contact: '', ...overrides };
}

function storeWith(entries: FolderEntry[]) {
  const listEntries = vi.fn().mockResolvedValue({ ok: true, data: entries });
  const createEntry = vi
    .fn()
    .mockImplementation(
      (folderId: string, kind: EntryKind, values: EntryDraft, sortOrder: number) =>
        Promise.resolve({
          ok: true,
          data: entry({ id: `created-${sortOrder}`, folderId, kind, ...values, sortOrder }),
        }),
    );
  const updateEntry = vi.fn().mockResolvedValue({ ok: true, data: undefined });
  const deleteEntry = vi.fn().mockResolvedValue({ ok: true, data: undefined });

  TestBed.configureTestingModule({
    providers: [
      EntriesStore,
      {
        provide: EntriesQueries,
        useValue: { listEntries, createEntry, updateEntry, deleteEntry },
      },
    ],
  });

  return {
    store: TestBed.inject(EntriesStore),
    listEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}

async function openFolder(store: EntriesStore): Promise<void> {
  store.setFolderId('folder-1');
  TestBed.tick();

  await vi.waitFor(() => {
    if (store.status() === 'loading') throw new Error('entries are still loading');
  });
}

function sectionOf(store: EntriesStore, kind: EntryKind): FolderEntry[] {
  const section = store.sections().find((entry) => entry.config.kind === kind);
  if (section === undefined) throw new Error(`section ${kind} is missing`);

  return section.entries;
}

describe('EntriesStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('always offers all five sections, even while every one of them is empty', async () => {
    const { store } = storeWith([]);
    await openFolder(store);

    expect(store.sections().map((section) => section.config.kind)).toEqual([
      'location',
      'contract',
      'account',
      'contact',
      'wish',
    ]);
    expect(store.entryCount()).toBe(0);
  });

  it('sorts an entry into the section it belongs to', async () => {
    const { store } = storeWith([
      entry({ id: 'a', kind: 'location' }),
      entry({ id: 'b', kind: 'wish', title: 'Bestattung' }),
    ]);
    await openFolder(store);

    expect(sectionOf(store, 'location').map((item) => item.id)).toEqual(['a']);
    expect(sectionOf(store, 'wish').map((item) => item.id)).toEqual(['b']);
    expect(sectionOf(store, 'contract')).toEqual([]);
  });

  it('appends a new entry behind the last one of its own section', async () => {
    const { store, createEntry } = storeWith([
      entry({ id: 'a', kind: 'location', sortOrder: 0 }),
      entry({ id: 'b', kind: 'location', sortOrder: 7 }),
      entry({ id: 'c', kind: 'wish', sortOrder: 3 }),
    ]);
    await openFolder(store);

    await store.addEntry('location', draft({ title: 'Vollmacht' }));

    expect(createEntry).toHaveBeenCalledWith('folder-1', 'location', expect.anything(), 8);
    expect(sectionOf(store, 'location').map((item) => item.title)).toEqual([
      'Testament',
      'Testament',
      'Vollmacht',
    ]);
  });

  it('starts a section at zero rather than continuing another section count', async () => {
    const { store, createEntry } = storeWith([entry({ id: 'a', kind: 'location', sortOrder: 4 })]);
    await openFolder(store);

    await store.addEntry('wish', draft({ title: 'Bestattung' }));

    expect(createEntry).toHaveBeenCalledWith('folder-1', 'wish', expect.anything(), 0);
  });

  it('refuses an entry without a title without asking the backend', async () => {
    const { store, createEntry } = storeWith([]);
    await openFolder(store);

    const added = await store.addEntry('location', draft({ title: '   ' }));

    expect(added).toBe(false);
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('trims the local copy the same way the database does', async () => {
    const { store } = storeWith([entry({ id: 'a' })]);
    await openFolder(store);

    await store.updateEntry('a', draft({ title: '  Testament  ', detail: ' im Safe ' }));

    expect(sectionOf(store, 'location')[0].title).toBe('Testament');
    expect(sectionOf(store, 'location')[0].detail).toBe('im Safe');
  });

  it('removes an entry from its section', async () => {
    const { store } = storeWith([entry({ id: 'a' }), entry({ id: 'b' })]);
    await openFolder(store);

    await store.removeEntry('a');

    expect(sectionOf(store, 'location').map((item) => item.id)).toEqual(['b']);
  });

  it('keeps the list untouched and reports the reason when a write fails', async () => {
    const { store, deleteEntry } = storeWith([entry({ id: 'a' })]);
    await openFolder(store);
    deleteEntry.mockResolvedValue({ ok: false, message: 'Keine Verbindung.' });

    const removed = await store.removeEntry('a');

    expect(removed).toBe(false);
    expect(sectionOf(store, 'location')).toHaveLength(1);
    expect(store.error()).toBe('Keine Verbindung.');
    expect(store.isSaving()).toBe(false);
  });

  it('clears an earlier error once the next write goes through', async () => {
    const { store, deleteEntry } = storeWith([entry({ id: 'a' })]);
    await openFolder(store);

    deleteEntry.mockResolvedValueOnce({ ok: false, message: 'Keine Verbindung.' });
    await store.removeEntry('a');
    expect(store.error()).toBeDefined();

    await store.removeEntry('a');

    expect(store.error()).toBeUndefined();
  });

  it('reports a failed load instead of showing an empty folder', async () => {
    const { store, listEntries } = storeWith([]);
    listEntries.mockResolvedValue({ ok: false, message: 'Das hat nicht geklappt.' });

    await openFolder(store);

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Das hat nicht geklappt.');
  });
});
