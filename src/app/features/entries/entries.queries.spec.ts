import { TestBed } from '@angular/core/testing';
import { SupabaseService, type FamoraSupabaseClient } from '@/app/lib/supabase.service';
import { EntriesQueries } from './entries.queries';

function rowWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'entry-1',
    folder_id: 'folder-1',
    kind: 'location',
    title: 'Testament',
    detail: '',
    reference: 'Bankschließfach',
    contact: '',
    sort_order: 0,
    ...overrides,
  };
}

/** Stands in for the chain listEntries walks: from().select().eq().order().order(). */
function clientReturning(rows: unknown[]): FamoraSupabaseClient {
  const second = {
    then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }),
  };
  const first = { order: () => second };

  return {
    from: () => ({ select: () => ({ eq: () => ({ order: () => first }) }) }),
  } as unknown as FamoraSupabaseClient;
}

function queriesFor(client: FamoraSupabaseClient | null): EntriesQueries {
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { client } }],
  });

  return TestBed.inject(EntriesQueries);
}

describe('EntriesQueries.listEntries', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('turns a row into an entry the app can use', async () => {
    const result = await queriesFor(clientReturning([rowWith({})])).listEntries('folder-1');
    if (!result.ok) throw new Error('the rows did not load');

    expect(result.data).toEqual([
      {
        id: 'entry-1',
        folderId: 'folder-1',
        kind: 'location',
        title: 'Testament',
        detail: '',
        reference: 'Bankschließfach',
        contact: '',
        sortOrder: 0,
      },
    ]);
  });

  it('drops a row whose section this version does not know', async () => {
    const rows = [rowWith({}), rowWith({ id: 'entry-2', kind: 'from-a-later-version' })];
    const result = await queriesFor(clientReturning(rows)).listEntries('folder-1');
    if (!result.ok) throw new Error('the rows did not load');

    expect(result.data.map((entry) => entry.id)).toEqual(['entry-1']);
  });

  it('reports a message instead of throwing when Supabase is not configured', async () => {
    const result = await queriesFor(null).listEntries('folder-1');

    expect(result.ok).toBe(false);
  });
});

/** listFilledKinds asks for two columns and nothing else: from().select() and that is the answer. */
function clientReturningKinds(rows: unknown[]): FamoraSupabaseClient {
  return {
    from: () => ({
      select: () => ({
        then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }),
      }),
    }),
  } as unknown as FamoraSupabaseClient;
}

describe('EntriesQueries.listFilledKinds', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('keeps every folder to its own sections', async () => {
    const client = clientReturningKinds([
      { folder_id: 'folder-1', kind: 'location' },
      { folder_id: 'folder-1', kind: 'wish' },
      { folder_id: 'folder-2', kind: 'contract' },
    ]);
    const result = await queriesFor(client).listFilledKinds();
    if (!result.ok) throw new Error('the rows did not load');

    expect(result.data.get('folder-1')).toEqual(['location', 'wish']);
    expect(result.data.get('folder-2')).toEqual(['contract']);
  });

  it('names a section once, however many entries stand in it', async () => {
    const client = clientReturningKinds([
      { folder_id: 'folder-1', kind: 'location' },
      { folder_id: 'folder-1', kind: 'location' },
    ]);
    const result = await queriesFor(client).listFilledKinds();
    if (!result.ok) throw new Error('the rows did not load');

    expect(result.data.get('folder-1')).toEqual(['location']);
  });

  it('drops a section this version does not know', async () => {
    const client = clientReturningKinds([{ folder_id: 'folder-1', kind: 'from-a-later-version' }]);
    const result = await queriesFor(client).listFilledKinds();
    if (!result.ok) throw new Error('the rows did not load');

    expect(result.data.size).toBe(0);
  });
});
