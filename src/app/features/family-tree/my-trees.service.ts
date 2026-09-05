import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@/app/features/auth/auth.service';
import { assignGenerations, groupByGeneration } from './tree.generations';
import { TreeQueries } from './tree.queries';
import type { FamilyTree, TreePerson, TreeRelation } from './tree.types';

export type MyTreesStatus = 'loading' | 'ready' | 'error';

/** What the card in the folder says about the tree, without opening it. */
export interface TreeSummary {
  personCount: number;
  generationCount: number;
}

/**
 * Whether this account has a family tree at all, and the one line the folder card shows about it.
 *
 * Root-scoped on purpose. A tree belongs to the account, not to a folder, and somebody with three
 * folders sees the same tree card in each — asking again on every folder page would be three
 * identical requests for an answer that has not changed. DashboardStore deliberately knows only
 * about one folder and must not learn about account-wide objects.
 */
@Injectable({ providedIn: 'root' })
export class MyTreesService {
  private readonly queries = inject(TreeQueries);
  private readonly auth = inject(AuthService);

  private readonly treesState = signal<FamilyTree[]>([]);
  private readonly summaryState = signal<TreeSummary | null>(null);
  private readonly statusState = signal<MyTreesStatus>('loading');
  private readonly errorState = signal<string | undefined>(undefined);
  private readonly isCreatingState = signal(false);

  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isCreating = this.isCreatingState.asReadonly();
  /** null until the summary has been counted, and for an account with no tree. */
  readonly summary = this.summaryState.asReadonly();

  /** The tree the folder card opens. One per account for now; the schema allows more. */
  readonly firstTree = computed(() => this.treesState()[0] ?? null);
  readonly hasTree = computed(() => this.treesState().length > 0);

  constructor() {
    effect(() => {
      this.followSession();
    });
  }

  /**
   * One insert and the tree exists, owned by the caller. No name is asked for up front: a form
   * standing between somebody and the thing they wanted is a form nobody fills in.
   */
  async createFirstTree(): Promise<FamilyTree | null> {
    this.errorState.set(undefined);
    this.isCreatingState.set(true);

    const result = await this.queries.createTree(defaultTreeName(this.auth.firstName()));
    this.isCreatingState.set(false);

    if (!result.ok) {
      this.errorState.set(result.message);
      return null;
    }

    this.treesState.update((current) => [...current, result.data]);

    return result.data;
  }

  /** Called after leaving the tree page, so the folder card does not show a stale count. */
  refresh(): void {
    void this.load();
  }

  private followSession(): void {
    const status = this.auth.status();

    if (status === 'signed-out') {
      this.forget();
      return;
    }
    if (status === 'loading') return;

    void this.load();
  }

  private forget(): void {
    this.treesState.set([]);
    this.summaryState.set(null);
    this.statusState.set('ready');
  }

  private async load(): Promise<void> {
    const result = await this.queries.listMyTrees();

    if (!result.ok) {
      this.errorState.set(result.message);
      this.statusState.set('error');
      return;
    }

    this.treesState.set(result.data);
    this.statusState.set('ready');
    await this.countContents(result.data[0] ?? null);
  }

  /**
   * The card promises "14 Personen, 4 Generationen", and the generation count needs the edges as
   * well as the people. Both tables hold tens of rows, and this runs once per session rather than
   * once per folder — the alternative is a card that says nothing until the tree is opened.
   */
  private async countContents(tree: FamilyTree | null): Promise<void> {
    if (tree === null) {
      this.summaryState.set(null);
      return;
    }

    const [persons, relations] = await Promise.all([
      this.queries.listPersons(tree.id),
      this.queries.listRelations(tree.id),
    ]);
    if (!persons.ok || !relations.ok) return;

    this.summaryState.set(summarise(persons.data, relations.data, tree.rootPersonId));
  }
}

function summarise(
  persons: TreePerson[],
  relations: TreeRelation[],
  rootPersonId: string | null,
): TreeSummary {
  const generations = assignGenerations(persons, relations, rootPersonId);

  return {
    personCount: persons.length,
    generationCount: groupByGeneration(persons, generations).length,
  };
}

/** "Stammbaum von Anna" beats the bare default, and the name can be changed later either way. */
function defaultTreeName(firstName: string): string {
  return firstName.trim() === '' ? '' : `Stammbaum von ${firstName.trim()}`;
}
