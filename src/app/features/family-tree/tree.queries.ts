import { inject, Injectable } from '@angular/core';
import type { Database } from '@/app/lib/database.types';
import { SupabaseService } from '@/app/lib/supabase.service';
import { GENERIC_ERROR, runQuery, toVoidResult, type ApiResult } from '@/app/lib/supabase-query';
import {
  toRelationKind,
  toTreeRole,
  type FamilyTree,
  type PersonDraft,
  type RelationEdge,
  type TreeMember,
  type TreePerson,
  type TreeRelation,
} from './tree.types';

const TREE_COLUMNS = 'id, name, root_person_id';
const PERSON_COLUMNS = 'id, tree_id, name, birth_year, deceased, death_year';
const RELATION_COLUMNS = 'id, tree_id, kind, person_a, person_b';
const MEMBER_COLUMNS = 'tree_id, user_id, role, created_at';

type Tables = Database['public']['Tables'];

type TreeRow = Pick<Tables['family_trees']['Row'], 'id' | 'name' | 'root_person_id'>;

type PersonRow = Pick<
  Tables['tree_persons']['Row'],
  'id' | 'tree_id' | 'name' | 'birth_year' | 'deceased' | 'death_year'
>;

type RelationRow = Pick<
  Tables['tree_relations']['Row'],
  'id' | 'tree_id' | 'kind' | 'person_a' | 'person_b'
>;

type MemberRow = Pick<Tables['tree_members']['Row'], 'tree_id' | 'user_id' | 'role' | 'created_at'>;

function toTree(row: TreeRow): FamilyTree {
  return { id: row.id, name: row.name, rootPersonId: row.root_person_id };
}

function toPerson(row: PersonRow): TreePerson {
  return {
    id: row.id,
    treeId: row.tree_id,
    name: row.name,
    birthYear: row.birth_year,
    deceased: row.deceased,
    deathYear: row.death_year,
  };
}

/**
 * null for a row whose kind this version does not know. Adoption edges are planned as a third
 * value of the same column, and an older tab must draw the rest of the tree rather than nothing.
 */
function toRelation(row: RelationRow): TreeRelation | null {
  const kind = toRelationKind(row.kind);
  if (kind === null) return null;

  return { id: row.id, treeId: row.tree_id, kind, personA: row.person_a, personB: row.person_b };
}

