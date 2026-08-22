import { TestBed } from '@angular/core/testing';
import { SupabaseService, type FamoraSupabaseClient } from '@/app/lib/supabase.service';
import { FoldersQueries } from './folders.queries';
import type { Folder } from './folder.types';

/** A row the way Postgres hands it over: the jsonb columns are unchecked. */
function rowWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'folder-1',
    answers: { mode: ['after-death'] },
    completed_task_ids: [],
    helpers: [],
    assignments: {},
    created_at: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

/** Stands in for the query chain loadFolder walks: from().select().eq().maybeSingle(). */
function clientReturning(row: unknown): FamoraSupabaseClient {
  const maybeSingle = () => Promise.resolve({ data: row, error: null });

  return {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  } as unknown as FamoraSupabaseClient;
}

function queriesFor(client: FamoraSupabaseClient | null): FoldersQueries {
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { client } }],
  });

  return TestBed.inject(FoldersQueries);
}

async function loadRow(row: unknown): Promise<Folder> {
  const result = await queriesFor(clientReturning(row)).loadFolder('folder-1');
  if (!result.ok || result.data === null) throw new Error('the row did not load');

  return result.data;
}

describe('FoldersQueries.loadFolder', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('falls back to empty answers when the column holds something that is not an object', async () => {
    const folder = await loadRow(rowWith({ answers: 'kaputt' }));

    expect(folder.answers).toEqual({});
  });

  it('keeps only the answers that are string arrays', async () => {
    const answers = { mode: ['after-death'], broken: 'not-an-array', mixed: ['ok', 7] };
    const folder = await loadRow(rowWith({ answers }));

    expect(folder.answers).toEqual({ mode: ['after-death'] });
  });

  it('drops helpers that do not carry an id and a name', async () => {
    const helpers = [{ id: 'h-1', name: 'Anna' }, { id: 'h-2' }, 'Bernd', null];
    const folder = await loadRow(rowWith({ helpers }));

    expect(folder.helpers).toEqual([{ id: 'h-1', name: 'Anna' }]);
  });

  it('drops assignments that do not point at a helper id', async () => {
    const assignments = { 'd-bank': 'h-1', 'd-pension': 42 };
    const folder = await loadRow(rowWith({ assignments }));

    expect(folder.assignments).toEqual({ 'd-bank': 'h-1' });
  });

  it('keeps a null progress list as "never opened"', async () => {
    const folder = await loadRow(rowWith({ completed_task_ids: null }));

    expect(folder.completedTaskIds).toBeNull();
  });

  it('keeps an empty progress list apart from that, as "nothing done yet"', async () => {
    const folder = await loadRow(rowWith({ completed_task_ids: [] }));

    expect(folder.completedTaskIds).toEqual([]);
  });

  it('treats a damaged progress list as never opened rather than as nothing done', async () => {
    const folder = await loadRow(rowWith({ completed_task_ids: ['d-bank', 9] }));

    expect(folder.completedTaskIds).toBeNull();
  });

  it('reports a message instead of throwing when Supabase is not configured', async () => {
    const result = await queriesFor(null).loadFolder('folder-1');

    expect(result.ok).toBe(false);
  });
});
