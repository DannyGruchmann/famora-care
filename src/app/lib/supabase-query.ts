import type { PostgrestError } from '@supabase/supabase-js';
import type { FamoraSupabaseClient } from './supabase.service';

export const GENERIC_ERROR =
  'Das hat gerade nicht geklappt. Bitte versuchen Sie es in einem Moment noch einmal.';
export const OFFLINE_ERROR = 'Keine Verbindung. Ihre letzte Änderung ist noch nicht gespeichert.';

/** Either it worked and there is data, or it did not and there is something to show the user. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * The shape every PostgREST call resolves to. Kept as an explicit union so that `error !== null`
 * still narrows `data` for the caller.
 */
export type QueryResponse<T> = { data: T; error: null } | { data: null; error: PostgrestError };

/**
 * A missing table is not the user's fault but an unapplied migration. They still only get the
 * generic message — the hint about what to do belongs in the developer's console.
 */
export function toMessage(error: PostgrestError): string {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    console.error(
      'Eine Tabelle fehlt. Bitte die Dateien in supabase/ im Supabase SQL Editor ausführen.',
      error,
    );
  } else {
    console.error(error);
  }

  return GENERIC_ERROR;
}

/**
 * The part every query shares: no client means the app is misconfigured, a PostgREST error gets
 * translated, and a thrown one means the request never left the device.
 *
 * Callers name T rather than letting it be inferred: PostgREST's response is a union of a success
 * and a failure branch, and inference would merge the failing branch's `null` into it.
 */
export async function runQuery<T>(
  client: FamoraSupabaseClient | null,
  query: (client: FamoraSupabaseClient) => PromiseLike<QueryResponse<T>>,
): Promise<ApiResult<T>> {
  if (client === null) return { ok: false, message: GENERIC_ERROR };

  try {
    const { data, error } = await query(client);
    if (error !== null) return { ok: false, message: toMessage(error) };

    return { ok: true, data };
  } catch {
    return { ok: false, message: OFFLINE_ERROR };
  }
}

/** Update and delete answer with data: null — their callers only care whether it worked. */
export function toVoidResult(result: ApiResult<unknown>): ApiResult<void> {
  return result.ok ? { ok: true, data: undefined } : result;
}
