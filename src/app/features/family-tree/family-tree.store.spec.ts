import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/features/auth/auth.service';
import { FamilyTreeStore } from './family-tree.store';
import { TreeQueries } from './tree.queries';
import type { FamilyTree, PersonDraft, TreeMember, TreePerson, TreeRelation } from './tree.types';

function tree(overrides: Partial<FamilyTree> = {}): FamilyTree {
  return { id: 'tree-1', name: 'Stammbaum', rootPersonId: 'person-1', ...overrides };
}

function person(overrides: Partial<TreePerson> = {}): TreePerson {
  return {
    id: 'person-1',
    treeId: 'tree-1',
    name: 'Anna Berger',
    birthYear: 1951,
    deceased: false,
    deathYear: null,
    ...overrides,
  };
}

function relation(overrides: Partial<TreeRelation> = {}): TreeRelation {
  return {
    id: 'edge-1',
    treeId: 'tree-1',
    kind: 'parent',
    personA: 'person-1',
    personB: 'person-2',
    ...overrides,
  };
}

function member(overrides: Partial<TreeMember> = {}): TreeMember {
  return {
    treeId: 'tree-1',
    userId: 'user-1',
    role: 'owner',
    createdAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

function draft(overrides: Partial<PersonDraft> = {}): PersonDraft {
  return { name: 'Bernd Berger', birthYear: 1949, deceased: false, deathYear: null, ...overrides };
}

interface Loaded {
  tree?: FamilyTree | null;
  persons?: TreePerson[];
  relations?: TreeRelation[];
  members?: TreeMember[];
}

function storeWith(loaded: Loaded = {}) {
  // 'tree' in loaded, not ??: the interesting case passes null on purpose, and ?? would eat it.
  const treeData = 'tree' in loaded ? loaded.tree : tree();
  const loadTree = vi.fn().mockResolvedValue({ ok: true, data: treeData });
  const listPersons = vi.fn().mockResolvedValue({ ok: true, data: loaded.persons ?? [person()] });
  const listRelations = vi.fn().mockResolvedValue({ ok: true, data: loaded.relations ?? [] });
  const listMembers = vi.fn().mockResolvedValue({ ok: true, data: loaded.members ?? [member()] });

  const createPerson = vi
    .fn()
    .mockImplementation((treeId: string, values: PersonDraft) =>
      Promise.resolve({ ok: true, data: person({ id: 'created-1', treeId, ...values }) }),
    );
  const createRelation = vi
    .fn()
    .mockImplementation((treeId: string, edge: Record<string, string>) =>
      Promise.resolve({ ok: true, data: relation({ id: 'created-edge', treeId, ...edge }) }),
    );

  const queries = {
    loadTree,
    listPersons,
    listRelations,
    listMembers,
    createPerson,
    createRelation,
    updatePerson: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    deletePerson: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    deleteRelation: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    setRootPerson: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    renameTree: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  };

  TestBed.configureTestingModule({
    providers: [
      FamilyTreeStore,
      { provide: TreeQueries, useValue: queries },
      { provide: AuthService, useValue: { user: () => ({ id: 'user-1' }) } },
    ],
  });

  return { store: TestBed.inject(FamilyTreeStore), queries };
}

async function openTree(store: FamilyTreeStore): Promise<void> {
  store.setTreeId('tree-1');
  TestBed.tick();

  await vi.waitFor(() => {
    if (store.status() === 'loading') throw new Error('the tree is still loading');
  });
}

describe('FamilyTreeStore loading', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('holds the tree, its people, its edges and its members once it is ready', async () => {
    const { store } = storeWith({ relations: [relation()] });
    await openTree(store);

    expect(store.status()).toBe('ready');
    expect(store.personCount()).toBe(1);
    expect(store.relations()).toHaveLength(1);
    expect(store.rootPerson()?.name).toBe('Anna Berger');
  });

  it('reports a tree the account may not see as missing, not as an error', async () => {
    const { store } = storeWith({ tree: null });
    await openTree(store);

    expect(store.status()).toBe('missing');
  });

  it('shows one message when a request fails, not one per request', async () => {
    const { store, queries } = storeWith();
    queries.listPersons.mockResolvedValue({ ok: false, message: 'Keine Verbindung.' });
    queries.listRelations.mockResolvedValue({ ok: false, message: 'Keine Verbindung.' });
    await openTree(store);

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Keine Verbindung.');
  });
});

describe('FamilyTreeStore permissions', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('reads the signed-in account out of the membership list', async () => {
    const { store } = storeWith();
    await openTree(store);

    expect(store.myRole()).toBe('owner');
    expect(store.canEdit()).toBe(true);
    expect(store.isOwner()).toBe(true);
  });

  it('lets a viewer look without offering them anything to change', async () => {
    const { store } = storeWith({ members: [member({ role: 'viewer' })] });
    await openTree(store);

    expect(store.canEdit()).toBe(false);
    expect(store.isOwner()).toBe(false);
  });
});

describe('FamilyTreeStore editing', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('makes the first person of an empty tree the one it opens on', async () => {
    const { store, queries } = storeWith({ tree: tree({ rootPersonId: null }), persons: [] });
    await openTree(store);

    await store.addPerson(draft());

    expect(queries.setRootPerson).toHaveBeenCalledWith('tree-1', 'created-1');
    expect(store.tree()?.rootPersonId).toBe('created-1');
  });

  it('leaves the opening person alone once the tree has one', async () => {
    const { store, queries } = storeWith();
    await openTree(store);

    await store.addPerson(draft());

    expect(queries.setRootPerson).not.toHaveBeenCalled();
    expect(store.tree()?.rootPersonId).toBe('person-1');
  });

  it('refuses a person without a name before asking the database', async () => {
    const { store, queries } = storeWith();
    await openTree(store);

    expect(await store.addPerson(draft({ name: '   ' }))).toBeNull();
    expect(queries.createPerson).not.toHaveBeenCalled();
  });

  it('adds a parent as one action, with the new person on the parent end', async () => {
    const { store, queries } = storeWith();
    await openTree(store);

    await store.addRelative('person-1', 'parent', draft());

    expect(queries.createRelation).toHaveBeenCalledWith('tree-1', {
      kind: 'parent',
      personA: 'created-1',
      personB: 'person-1',
    });
  });

  it('keeps the person when only the connection fails, rather than losing what was typed', async () => {
    const { store, queries } = storeWith();
    await openTree(store);
    queries.createRelation.mockResolvedValue({ ok: false, message: 'Keine Verbindung.' });

    expect(await store.addRelative('person-1', 'child', draft())).toBe(false);
    expect(store.persons().map((entry) => entry.id)).toContain('created-1');
  });

  it('drops the edges and the opening pointer along with a deleted person', async () => {
    const { store } = storeWith({ relations: [relation()] });
    await openTree(store);

    await store.removePerson('person-1');

    expect(store.persons()).toHaveLength(0);
    expect(store.relations()).toHaveLength(0);
    expect(store.tree()?.rootPersonId).toBeNull();
  });

  it('keeps what is on screen when a write fails, and says what went wrong', async () => {
    const { store, queries } = storeWith();
    await openTree(store);
    queries.deletePerson.mockResolvedValue({ ok: false, message: 'Keine Verbindung.' });

    expect(await store.removePerson('person-1')).toBe(false);
    expect(store.persons()).toHaveLength(1);
    expect(store.error()).toBe('Keine Verbindung.');
  });
});
