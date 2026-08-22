-- =============================================================================
-- FAMORA – DATABASE SCHEMA
-- =============================================================================
--
-- WHAT IS THIS?
-- This file describes the table Famora is built around: "folders". A folder is
-- everything belonging to one death or one precaution case — the answers from
-- the onboarding, the ticked-off tasks, the people helping out. One account can
-- have any number of folders.
--
-- What a folder holds beyond that lives in folder-entries.sql. Run this file
-- first; that one references this table and the trigger function below.
--
-- HOW DO I RUN IT?
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Expected answer: "Success. No rows returned".
--
-- DO I HAVE TO BE CAREFUL?
-- No. Written to be repeatable ("if not exists", "drop ... if exists",
-- "create or replace"). A second run changes nothing and deletes no data. When
-- something needs changing, change it here and run the whole file again — then
-- this file stays the truth about the database.
--
-- STRUCTURE OF THIS FILE
--   1. Table       – where folders live and what each column holds
--   2. Index       – so the query the app makes stays fast
--   3. Access      – switch Row Level Security on
--   4. Policies    – who may read, create, change and delete which row
--   5. Automation  – updated_at maintains itself
--   6. Checks      – queries to confirm everything is in place
--
-- =============================================================================


-- =============================================================================
-- 1. TABLE
-- =============================================================================
--
-- One row = one folder. The columns:
--
--   id                  The folder's identifier. Appears in the address bar of
--                       the application: /ordner/<id>. Assigned automatically.
--
--   user_id             Who the folder belongs to. Points at the account in
--                       auth.users — the table Supabase creates itself, holding
--                       the email address and the password hash.
--
--   answers             The answers from the onboarding, exactly as the app
--                       holds them: precaution or death, federal state,
--                       relationship, the person's name and so on.
--
--   completed_task_ids  Which tasks are ticked off.
--
--   helpers             The people helping out, with name and identifier.
--
--   assignments         Which task is assigned to which person.
--
--   created_at          When the folder was created. The account menu in the
--                       top right sorts by this.
--
--   updated_at          When it last changed. Maintained by section 5.
--
-- Why jsonb rather than one column per answer?
-- jsonb is a data type that stores a whole JSON object in a single column. When
-- the onboarding gains a question, the table needs no change — the new answer
-- simply joins the object. The price: the database does not check the contents.
-- So the application checks them while reading, see toFolder() in
-- src/app/features/folders/folders.queries.ts.

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),

  -- default auth.uid(): auth.uid() is the account currently signed in. As a
  -- default value that means two things — the application does not have to send
  -- the account along, and nobody can slip in a foreign one while creating.
  --
  -- on delete cascade: deleting an account takes its folders with it. Without
  -- this, data of a person who asked to be deleted would stay behind.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  answers jsonb not null default '{}'::jsonb,

  -- This column may be empty (null), and that is deliberate:
  --   null      = never saved, the onboarding defines the starting state
  --   [] (empty) = everything deliberately unticked again
  -- Were both cases the same, the tasks the onboarding pre-ticked would come
  -- back after resetting.
  completed_task_ids jsonb,

  helpers jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =============================================================================
-- 2. INDEX
-- =============================================================================
--
-- An index is a directory the database uses to find rows without walking the
-- whole table. The application always asks the same question: every folder of
-- one account, sorted by age. This index is cut for exactly that.
--
-- With three folders nobody notices. With ten thousand they do.

create index if not exists folders_user_id_created_at_idx
  on public.folders (user_id, created_at);


-- =============================================================================
-- 3. ACCESS CONTROL (ROW LEVEL SECURITY)
-- =============================================================================
--
-- MOST IMPORTANT SECTION OF THIS FILE.
--
-- Famora has no server of its own. The browser talks to Supabase directly and
-- identifies itself with the "anon key". That key sits inside the delivered
-- JavaScript and is therefore public — anyone can read it out of the page.
--
-- The protection is therefore not in the application but here: Row Level
-- Security makes the database check, row by row on every query, whether the
-- asking account may see it at all.
--
-- Without this line, anyone holding the public key could read every folder of
-- every user. Dates of death, names, details of the estate.
--
-- After switching it on the table is closed to everyone. Only the policies in
-- section 4 open it — and only as far as necessary.

