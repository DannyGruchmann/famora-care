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
 *
 * Only the tables and functions the application actually queries are listed. The project still
 * carries nineteen unused tables from the React version; typing them here would suggest the app
 * knows about them, and it does not.
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

type FamilyTreesRow = {
  id: string;
  name: string;
  /** Empty until the first person exists. Cleared again when that person is deleted. */
  root_person_id: string | null;
  created_at: string;
  updated_at: string;
};

type FamilyTreesWrite = Partial<FamilyTreesRow>;

type TreePersonsRow = {
  id: string;
  tree_id: string;
  name: string;
  /** A year, not a date, and deliberately so — see supabase/family-tree.sql §1. */
  birth_year: number | null;
  deceased: boolean;
  /** A death year is only allowed together with deceased; the database enforces that pairing. */
  death_year: number | null;
  /** null once the account that entered this person is deleted. */
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TreePersonsWrite = Partial<TreePersonsRow>;

type TreeRelationsRow = {
  id: string;
  tree_id: string;
  /** 'parent' (person_a is the parent) or 'partner' (undirected, person_a < person_b). */
  kind: string;
  person_a: string;
  person_b: string;
  created_at: string;
};

type TreeRelationsWrite = Partial<TreeRelationsRow>;

type TreeMembersRow = {
  tree_id: string;
  user_id: string;
  /** 'owner', 'editor' or 'viewer'. */
  role: string;
  created_at: string;
};

type TreeMembersWrite = Partial<TreeMembersRow>;

type TreeInvitationsRow = {
  id: string;
  tree_id: string;
  /** sha256 of the token as hex. The token itself lives in the link and nowhere else. */
  token_hash: string;
  role: string;
  created_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  created_at: string;
};

type TreeInvitationsWrite = Partial<TreeInvitationsRow>;

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
      family_trees: {
        Row: FamilyTreesRow;
        Insert: FamilyTreesWrite;
        Update: FamilyTreesWrite;
        Relationships: [
          {
            foreignKeyName: 'family_trees_root_person_fkey';
            columns: ['id', 'root_person_id'];
            isOneToOne: false;
            referencedRelation: 'tree_persons';
            referencedColumns: ['tree_id', 'id'];
          },
        ];
      };
      tree_persons: {
        Row: TreePersonsRow;
        Insert: TreePersonsWrite;
        Update: TreePersonsWrite;
        Relationships: [
          {
            foreignKeyName: 'tree_persons_tree_id_fkey';
            columns: ['tree_id'];
            isOneToOne: false;
            referencedRelation: 'family_trees';
            referencedColumns: ['id'];
          },
        ];
      };
      tree_relations: {
        Row: TreeRelationsRow;
        Insert: TreeRelationsWrite;
        Update: TreeRelationsWrite;
        Relationships: [
          {
            foreignKeyName: 'tree_relations_tree_id_fkey';
            columns: ['tree_id'];
            isOneToOne: false;
            referencedRelation: 'family_trees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tree_relations_person_a_fkey';
            columns: ['tree_id', 'person_a'];
            isOneToOne: false;
            referencedRelation: 'tree_persons';
            referencedColumns: ['tree_id', 'id'];
          },
          {
            foreignKeyName: 'tree_relations_person_b_fkey';
            columns: ['tree_id', 'person_b'];
            isOneToOne: false;
            referencedRelation: 'tree_persons';
            referencedColumns: ['tree_id', 'id'];
          },
        ];
      };
      tree_members: {
        Row: TreeMembersRow;
        Insert: TreeMembersWrite;
        Update: TreeMembersWrite;
        Relationships: [
          {
            foreignKeyName: 'tree_members_tree_id_fkey';
            columns: ['tree_id'];
            isOneToOne: false;
            referencedRelation: 'family_trees';
            referencedColumns: ['id'];
          },
        ];
      };
      tree_invitations: {
        Row: TreeInvitationsRow;
        Insert: TreeInvitationsWrite;
        Update: TreeInvitationsWrite;
        Relationships: [
          {
            foreignKeyName: 'tree_invitations_tree_id_fkey';
            columns: ['tree_id'];
            isOneToOne: false;
            referencedRelation: 'family_trees';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      /**
       * The only way into a tree by invitation. Takes the raw token from the link, returns the
       * tree id, and raises on anything else. The role helpers behind the policies are not listed
       * here — the application never calls them, only the policies do.
       */
      accept_tree_invitation: {
        Args: { token: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
