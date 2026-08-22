import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '@/environments/environment';
import type { Database } from './database.types';

export type FamoraSupabaseClient = SupabaseClient<Database>;

const NOT_CONFIGURED_HINT =
  'Supabase is not configured: SUPABASE_URL and SUPABASE_ANON_KEY are missing from .env.local.';

/**
 * The anon key is public — it ships inside the delivered JavaScript and is built for that. What an
 * account may read and change is decided solely by Row Level Security in the database, never by
 * this client. The service_role key must never appear here: it bypasses RLS.
 */
function createConfiguredClient(): FamoraSupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = environment;

  if (supabaseUrl.length === 0 || supabaseAnonKey.length === 0) {
    console.error(NOT_CONFIGURED_HINT);
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Missing configuration must not take the whole app down — the landing and legal pages need no
 * backend at all. The client therefore stays null instead of throwing, and each caller decides
 * for itself what to tell the user.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** null means: not configured. */
  readonly client: FamoraSupabaseClient | null = createConfiguredClient();
}
