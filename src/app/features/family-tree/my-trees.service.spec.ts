import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/features/auth/auth.service';
import { MyTreesService } from './my-trees.service';
import { TreeQueries } from './tree.queries';
import type { FamilyTree, TreePerson, TreeRelation } from './tree.types';

function tree(overrides: Partial<FamilyTree> = {}): FamilyTree {
  return { id: 'tree-1', name: 'Stammbaum', rootPersonId: 'anna', ...overrides };
}

function people(...names: string[]): TreePerson[] {
  return names.map((name) => ({
    id: name,
    treeId: 'tree-1',
    name,
    birthYear: null,
    deceased: false,
    deathYear: null,
  }));
}

function parentOf(parent: string, child: string): TreeRelation {
  return {
    id: `${parent}>${child}`,
    treeId: 'tree-1',
    kind: 'parent',
    personA: parent,
    personB: child,
  };
}

interface Loaded {
  trees?: FamilyTree[];
  persons?: TreePerson[];
  relations?: TreeRelation[];
}

function serviceWith(loaded: Loaded = {}) {
  const status = signal<'loading' | 'signed-in' | 'signed-out'>('signed-in');
  const queries = {
    listMyTrees: vi.fn().mockResolvedValue({ ok: true, data: loaded.trees ?? [tree()] }),
    listPersons: vi.fn().mockResolvedValue({ ok: true, data: loaded.persons ?? people('anna') }),
    listRelations: vi.fn().mockResolvedValue({ ok: true, data: loaded.relations ?? [] }),
    createTree: vi
      .fn()
      .mockImplementation((name: string) =>
        Promise.resolve({ ok: true, data: tree({ id: 'created-1', name, rootPersonId: null }) }),
      ),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: TreeQueries, useValue: queries },
      { provide: AuthService, useValue: { status, firstName: () => 'Anna' } },
    ],
  });

  return { service: TestBed.inject(MyTreesService), queries, status };
}

async function settle(service: MyTreesService): Promise<void> {
  TestBed.tick();

  await vi.waitFor(() => {
    if (service.status() === 'loading') throw new Error('still loading');
  });
}

describe('MyTreesService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('counts what is in the tree, so the folder card can say it without opening it', async () => {
    const { service } = serviceWith({
      persons: people('anna', 'bernd', 'carl'),
      relations: [parentOf('anna', 'carl'), parentOf('bernd', 'carl')],
    });
    await settle(service);

    expect(service.hasTree()).toBe(true);
    expect(service.summary()).toEqual({ personCount: 3, generationCount: 2 });
  });

  it('asks for nothing beyond the list when the account has no tree yet', async () => {
    const { service, queries } = serviceWith({ trees: [] });
    await settle(service);

    expect(service.hasTree()).toBe(false);
    expect(service.summary()).toBeNull();
    expect(queries.listPersons).not.toHaveBeenCalled();
  });

  it('names a new tree after the person creating it, rather than asking them first', async () => {
    const { service, queries } = serviceWith({ trees: [] });
    await settle(service);

    const created = await service.createFirstTree();

    expect(queries.createTree).toHaveBeenCalledWith('Stammbaum von Anna');
    expect(created?.id).toBe('created-1');
    expect(service.hasTree()).toBe(true);
  });

  it('reports a failed create instead of navigating nowhere', async () => {
    const { service, queries } = serviceWith({ trees: [] });
    await settle(service);
    queries.createTree.mockResolvedValue({ ok: false, message: 'Keine Verbindung.' });

    expect(await service.createFirstTree()).toBeNull();
    expect(service.error()).toBe('Keine Verbindung.');
  });

  it('forgets the tree when the session ends, so the next account sees nothing of it', async () => {
    const { service, status } = serviceWith();
    await settle(service);

    status.set('signed-out');
    TestBed.tick();

    expect(service.hasTree()).toBe(false);
    expect(service.summary()).toBeNull();
  });

  it('waits rather than asking while the session is still unknown', () => {
    const { service, queries, status } = serviceWith();
    status.set('loading');
    TestBed.tick();

    expect(queries.listMyTrees).not.toHaveBeenCalled();
    expect(service.status()).toBe('loading');
  });
});
