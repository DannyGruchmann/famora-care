-- =============================================================================
-- FAMORA – FOLDER ENTRIES (the content of a precaution folder)
-- =============================================================================
--
-- WHAT IS THIS?
-- A second table, next to "folders". A folder entry is one thing worth writing
-- down before it is needed: where the will is kept, which insurer holds which
-- policy, who to call, what should happen at the funeral.
--
-- Until now the precaution path only had a checklist telling people to collect
-- these things somewhere else. This table is that "somewhere else".
--
-- HOW DO I RUN IT?
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run schema.sql first; this file references the folders table.
-- Expected answer: "Success. No rows returned".
--
-- DO I HAVE TO BE CAREFUL?
-- No. Written to be repeatable ("if not exists", "drop ... if exists"), and it
-- only adds — it never touches the folders table or any existing row.
--
-- WHAT THIS TABLE DELIBERATELY DOES NOT HOLD
-- No passwords, ever. An account entry stores the service and the user name and
-- what should happen to it, never the credential. Famora is not a password
-- manager and must not become one by accident.
-- No documents either — a location entry says where the paper is, it is not the
-- paper. That keeps Art. 9 GDPR data out of the product entirely.
--
-- =============================================================================


-- =============================================================================
-- 1. TABLE
-- =============================================================================
--
-- One row = one entry. Five kinds share one table because they share one shape:
-- what it is, a note about it, an identifier, and who to ask.
--
--   kind        which of the five sections the entry belongs to
--   title       what it is            "Testament", "Allianz Hausrat", "Google"
--   detail      free text             "soll gekündigt werden"
--   reference   the identifying string, and what it means depends on the kind:
--                 location  where it is kept   "Bankschließfach Sparkasse"
--                 contract  the policy number  "HR-4711-2024"
--                 account   the user name      "maria.mustermann@web.de"
--                 contact   the phone number   "03447 512 340"
--                 wish      left empty
--   contact     who helps with this   "Notar Dr. Weber, 03447 512 340"
--   sort_order  the owner's order, not alphabetical — importance is personal
--
-- Why one table with a kind column rather than five tables?
-- Because the five differ in labelling, not in structure. Five tables would mean
-- five sets of policies to keep in sync, and the first one forgotten is a leak.

