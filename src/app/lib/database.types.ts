/**
 * Shape of the Supabase schema, mirroring supabase/schema.sql in the reference project.
 *
 * Written with `type` instead of `interface` on purpose, against the usual project rule:
 * postgrest-js constrains every table to Record<string, unknown>, and an interface is not
 * assignable to that — declaration merging means TypeScript cannot guarantee the index signature.
 * With interfaces here, every query silently resolves to `never`. `supabase gen types` emits
 * type aliases for the same reason.
 *
 * The jsonb columns are typed as Json because that is all Postgres guarantees — the database does
 * not validate their contents. Turning them into the app's own shapes is the job of toFolder() in
 * folders.queries.ts, which validates at runtime instead of blindly casting.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type FoldersRow = {
  id: string;
  user_id: string;
  answers: Json;
  /** null means "never saved" — see the column comment in schema.sql. */
  completed_task_ids: Json | null;
  helpers: Json;
  assignments: Json;
  created_at: string;
  updated_at: string;
};

/** Every column either has a default or is generated, so all of them are optional on write. */
type FoldersWrite = Partial<FoldersRow>;

type FolderEntriesRow = {
  id: string;
  folder_id: string;
  /** Constrained to five values by folder_entries_kind_check — see supabase/folder-entries.sql. */
  kind: string;
  title: string;
  detail: string;
  /** Location, policy number or user name, depending on the kind. Never a password. */
  reference: string;
  contact: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** folder_id and title have no default, but Partial keeps update calls free of dummy values. */
type FolderEntriesWrite = Partial<FolderEntriesRow>;

export type Database = {
  public: {
    Tables: {
      folders: {
        Row: FoldersRow;
        Insert: FoldersWrite;
        Update: FoldersWrite;
        Relationships: [
          {
            foreignKeyName: 'folders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      folder_entries: {
        Row: FolderEntriesRow;
        Insert: FolderEntriesWrite;
        Update: FolderEntriesWrite;
        Relationships: [
          {
            foreignKeyName: 'folder_entries_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
