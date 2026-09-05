import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@/app/features/auth/auth.service';
import { GENERIC_ERROR, type ApiResult } from '@/app/lib/supabase-query';
import { TreeQueries } from './tree.queries';
import {
  toRelationEdge,
  type FamilyTree,
  type PersonDraft,
  type RelativeKind,
  type TreeMember,
  type TreePerson,
  type TreeRelation,
  type TreeRole,
} from './tree.types';

/** missing: the id belongs to no tree this account may see — deleted, or somebody else's. */
export type FamilyTreeStatus = 'loading' | 'ready' | 'missing' | 'error';

/**
 * One family tree: its people, the edges between them, and who may change what.
 *
 * Writes every change on its own rather than saving the whole tree, for the same reason as
 * EntriesStore: several people share this data, and rewriting everything on each edit would let
 * one open tab quietly undo what another just did.
 *
 * Provided by the page, not in root — the state belongs to one tree. Whether this account has a
 * tree at all is an account-wide question and lives in MyTreesService instead.
 */
@Injectable()
export class FamilyTreeStore {
  private readonly queries = inject(TreeQueries);
  private readonly auth = inject(AuthService);

  /** null until the page reports the tree. Nothing is loaded before that. */
  private readonly treeIdState = signal<string | null>(null);
  private readonly treeState = signal<FamilyTree | null>(null);
  private readonly personsState = signal<TreePerson[]>([]);
  private readonly relationsState = signal<TreeRelation[]>([]);
  private readonly membersState = signal<TreeMember[]>([]);
  private readonly statusState = signal<FamilyTreeStatus>('loading');
  private readonly errorState = signal<string | undefined>(undefined);
  private readonly isSavingState = signal(false);

  readonly tree = this.treeState.asReadonly();
  readonly persons = this.personsState.asReadonly();
  readonly relations = this.relationsState.asReadonly();
  readonly members = this.membersState.asReadonly();
  readonly status = this.statusState.asReadonly();
  /** Set after a failed read or write. The screen keeps what it has and says what went wrong. */
  readonly error = this.errorState.asReadonly();
  readonly isSaving = this.isSavingState.asReadonly();

  /** null while loading, and for anybody who is not a member of this tree. */
  readonly myRole = computed((): TreeRole | null => {
    const userId = this.auth.user()?.id;
    if (userId === undefined) return null;

    return this.membersState().find((member) => member.userId === userId)?.role ?? null;
  });

  readonly canEdit = computed(() => this.myRole() === 'owner' || this.myRole() === 'editor');
  readonly isOwner = computed(() => this.myRole() === 'owner');
  readonly personCount = computed(() => this.personsState().length);
  readonly isEmpty = computed(() => this.personsState().length === 0);

  /** The person the tree opens on. null in a tree that has none yet, which the canvas handles. */
  readonly rootPerson = computed((): TreePerson | null => {
    const rootId = this.treeState()?.rootPersonId;
    if (rootId === undefined || rootId === null) return null;

    return this.personsState().find((person) => person.id === rootId) ?? null;
  });

  constructor() {
    effect((onCleanup) => {
      this.startLoading(onCleanup);
    });
  }

  setTreeId(treeId: string): void {
    this.treeIdState.set(treeId);
  }

  /** The first person in an empty tree becomes the one it opens on. */
  async addPerson(draft: PersonDraft): Promise<TreePerson | null> {
    const treeId = this.treeIdState();
    if (treeId === null || draft.name.trim() === '') return null;

    const result = await this.write(() => this.queries.createPerson(treeId, draft));
    if (!result.ok) return null;

    this.personsState.update((current) => [...current, result.data]);
    await this.adoptAsRootIfFirst(result.data);

    return result.data;
  }

  /**
   * A person and their connection in one action, because "add a mother" is one thought. If the
   * edge fails, the person stays: unattached in the tree is far better than losing what somebody
   * typed, and the panel can offer the connection again.
   */
  async addRelative(anchorId: string, kind: RelativeKind, draft: PersonDraft): Promise<boolean> {
    const person = await this.addPerson(draft);
    if (person === null) return false;

    return this.connect(anchorId, kind, person.id);
  }

  /** Connects two people who are both already in the tree. */
  async connect(anchorId: string, kind: RelativeKind, relativeId: string): Promise<boolean> {
    const treeId = this.treeIdState();
    if (treeId === null) return false;

    const edge = toRelationEdge(kind, anchorId, relativeId);
    const result = await this.write(() => this.queries.createRelation(treeId, edge));
    if (!result.ok) return false;

    this.relationsState.update((current) => [...current, result.data]);

    return true;
  }

  async updatePerson(id: string, draft: PersonDraft): Promise<boolean> {
    if (draft.name.trim() === '') return false;

    const result = await this.write(() => this.queries.updatePerson(id, draft));
    if (!result.ok) return false;

    this.personsState.update((current) =>
      current.map((person) => (person.id === id ? { ...person, ...normalised(draft) } : person)),
    );

    return true;
  }