create table if not exists public.folder_entries (
  id uuid primary key default gen_random_uuid(),

  -- on delete cascade: deleting a folder deletes what was written in it. Without
  -- this, entries about a dead person would outlive the folder they belong to.
  folder_id uuid not null references public.folders (id) on delete cascade,

  kind text not null,
  title text not null,
  detail text not null default '',
  reference text not null default '',
  contact text not null default '',

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =============================================================================
-- 2. CONSTRAINTS
-- =============================================================================
--
-- Declared separately rather than inline in the create table above, so that this
-- file stays repeatable: a constraint written inline is not updated when the
-- table already exists. Adding a sixth kind means changing it here and running
-- the file again.
--
-- The length limits are not cosmetic. Anyone on the internet can sign up, and
-- the columns are free text — without an upper bound a single account can fill
-- the database. The numbers are generous enough that no honest entry hits them.

alter table public.folder_entries drop constraint if exists folder_entries_kind_check;
alter table public.folder_entries add constraint folder_entries_kind_check
  check (kind in ('location', 'contract', 'account', 'contact', 'wish'));

alter table public.folder_entries drop constraint if exists folder_entries_title_check;
alter table public.folder_entries add constraint folder_entries_title_check
  check (char_length(title) between 1 and 120);

alter table public.folder_entries drop constraint if exists folder_entries_length_check;
alter table public.folder_entries add constraint folder_entries_length_check
  check (
    char_length(detail) <= 2000
    and char_length(reference) <= 300
    and char_length(contact) <= 300
  );


-- =============================================================================
-- 3. INDEX
-- =============================================================================
--
-- The application always asks the same question: every entry of one folder, by
-- section, in the owner's order. This index answers exactly that question.

create index if not exists folder_entries_folder_kind_order_idx
  on public.folder_entries (folder_id, kind, sort_order);


-- =============================================================================
-- 4. ACCESS CONTROL (ROW LEVEL SECURITY)
-- =============================================================================
--
-- Same reasoning as in schema.sql, and it matters more here: this table holds
-- what someone wrote down for the worst day of their family's life.
--
-- The browser talks to Supabase directly with the public anon key. Without the
-- next line, anyone holding that key could read every entry of every user.

alter table public.folder_entries enable row level security;


-- =============================================================================
-- 5. POLICIES
-- =============================================================================
--
-- Unlike folders, this table has no user_id column, and that is deliberate:
-- ownership has exactly one source, the folder. A copy of the owner on every
-- entry is a second truth, and two truths drift.
--
-- So every rule asks the same question: does a folder with this id exist that
-- belongs to me? The subquery runs under the caller's own permissions, which
-- means the select policy of folders applies inside it — a folder belonging to
-- somebody else does not exist as far as this check is concerned.

-- "set search_path = ''" with fully qualified names: without it the function would
-- resolve table names through whatever search path the caller happens to have,
-- which is how a function used inside a policy gets pointed at the wrong table.
-- Supabase's own database linter flags the omission.
create or replace function public.owns_folder(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.folders f
    where f.id = target and f.user_id = auth.uid()
  );
$$;

-- The German names are dropped as well: an earlier draft of this file created
-- them, and a leftover policy of the same meaning under a different name would
-- silently stay behind.

-- Reading: only entries in your own folders.
drop policy if exists "Eigene Einträge lesen" on public.folder_entries;
drop policy if exists "Read own entries" on public.folder_entries;
create policy "Read own entries" on public.folder_entries
  for select using (public.owns_folder(folder_id));

-- Creating: only into your own folders.
drop policy if exists "Eigene Einträge anlegen" on public.folder_entries;
drop policy if exists "Create own entries" on public.folder_entries;
create policy "Create own entries" on public.folder_entries
  for insert with check (public.owns_folder(folder_id));

-- Changing: needs both forms. "using" allows touching the row, "with check"
-- makes sure it still sits in one of your folders afterwards. Without the second
-- part, an entry could be moved into a stranger's folder.
drop policy if exists "Eigene Einträge ändern" on public.folder_entries;
drop policy if exists "Change own entries" on public.folder_entries;
create policy "Change own entries" on public.folder_entries
  for update using (public.owns_folder(folder_id)) with check (public.owns_folder(folder_id));

-- Deleting: only from your own folders.
drop policy if exists "Eigene Einträge löschen" on public.folder_entries;
drop policy if exists "Delete own entries" on public.folder_entries;
create policy "Delete own entries" on public.folder_entries
  for delete using (public.owns_folder(folder_id));


-- =============================================================================
-- 6. AUTOMATION
-- =============================================================================
--
-- Reuses set_updated_at() from schema.sql — that function is created there, so
-- run that file first.

drop trigger if exists folder_entries_set_updated_at on public.folder_entries;
create trigger folder_entries_set_updated_at
  before update on public.folder_entries
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 7. CHECKS
-- =============================================================================
--
-- These queries change nothing. Run them one at a time to confirm the result.
--
-- a) Is the table there with all its columns?
--
--    select column_name, data_type, is_nullable
--    from information_schema.columns
--    where table_schema = 'public' and table_name = 'folder_entries'
--    order by ordinal_position;
--
-- b) Is access control on? It has to say "true".
--
--    select relrowsecurity from pg_class where relname = 'folder_entries';
--
-- c) Are all four rules there? Four rows expected.
--
--    select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'folder_entries';
--
-- d) Does the kind constraint actually reject an unknown section?
--    This one is supposed to FAIL with "violates check constraint".
--
--    insert into public.folder_entries (folder_id, kind, title)
--    values (gen_random_uuid(), 'nonsense', 'Test');
--
-- =============================================================================
