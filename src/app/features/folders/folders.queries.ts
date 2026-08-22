import { inject, Injectable } from '@angular/core';
import type { Database, Json } from '@/app/lib/database.types';
import { SupabaseService } from '@/app/lib/supabase.service';
import { GENERIC_ERROR, runQuery, toVoidResult, type ApiResult } from '@/app/lib/supabase-query';
import type { Helper } from '@/app/features/dashboard/dashboard.types';
import type { OnboardingAnswers } from '@/app/features/onboarding/onboarding.types';
import type { Folder, FolderProgress } from './folder.types';

const COLUMNS = 'id, answers, completed_task_ids, helpers, assignments, created_at';

type FolderRow = Pick<
  Database['public']['Tables']['folders']['Row'],
  'id' | 'answers' | 'completed_task_ids' | 'helpers' | 'assignments' | 'created_at'
>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isHelper(value: unknown): value is Helper {
  return (
    isPlainObject(value) && typeof value['id'] === 'string' && typeof value['name'] === 'string'
  );
}

function toHelpers(value: unknown): Helper[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isHelper);
}

/**
 * Helper is an interface and therefore not structurally a Json object as far as TypeScript is
 * concerned — interfaces carry no index signature. Rebuilding the objects on the way out keeps
 * the domain type a clean interface instead of casting at the call site.
 */
function helpersToJson(helpers: Helper[]): Json {
  return helpers.map((helper) => ({ id: helper.id, name: helper.name }));
}

function toAnswers(value: unknown): OnboardingAnswers {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => isStringArray(entry)),
  ) as OnboardingAnswers;
}

function toAssignments(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === 'string'),
  ) as Record<string, string>;
}

/**
 * The columns are jsonb — the database does not check their contents. A record written by an
 * older version must not take the overview down, so this validates instead of casting blindly.
 */
function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    answers: toAnswers(row.answers),
    completedTaskIds: isStringArray(row.completed_task_ids) ? row.completed_task_ids : null,
    helpers: toHelpers(row.helpers),
    assignments: toAssignments(row.assignments),
    createdAt: row.created_at,
  };
}

@Injectable({ providedIn: 'root' })
export class FoldersQueries {
  private readonly supabase = inject(SupabaseService);

  async listFolders(): Promise<ApiResult<Folder[]>> {
    // Oldest first: the order in the menu should not shift as soon as a folder is added.
    const result = await runQuery<FolderRow[]>(this.supabase.client, (client) =>
      client.from('folders').select(COLUMNS).order('created_at', { ascending: true }),
    );

    return result.ok ? { ok: true, data: result.data.map(toFolder) } : result;
  }

  /** null means: there is no folder with this id for this account. */
  async loadFolder(id: string): Promise<ApiResult<Folder | null>> {
    // maybeSingle instead of single: "does not exist" is a valid answer here, not an error.
    // Row Level Security never returns someone else's folder in the first place.
    const result = await runQuery<FolderRow | null>(this.supabase.client, (client) =>
      client.from('folders').select(COLUMNS).eq('id', id).maybeSingle(),
    );
    if (!result.ok) return result;

    return { ok: true, data: result.data === null ? null : toFolder(result.data) };
  }

  async createFolder(answers: OnboardingAnswers): Promise<ApiResult<Folder>> {
    // user_id comes from the column's auth.uid() default.
    const result = await runQuery<FolderRow | null>(this.supabase.client, (client) =>
      client.from('folders').insert({ answers }).select(COLUMNS).single(),
    );
    if (!result.ok) return result;

    // single() reports an error rather than no row; the null exists only in the type.
    if (result.data === null) return { ok: false, message: GENERIC_ERROR };

    return { ok: true, data: toFolder(result.data) };
  }

  /**
   * After a repeated onboarding. Progress resets to null in the process: the completed tasks
   * belong to the old answers and no longer match the new list.
   */
  async updateFolderAnswers(id: string, answers: OnboardingAnswers): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('folders').update({ answers, completed_task_ids: null }).eq('id', id),
    );

    return toVoidResult(result);
  }

  async saveFolderProgress(id: string, progress: FolderProgress): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client
        .from('folders')
        .update({
          completed_task_ids: progress.completedTaskIds,
          helpers: helpersToJson(progress.helpers),
          assignments: progress.assignments,
        })
        .eq('id', id),
    );

    return toVoidResult(result);
  }

  async deleteFolder(id: string): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('folders').delete().eq('id', id),
    );

    return toVoidResult(result);
  }
}