alter table public.folders enable row level security;


-- =============================================================================
-- 4. POLICIES
-- =============================================================================
--
-- A policy is a permission for one kind of access. It consists of a condition;
-- where the condition does not hold for a row, that row simply does not exist
-- as far as the request is concerned.
--
-- There are four kinds of access, and each needs its own rule:
--   select = read, insert = create, update = change, delete = remove
--
-- The condition is the same everywhere: auth.uid() = user_id, meaning "the
-- signed-in account is the owner".
--
-- Two forms appear:
--   using       checks rows that already exist (read, change, delete)
--   with check  checks rows as they are meant to look afterwards (create, change)
--
-- The "drop policy if exists" in front makes this file repeatable: a policy of
-- the same name cannot be created twice. The German names are dropped as well —
-- earlier versions of this file created them, and a leftover policy of the same
-- meaning under a different name would silently stay behind.

-- Reading: only your own folders.
drop policy if exists "Eigene Ordner lesen" on public.folders;
drop policy if exists "Read own folders" on public.folders;
create policy "Read own folders" on public.folders
  for select using (auth.uid() = user_id);

-- Creating: only onto your own account. Together with the default value from
-- section 1 this rules out a folder in somebody else's name.
drop policy if exists "Eigene Ordner anlegen" on public.folders;
drop policy if exists "Create own folders" on public.folders;
create policy "Create own folders" on public.folders
  for insert with check (auth.uid() = user_id);

-- Changing: needs both forms. "using" says "you may touch this row", "with
-- check" says "it still has to be yours afterwards". Without the second part,
-- somebody could rewrite their own folder onto a foreign account and park it
-- there.
drop policy if exists "Eigene Ordner ändern" on public.folders;
drop policy if exists "Change own folders" on public.folders;
create policy "Change own folders" on public.folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Deleting: only your own folders.
drop policy if exists "Eigene Ordner löschen" on public.folders;
drop policy if exists "Delete own folders" on public.folders;
create policy "Delete own folders" on public.folders
  for delete using (auth.uid() = user_id);


-- =============================================================================
-- 5. AUTOMATION (TRIGGER)
-- =============================================================================
--
-- A trigger is a function the database runs by itself on a given event. Here:
-- before every change to a row, updated_at is set to the current time.
--
-- Why not in the application? Because there you can forget one place, and a
-- wrong timestamp is something nobody notices. The database forgets nothing.
--
-- folder-entries.sql reuses this function, so run this file first.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 6. CHECKS
-- =============================================================================
--
-- The following queries change nothing. Run them one at a time in the SQL
-- editor to confirm everything is in place. (Select the line and hit Run.)
--
-- a) Is the table there with all its columns?
--
--    select column_name, data_type, is_nullable
--    from information_schema.columns
--    where table_schema = 'public' and table_name = 'folders'
--    order by ordinal_position;
--
-- b) Is access control on? It has to say "true".
--
--    select relrowsecurity from pg_class where relname = 'folders';
--
-- c) Are all four rules there? Four rows expected, and no German names left.
--
--    select policyname, cmd, qual, with_check
--    from pg_policies
--    where schemaname = 'public' and tablename = 'folders';
--
-- d) Which tables actually exist in this project?
--    Expected after both files: folders and folder_entries, nothing else.
--
--    select table_name from information_schema.tables
--    where table_schema = 'public' order by table_name;
--
-- e) How many folders are in there, and how many accounts do they belong to?
--    (In the SQL editor you are the administrator and see everything — so this
--    query bypasses the policies from section 4. The application cannot.)
--
--    select user_id, count(*) as folders, max(updated_at) as last_change
--    from public.folders
--    group by user_id;
--
--
-- ERRORS YOU MIGHT MEET
--
--   PGRST205 "Could not find the table 'public.folders'"
--     The table is missing — this file was never run. Or Supabase does not know
--     about it yet: then "notify pgrst, 'reload schema';" helps.
--
--   The application shows no folders although query (e) finds some
--     Then the policies from section 4 are doing their job — you are signed in
--     with a different account than the one the folders belong to.
--
--   "new row violates row-level security policy"
--     There was no session while creating, so auth.uid() was empty. In the
--     application that means: the user is not signed in.
--
-- =============================================================================
