import { inject, Injectable } from '@angular/core';
import type { Database } from '@/app/lib/database.types';
import { SupabaseService } from '@/app/lib/supabase.service';
import { GENERIC_ERROR, runQuery, toVoidResult, type ApiResult } from '@/app/lib/supabase-query';
import { toEntryKind } from './entry.kinds';
import type { EntryDraft, EntryKind, FolderEntry } from './entry.types';

const COLUMNS = 'id, folder_id, kind, title, detail, reference, contact, sort_order';

type EntryRow = Pick<
  Database['public']['Tables']['folder_entries']['Row'],
  'id' | 'folder_id' | 'kind' | 'title' | 'detail' | 'reference' | 'contact' | 'sort_order'
>;

type KindRow = Pick<Database['public']['Tables']['folder_entries']['Row'], 'folder_id' | 'kind'>;

/** A Set per folder while collecting: one entry per section is enough to call it filled. */
function groupKindsByFolder(rows: KindRow[]): Map<string, EntryKind[]> {
  const collected = new Map<string, Set<EntryKind>>();

  for (const row of rows) {
    const kind = toEntryKind(row.kind);
    if (kind === null) continue;

    const known = collected.get(row.folder_id) ?? new Set<EntryKind>();
    known.add(kind);
    collected.set(row.folder_id, known);
  }

  return new Map([...collected].map(([folderId, kinds]) => [folderId, [...kinds]]));
}

/**
 * null for a row whose kind the app does not know — a section removed in a later version must not
 * take the whole folder down. The caller drops those rows.
 */
function toEntry(row: EntryRow): FolderEntry | null {
  const kind = toEntryKind(row.kind);
  if (kind === null) return null;

  return {
    id: row.id,
    folderId: row.folder_id,
    kind,
    title: row.title,
    detail: row.detail,
    reference: row.reference,
    contact: row.contact,
    sortOrder: row.sort_order,
  };
}

function isEntry(entry: FolderEntry | null): entry is FolderEntry {
  return entry !== null;
}

/** Trimmed on the way in, so a stray space never becomes a stored value. */
function toColumns(draft: EntryDraft) {
  return {
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    reference: draft.reference.trim(),
    contact: draft.contact.trim(),
  };
}

@Injectable({ providedIn: 'root' })
export class EntriesQueries {
  private readonly supabase = inject(SupabaseService);

  async listEntries(folderId: string): Promise<ApiResult<FolderEntry[]>> {
    // Exactly the question the index answers: one folder, by section, in the owner's order.
    const result = await runQuery<EntryRow[]>(this.supabase.client, (client) =>
      client
        .from('folder_entries')
        .select(COLUMNS)
        .eq('folder_id', folderId)
        .order('kind', { ascending: true })
        .order('sort_order', { ascending: true }),
    );

    return result.ok ? { ok: true, data: result.data.map(toEntry).filter(isEntry) } : result;
  }

  /**
   * Which sections already hold an entry, for every folder of the account at once. The overview
   * needs this for all folders and would otherwise fire one request per folder; Row Level Security
   * keeps the answer to the caller's own entries either way.
   */
  async listFilledKinds(): Promise<ApiResult<Map<string, EntryKind[]>>> {
    const result = await runQuery<KindRow[]>(this.supabase.client, (client) =>
      client.from('folder_entries').select('folder_id, kind'),
    );

    return result.ok ? { ok: true, data: groupKindsByFolder(result.data) } : result;
  }

  async createEntry(
    folderId: string,
    kind: EntryKind,
    draft: EntryDraft,
    sortOrder: number,
  ): Promise<ApiResult<FolderEntry>> {
    const result = await runQuery<EntryRow | null>(this.supabase.client, (client) =>
      client
        .from('folder_entries')
        .insert({ folder_id: folderId, kind, sort_order: sortOrder, ...toColumns(draft) })
        .select(COLUMNS)
        .single(),
    );
    if (!result.ok) return result;

    const entry = result.data === null ? null : toEntry(result.data);
    if (entry === null) return { ok: false, message: GENERIC_ERROR };

    return { ok: true, data: entry };
  }

  async updateEntry(id: string, draft: EntryDraft): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('folder_entries').update(toColumns(draft)).eq('id', id),
    );

    return toVoidResult(result);
  }

  async deleteEntry(id: string): Promise<ApiResult<void>> {
    const result = await runQuery<null>(this.supabase.client, (client) =>
      client.from('folder_entries').delete().eq('id', id),
    );

    return toVoidResult(result);
  }
}