/** null for an unknown role, and the caller drops the row: no role means no permission. */
function toMember(row: MemberRow): TreeMember | null {
  const role = toTreeRole(row.role);
  if (role === null) return null;

  return { treeId: row.tree_id, userId: row.user_id, role, createdAt: row.created_at };
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Trimmed on the way in, and a death year only survives while "deceased" is ticked. The database
 * refuses the other combination, and unticking a box should not turn into an error message.
 */
function toPersonColumns(draft: PersonDraft) {
  return {
    name: draft.name.trim(),
    birth_year: draft.birthYear,
    deceased: draft.deceased,
    death_year: draft.deceased ? draft.deathYear : null,
  };
}

function toRelationColumns(treeId: string, edge: RelationEdge) {
  return { tree_id: treeId, kind: edge.kind, person_a: edge.personA, person_b: edge.personB };
}

@Injectable({ providedIn: 'root' })
export class TreeQueries {
  private readonly supabase = inject(SupabaseService);

  /**
   * Every tree this account belongs to, in any role. Row Level Security answers the "belongs to"
   * part, so there is no user id in the query — the dashboard card asks nothing more than this.
   */
  async listMyTrees(): Promise<ApiResult<FamilyTree[]>> {
    const result = await runQuery<TreeRow[]>(this.supabase.client, (client) =>
      client.from('family_trees').select(TREE_COLUMNS).order('created_at', { ascending: true }),
    );

    return result.ok ? { ok: true, data: result.data.map(toTree) } : result;
  }

  /**
   * maybeSingle, not single: a tree id belonging to somebody else returns no row rather than an
   * error, and "no row" is the answer the page needs in order to send the visitor elsewhere.
   */
  async loadTree(treeId: string): Promise<ApiResult<FamilyTree | null>> {
    const result = await runQuery<TreeRow | null>(this.supabase.client, (client) =>
      client.from('family_trees').select(TREE_COLUMNS).eq('id', treeId).maybeSingle(),
    );
    if (!result.ok) return result;

    return { ok: true, data: result.data === null ? null : toTree(result.data) };
  }

  /**
   * One insert is the whole thing: the trigger in family-tree.sql §7 hands the caller ownership in
   * the same statement, so there is no second write that could fail and leave a tree without one.
   */
  async createTree(name: string): Promise<ApiResult<FamilyTree>> {
    const trimmed = name.trim();
    const result = await runQuery<TreeRow | null>(this.supabase.client, (client) =>
      client
        .from('family_trees')
        .insert(trimmed === '' ? {} : { name: trimmed })
        .select(TREE_COLUMNS)
        .single(),
    );
    if (!result.ok) return result;
    if (result.data === null) return { ok: false, message: GENERIC_ERROR };

    return { ok: true, data: toTree(result.data) };
  }

  async renameTree(treeId: string, name: string): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('family_trees').update({ name: name.trim() }).eq('id', treeId),
    );

    return toVoidResult(result);
  }

  /** The database clears this pointer on its own when the person is deleted — see §7. */
  async setRootPerson(treeId: string, personId: string | null): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('family_trees').update({ root_person_id: personId }).eq('id', treeId),
    );

    return toVoidResult(result);
  }

  /** By name, because that is the order the visually hidden list for screen readers needs. */
  async listPersons(treeId: string): Promise<ApiResult<TreePerson[]>> {
    const result = await runQuery<PersonRow[]>(this.supabase.client, (client) =>
      client
        .from('tree_persons')
        .select(PERSON_COLUMNS)
        .eq('tree_id', treeId)
        .order('name', { ascending: true }),
    );

    return result.ok ? { ok: true, data: result.data.map(toPerson) } : result;
  }

  async createPerson(treeId: string, draft: PersonDraft): Promise<ApiResult<TreePerson>> {
    const result = await runQuery<PersonRow | null>(this.supabase.client, (client) =>
      client
        .from('tree_persons')
        .insert({ tree_id: treeId, ...toPersonColumns(draft) })
        .select(PERSON_COLUMNS)
        .single(),
    );
    if (!result.ok) return result;
    if (result.data === null) return { ok: false, message: GENERIC_ERROR };

    return { ok: true, data: toPerson(result.data) };
  }

  async updatePerson(id: string, draft: PersonDraft): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('tree_persons').update(toPersonColumns(draft)).eq('id', id),
    );

    return toVoidResult(result);
  }

  /** The edges go with them: both foreign keys in tree_relations cascade. */
  async deletePerson(id: string): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('tree_persons').delete().eq('id', id),
    );

    return toVoidResult(result);
  }

  async listRelations(treeId: string): Promise<ApiResult<TreeRelation[]>> {
    const result = await runQuery<RelationRow[]>(this.supabase.client, (client) =>
      client.from('tree_relations').select(RELATION_COLUMNS).eq('tree_id', treeId),
    );

    return result.ok ? { ok: true, data: result.data.map(toRelation).filter(isPresent) } : result;
  }

  /**
   * The edge arrives already in the order the table wants — toRelationEdge() in tree.types.ts is
   * the single place that decides it, so no caller can get the partner ordering wrong.
   */
  async createRelation(treeId: string, edge: RelationEdge): Promise<ApiResult<TreeRelation>> {
    const result = await runQuery<RelationRow | null>(this.supabase.client, (client) =>
      client
        .from('tree_relations')
        .insert(toRelationColumns(treeId, edge))
        .select(RELATION_COLUMNS)
        .single(),
    );
    if (!result.ok) return result;

    const relation = result.data === null ? null : toRelation(result.data);

    return relation === null ? { ok: false, message: GENERIC_ERROR } : { ok: true, data: relation };
  }

  async deleteRelation(id: string): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('tree_relations').delete().eq('id', id),
    );

    return toVoidResult(result);
  }

  /**
   * Everyone in a tree may read who else is in it. The page needs this to know what the visitor
   * is allowed to do; inviting and removing people arrives with the sharing screen.
   */
  async listMembers(treeId: string): Promise<ApiResult<TreeMember[]>> {
    const result = await runQuery<MemberRow[]>(this.supabase.client, (client) =>
      client
        .from('tree_members')
        .select(MEMBER_COLUMNS)
        .eq('tree_id', treeId)
        .order('created_at', { ascending: true }),
    );

    return result.ok ? { ok: true, data: result.data.map(toMember).filter(isPresent) } : result;
  }
}