  /** The database takes their edges and the root pointer with them; the local copy has to match. */
  async removePerson(id: string): Promise<boolean> {
    const result = await this.write(() => this.queries.deletePerson(id));
    if (!result.ok) return false;

    this.personsState.update((current) => current.filter((person) => person.id !== id));
    this.relationsState.update((current) => current.filter((edge) => !touches(edge, id)));
    this.treeState.update((tree) => withoutRoot(tree, id));

    return true;
  }

  async removeRelation(id: string): Promise<boolean> {
    const result = await this.write(() => this.queries.deleteRelation(id));
    if (!result.ok) return false;

    this.relationsState.update((current) => current.filter((edge) => edge.id !== id));

    return true;
  }

  async rename(name: string): Promise<boolean> {
    const tree = this.treeState();
    if (tree === null || name.trim() === '') return false;

    const result = await this.write(() => this.queries.renameTree(tree.id, name));
    if (!result.ok) return false;

    this.treeState.set({ ...tree, name: name.trim() });

    return true;
  }

  async setRootPerson(personId: string): Promise<boolean> {
    const tree = this.treeState();
    if (tree === null) return false;

    const result = await this.write(() => this.queries.setRootPerson(tree.id, personId));
    if (!result.ok) return false;

    this.treeState.set({ ...tree, rootPersonId: personId });

    return true;
  }

  /**
   * Silent when it fails: the person is saved either way, and a tree whose opening person is not
   * set yet still draws. Nagging about it would be a message about nothing the user did.
   */
  private async adoptAsRootIfFirst(person: TreePerson): Promise<void> {
    const tree = this.treeState();
    if (tree === null || tree.rootPersonId !== null) return;

    const result = await this.queries.setRootPerson(tree.id, person.id);
    if (!result.ok) return;

    this.treeState.set({ ...tree, rootPersonId: person.id });
  }

  /** Shared around every write: the busy flag and the error message behave the same each time. */
  private async write<T>(operation: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    this.errorState.set(undefined);
    this.isSavingState.set(true);

    const result = await operation();
    this.isSavingState.set(false);

    if (!result.ok) this.errorState.set(result.message);

    return result;
  }

  private startLoading(onCleanup: (fn: () => void) => void): void {
    const treeId = this.treeIdState();
    if (treeId === null) return;

    this.statusState.set('loading');

    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });

    void this.loadEverything(treeId, () => cancelled);
  }

  /**
   * Four requests at once rather than one after another: none of them depends on another's answer,
   * and a tree the caller may not see returns an empty list from all three content queries anyway.
   */
  private async loadEverything(treeId: string, isCancelled: () => boolean): Promise<void> {
    const loaded = await Promise.all([
      this.queries.loadTree(treeId),
      this.queries.listPersons(treeId),
      this.queries.listRelations(treeId),
      this.queries.listMembers(treeId),
    ]);
    if (isCancelled()) return;

    this.applyLoaded(loaded);
  }

  private applyLoaded(loaded: LoadedTree): void {
    const [tree, persons, relations, members] = loaded;

    if (!tree.ok || !persons.ok || !relations.ok || !members.ok) {
      this.failWith(firstFailure(loaded));
      return;
    }
    if (tree.data === null) {
      this.statusState.set('missing');
      return;
    }

    this.applyTree(tree.data, persons.data, relations.data, members.data);
  }

  private applyTree(
    tree: FamilyTree,
    persons: TreePerson[],
    relations: TreeRelation[],
    members: TreeMember[],
  ): void {
    this.treeState.set(tree);
    this.personsState.set(persons);
    this.relationsState.set(relations);
    this.membersState.set(members);
    this.statusState.set('ready');
  }

  private failWith(message: string): void {
    this.errorState.set(message);
    this.statusState.set('error');
  }
}

/** What one load brings back, in the order loadEverything asks for it. */
type LoadedTree = [
  ApiResult<FamilyTree | null>,
  ApiResult<TreePerson[]>,
  ApiResult<TreeRelation[]>,
  ApiResult<TreeMember[]>,
];

/**
 * The message from the first request that failed. Four requests fail for one reason — a dead
 * connection, a missing table — so the screen shows one message, not a stack of identical ones.
 */
function firstFailure(results: ApiResult<unknown>[]): string {
  const failed = results.find((result) => !result.ok);

  return failed === undefined || failed.ok ? GENERIC_ERROR : failed.message;
}

/** The database trims on write; the local copy has to match, or the two drift until a reload. */
function normalised(draft: PersonDraft): PersonDraft {
  return {
    name: draft.name.trim(),
    birthYear: draft.birthYear,
    deceased: draft.deceased,
    deathYear: draft.deceased ? draft.deathYear : null,
  };
}

function touches(relation: TreeRelation, personId: string): boolean {
  return relation.personA === personId || relation.personB === personId;
}

/** Mirrors the trigger that clears the pointer when the person it names is deleted. */
function withoutRoot(tree: FamilyTree | null, personId: string): FamilyTree | null {
  if (tree === null || tree.rootPersonId !== personId) return tree;

  return { ...tree, rootPersonId: null };
}
