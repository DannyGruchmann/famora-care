import { TestBed } from '@angular/core/testing';
import { SupabaseService, type FamoraSupabaseClient } from '@/app/lib/supabase.service';
import { TreeQueries } from './tree.queries';
import type { PersonDraft } from './tree.types';

interface FakeClient {
  client: FamoraSupabaseClient;
  /** What insert() and update() were handed, in order. */
  sent: unknown[];
}

/**
 * Stands in for the PostgREST builder: every step of a chain answers with the same object, and the
 * object resolves on its own. Which steps a query walks is postgrest-js's business, not this test's.
 */
function fakeClient(response: unknown): FakeClient {
  const sent: unknown[] = [];
  const builder: Record<string, unknown> = {
    then: (resolve: (value: unknown) => void) => {
      resolve(response);
    },
  };
  const step = () => builder;
  const record = (values: unknown) => {
    sent.push(values);
    return builder;
  };

  Object.assign(builder, {
    select: step,
    eq: step,
    order: step,
    delete: step,
    single: step,
    maybeSingle: step,
    insert: record,
    update: record,
  });

  return { client: { from: () => builder } as unknown as FamoraSupabaseClient, sent };
}

function returning(data: unknown): FakeClient {
  return fakeClient({ data, error: null });
}

function queriesFor(client: FamoraSupabaseClient | null): TreeQueries {
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { client } }],
  });

  return TestBed.inject(TreeQueries);
}

function personRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'person-1',
    tree_id: 'tree-1',
    name: 'Anna Berger',
    birth_year: 1951,
    deceased: false,
    death_year: null,
    ...overrides,
  };
}

function relationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'edge-1',
    tree_id: 'tree-1',
    kind: 'parent',
    person_a: 'person-1',
    person_b: 'person-2',
    ...overrides,
  };
}

function draft(overrides: Partial<PersonDraft> = {}): PersonDraft {
  return { name: 'Anna Berger', birthYear: 1951, deceased: false, deathYear: null, ...overrides };
}

describe('TreeQueries reading', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('turns a person row into the shape the app works with', async () => {
    const result = await queriesFor(returning([personRow()]).client).listPersons('tree-1');
    if (!result.ok) throw new Error('the people did not load');

    expect(result.data).toEqual([
      {
        id: 'person-1',
        treeId: 'tree-1',
        name: 'Anna Berger',
        birthYear: 1951,
        deceased: false,
        deathYear: null,
      },
    ]);
  });

  it('drops an edge whose kind this version does not know, and draws the rest', async () => {
    const rows = [relationRow(), relationRow({ id: 'edge-2', kind: 'adopted' })];
    const result = await queriesFor(returning(rows).client).listRelations('tree-1');
    if (!result.ok) throw new Error('the edges did not load');

    expect(result.data.map((edge) => edge.id)).toEqual(['edge-1']);
  });

  it('drops a membership with a role it cannot judge, because no role means no permission', async () => {
    const rows = [
      { tree_id: 'tree-1', user_id: 'user-1', role: 'owner', created_at: '2026-09-01T10:00:00Z' },
      { tree_id: 'tree-1', user_id: 'user-2', role: 'auditor', created_at: '2026-09-02T10:00:00Z' },
    ];
    const result = await queriesFor(returning(rows).client).listMembers('tree-1');
    if (!result.ok) throw new Error('the members did not load');

    expect(result.data.map((member) => member.userId)).toEqual(['user-1']);
  });

  it('answers null rather than an error for a tree the caller may not see', async () => {
    const result = await queriesFor(returning(null).client).loadTree('someone-elses-tree');
    if (!result.ok) throw new Error('the tree query failed');

    expect(result.data).toBeNull();
  });

  it('reports a message instead of throwing when Supabase is not configured', async () => {
    const result = await queriesFor(null).listPersons('tree-1');

    expect(result.ok).toBe(false);
  });
});

describe('TreeQueries writing', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('trims the name and sends the columns the table expects', async () => {
    const fake = returning(personRow());
    await queriesFor(fake.client).createPerson('tree-1', draft({ name: '  Anna Berger  ' }));

    expect(fake.sent).toEqual([
      {
        tree_id: 'tree-1',
        name: 'Anna Berger',
        birth_year: 1951,
        deceased: false,
        death_year: null,
      },
    ]);
  });

  it('drops a death year that is no longer ticked, which the database would refuse', async () => {
    const fake = returning(personRow());
    await queriesFor(fake.client).updatePerson(
      'person-1',
      draft({ deceased: false, deathYear: 2019 }),
    );

    expect(fake.sent).toEqual([
      { name: 'Anna Berger', birth_year: 1951, deceased: false, death_year: null },
    ]);
  });

  it('leaves the name to the database default when none was given', async () => {
    const fake = returning({ id: 'tree-1', name: 'Stammbaum', root_person_id: null });
    await queriesFor(fake.client).createTree('   ');

    expect(fake.sent).toEqual([{}]);
  });

  it('sends the edge in the order the partner constraint demands', async () => {
    const fake = returning(relationRow({ kind: 'partner', person_a: 'a', person_b: 'b' }));
    await queriesFor(fake.client).createRelation('tree-1', {
      kind: 'partner',
      personA: 'a',
      personB: 'b',
    });

    expect(fake.sent).toEqual([
      { tree_id: 'tree-1', kind: 'partner', person_a: 'a', person_b: 'b' },
    ]);
  });
});
