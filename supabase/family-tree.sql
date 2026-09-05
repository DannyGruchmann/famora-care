-- =============================================================================
-- FAMORA – FAMILY TREE (people, their relationships, and who may see them)
-- =============================================================================
--
-- WHAT IS THIS?
-- Five tables for the family tree. Unlike the checklist and the entries, the
-- tree does not hang off a folder: a folder belongs to one death or one
-- precaution case and to exactly one account, while a tree outlives both and is
-- meant to be shared with the rest of the family.
--
--   family_trees      one tree, and the person it opens on
--   tree_persons      the people in it
--   tree_relations    the edges between them: parent-child and partner
--   tree_members      who may see or change the tree, and in which role
--   tree_invitations  outstanding invitation links, as hashes only
--
-- HOW DO I RUN IT?
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run schema.sql first; this file reuses public.set_updated_at() from there.
-- Expected answer: "Success. No rows returned".
--
-- DO I HAVE TO BE CAREFUL?
-- No. Written to be repeatable ("if not exists", "drop ... if exists",
-- "create or replace"). It only adds — it touches neither folders nor
-- folder_entries, and a second run changes nothing and deletes no row.
--
-- WHAT THE TREE DELIBERATELY DOES NOT HOLD
-- No photo, no full date of birth, no free-text note, no contact details, no
-- gender. Every one of those was considered and rejected; the reasons are in
-- docs/family-tree-plan.md §7. A birth year sorts generations just as well as a
-- date, and a free-text field is the channel through which Art. 9 GDPR data
-- (cause of death, illness, religion) arrives uninvited. Adding any of these
-- columns reopens the legal assessment — it is not a small change.
--
-- Most of what is stored here is data about other people, who did not enter it
-- themselves. That is the reason for the deliberate thinness above, and the
-- reason tree_persons keeps created_by.
--
-- STRUCTURE OF THIS FILE
--   1. Tables       – the five tables and what each column holds
--   2. Constraints  – the rules that may change later, kept re-runnable
--   3. Indexes      – so the questions the app asks stay fast
--   4. Access       – switch Row Level Security on
--   5. Role lookup  – the helper functions every policy below asks
--   6. Policies     – who may read, create, change and delete which row
--   7. Automation   – triggers: updated_at, ownership, the parent limit
--   8. Invitation   – accept_tree_invitation(), the only way into a tree
--   9. Checks       – queries to confirm everything is in place
--
-- =============================================================================


-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- family_trees – the tree itself
-- -----------------------------------------------------------------------------
--
--   name            what the family calls it. Editable, defaulted, never asked
--                   for up front — a form standing between somebody and the
--                   thing they wanted is a form nobody fills in.
--   root_person_id  the person the tree opens on. Empty until the first person
--                   exists, which is why it is nullable.
--
-- There is deliberately NO owner_id column. Ownership lives only in
-- tree_members, because it is transferable and because a tree can have more
-- than one owner. A copy of the owner here would be a second truth, and two
-- truths drift.

create table if not exists public.family_trees (
  id uuid primary key default gen_random_uuid(),

  name text not null default 'Stammbaum',

  -- The foreign key for this column is added in section 2: it points at
  -- tree_persons, which does not exist yet at this point in the file.
  root_person_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- tree_persons – one row per human being in the tree
-- -----------------------------------------------------------------------------
--
--   name        what they are called. The only required field.
--   birth_year  a year, not a date. Name plus full date of birth is the classic
--               identity-theft pair, and the year is all the layout needs.
--   deceased    kept separately from death_year, because "no longer alive" is
--               often known when the year is not.
--   death_year  optional even when deceased is true.
--   created_by  who typed this person in. Kept for the Art. 15 GDPR case: when a
--               third party asks where an entry about them came from, there has
--               to be an answer.

create table if not exists public.tree_persons (
  id uuid primary key default gen_random_uuid(),

  -- on delete cascade: deleting a tree deletes the people in it.
  tree_id uuid not null references public.family_trees (id) on delete cascade,

  name text not null,
  birth_year smallint,
  deceased boolean not null default false,
  death_year smallint,

  -- on delete set null, not cascade: a deleted account must not take other
  -- people's tree entries with it. The tree belongs to the family, not to
  -- whoever happened to type a name into it.
  created_by uuid default auth.uid() references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Redundant on its own — id is already unique. It exists so that the two
  -- foreign keys in tree_relations can reference (tree_id, id) as a pair, which
  -- is what makes "both ends of an edge sit in the same tree" a structural fact
  -- instead of a trigger someone can forget to run.
  constraint tree_persons_tree_id_id_key unique (tree_id, id)
);


-- -----------------------------------------------------------------------------
-- tree_relations – the edges
-- -----------------------------------------------------------------------------
--
-- One table with a kind column, same reasoning as folder_entries: the kinds
-- differ in meaning, not in shape, and separate tables would mean separate sets
-- of policies to keep in sync — the first one forgotten is a leak.
--
--   kind = 'parent'   person_a is the parent, person_b the child. Directed.
--   kind = 'partner'  undirected. See the ordering constraint in section 2.
--
-- Adoption and step-parent edges are not in this phase. When they arrive they
-- are a third value of kind, not a new table.

create table if not exists public.tree_relations (
  id uuid primary key default gen_random_uuid(),

  tree_id uuid not null references public.family_trees (id) on delete cascade,

  kind text not null,
  person_a uuid not null,
  person_b uuid not null,

  created_at timestamptz not null default now(),

  -- Both ends must sit in THIS tree, and deleting a person takes their edges
  -- with them. Both facts come out of these two composite foreign keys; neither
  -- needs a trigger.
  constraint tree_relations_person_a_fkey
    foreign key (tree_id, person_a) references public.tree_persons (tree_id, id) on delete cascade,
  constraint tree_relations_person_b_fkey
    foreign key (tree_id, person_b) references public.tree_persons (tree_id, id) on delete cascade,

  constraint tree_relations_edge_key unique (tree_id, kind, person_a, person_b)
);


-- -----------------------------------------------------------------------------
-- tree_members – who may do what
-- -----------------------------------------------------------------------------
--
--   owner   invites, hands out roles, renames and deletes the tree
--   editor  creates, changes and deletes people and edges
--   viewer  reads
--
-- Everyone in the tree sees the whole tree. There are no hidden branches, and
-- the schema offers no place to put one — that is deliberate, because a
-- half-visible family tree is a promise the database cannot keep.
--
-- on delete cascade on user_id: deleting an account removes its memberships,
-- which is what drives the ownerless-tree rule in section 7.

create table if not exists public.tree_members (
  tree_id uuid not null references public.family_trees (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  role text not null,

  created_at timestamptz not null default now(),

  primary key (tree_id, user_id)
);


-- -----------------------------------------------------------------------------
-- tree_invitations – a link, and nothing that could reconstruct it
-- -----------------------------------------------------------------------------
--
-- Inviting somebody means generating a secret token, putting it in a link and
-- passing that link on personally. No email is sent, no Edge Function runs, no
-- additional processor is involved.
--
-- THE RAW TOKEN IS NEVER STORED. This table holds sha256(token) as hex and
-- nothing else. Anyone reading a database dump — including us — holds hashes
-- and can invite nobody with them.
--
-- The hash is sha256 from pg_catalog, not pgcrypto: it is built into Postgres
-- since version 11, so this file needs no extension. The application produces
-- the identical value in the browser with crypto.subtle.digest('SHA-256', ...),
-- hex-encoded, and sends only the hash when creating the invitation.
--
--   role         fixed when the link is made, so the owner decides what the
--                link is worth before it leaves their hands
--   expires_at   seven days by default
--   accepted_at  set once, by accept_tree_invitation(). Single use.
--   revoked_at   set by the owner. A revoked link stays in the table so the
--                owner can see that it existed.

create table if not exists public.tree_invitations (
  id uuid primary key default gen_random_uuid(),

  tree_id uuid not null references public.family_trees (id) on delete cascade,

  token_hash text not null unique,
  role text not null,

  created_by uuid default auth.uid() references auth.users (id) on delete set null,

  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,

  created_at timestamptz not null default now()
);


-- =============================================================================
-- 2. CONSTRAINTS
-- =============================================================================
--
-- Everything here is declared with "drop ... if exists" first, so that changing
-- a rule means editing this file and running it again. A constraint written
-- inline in section 1 is never updated once the table exists — so only the
-- structural ones that will never change (the foreign keys, the unique keys the
-- foreign keys depend on) live up there.
--
-- The length limits are not cosmetic. Anyone can sign up, and these columns are
-- free text: without an upper bound one account can fill the database. The
-- numbers are generous enough that no honest entry meets them.

-- The root person must be a person in THIS tree. Same trick as in
-- tree_relations: the pair (id, root_person_id) points at (tree_id, id).
-- A null root_person_id satisfies the constraint — a tree with no people yet is
-- the normal state right after it is created.
alter table public.family_trees drop constraint if exists family_trees_root_person_fkey;
alter table public.family_trees add constraint family_trees_root_person_fkey
  foreign key (id, root_person_id) references public.tree_persons (tree_id, id);

alter table public.family_trees drop constraint if exists family_trees_name_check;
alter table public.family_trees add constraint family_trees_name_check
  check (char_length(name) between 1 and 120);

alter table public.tree_persons drop constraint if exists tree_persons_name_check;
alter table public.tree_persons add constraint tree_persons_name_check
  check (char_length(name) between 1 and 120);

-- Why a fixed upper year and not "this year plus one"? A check constraint may
-- only call immutable functions, and now() is not one — the database would
-- reject the constraint outright. 2200 catches what this is actually for: the
-- mistyped 20255. "Not in the future" is a rule the form enforces.
alter table public.tree_persons drop constraint if exists tree_persons_years_check;
alter table public.tree_persons add constraint tree_persons_years_check
  check (
    (birth_year is null or birth_year between 1000 and 2200)
    and (death_year is null or death_year between 1000 and 2200)
    and (birth_year is null or death_year is null or death_year >= birth_year)
    -- A death year without "deceased" would be a contradiction the reader has
    -- to resolve. The database refuses it instead.
    and (death_year is null or deceased)
  );

alter table public.tree_relations drop constraint if exists tree_relations_kind_check;
alter table public.tree_relations add constraint tree_relations_kind_check
  check (kind in ('parent', 'partner'));

alter table public.tree_relations drop constraint if exists tree_relations_distinct_check;
alter table public.tree_relations add constraint tree_relations_distinct_check
  check (person_a <> person_b);

-- A partner edge is undirected, so (A, B) and (B, A) mean the same thing and
-- the unique key alone would happily store both. Forcing the smaller id into
-- person_a gives every couple exactly one possible row, which is what makes the
-- unique key bite. Parent edges are directed and stay untouched.
alter table public.tree_relations drop constraint if exists tree_relations_partner_order_check;
alter table public.tree_relations add constraint tree_relations_partner_order_check
  check (kind <> 'partner' or person_a < person_b);

alter table public.tree_members drop constraint if exists tree_members_role_check;
alter table public.tree_members add constraint tree_members_role_check
  check (role in ('owner', 'editor', 'viewer'));

-- Owner is allowed here on purpose: ownership is transferable and a tree may
-- have several owners, so inviting a co-owner has to be possible.
alter table public.tree_invitations drop constraint if exists tree_invitations_role_check;
alter table public.tree_invitations add constraint tree_invitations_role_check
  check (role in ('owner', 'editor', 'viewer'));

-- 64 hex characters is what sha256 produces. Anything else in this column means
-- something other than a hash was written into it, and that is worth refusing.
alter table public.tree_invitations drop constraint if exists tree_invitations_token_hash_check;
alter table public.tree_invitations add constraint tree_invitations_token_hash_check
  check (token_hash ~ '^[0-9a-f]{64}$');


-- =============================================================================
-- 3. INDEXES
-- =============================================================================
--
-- Three of the questions the app asks are already answered by keys declared in
-- section 1, so they need nothing here:
--   every person of one tree      -> tree_persons_tree_id_id_key (tree_id, id)
--   every edge of one tree        -> tree_relations_edge_key (tree_id, kind, ...)
--   my role in one tree           -> the primary key of tree_members
--
-- What is left:

-- Deleting a person has to find their edges, and the parent-limit trigger in
-- section 7 has to count edges by child. The unique key above cannot serve
-- either, because kind sits between tree_id and the person columns.
create index if not exists tree_relations_person_a_idx
  on public.tree_relations (tree_id, person_a);

create index if not exists tree_relations_person_b_idx
  on public.tree_relations (tree_id, person_b);

-- "Which trees does this account belong to?" — the question the dashboard card
-- asks on every folder page. The primary key starts with tree_id and is no help.
create index if not exists tree_members_user_id_idx
  on public.tree_members (user_id);

-- The owner's list of outstanding invitations, newest first.
create index if not exists tree_invitations_tree_id_created_at_idx
  on public.tree_invitations (tree_id, created_at desc);


-- =============================================================================
-- 4. ACCESS CONTROL (ROW LEVEL SECURITY)
-- =============================================================================
--
-- Same reasoning as in schema.sql: the browser talks to Supabase directly with
-- the public anon key, so the protection cannot live in the application. It
-- lives here.
--
-- It matters more for these tables than for any other in this project, because
-- these hold data about people who are not customers, never agreed to anything
-- and in many cases are no longer alive to object.

alter table public.family_trees enable row level security;
alter table public.tree_persons enable row level security;
alter table public.tree_relations enable row level security;
alter table public.tree_members enable row level security;
alter table public.tree_invitations enable row level security;


-- =============================================================================
-- 5. ROLE LOOKUP
-- =============================================================================
--
-- Every policy in section 6 asks one of four questions, and all four come down
-- to: what is my role in this tree? That answer lives in tree_members.
--
-- WHY security definer — READ THIS BEFORE SIMPLIFYING IT AWAY.
-- tree_members needs its own select policy, and that policy has to ask the same
-- question. A policy on tree_members that reads tree_members is infinite
-- recursion, and Postgres says so: "infinite recursion detected in policy for
-- relation tree_members" (SQLSTATE 42P17).
--
-- security definer runs the function as its owner, for whom row level security
-- is off, which breaks the loop. public.owns_folder() in folder-entries.sql gets
-- away with being plain "stable" only because the policy on folders is
-- auth.uid() = user_id and never reads folders again. That does not hold here.
--
-- security definer bypasses RLS by design, so this function is kept as small as
-- a function can be: it takes a tree id, it answers about auth.uid(), and it
-- returns. No joins, no second parameter, nothing a caller could use to ask a
-- wider question than "what am I in this tree".
--
-- set search_path = '' with fully qualified names: without it the function
-- resolves table names through whatever search path the caller happens to have,
-- which is how a function used inside a policy gets pointed at the wrong table.

create or replace function public.tree_role(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.tree_members m
  where m.tree_id = target and m.user_id = auth.uid();
$$;

-- The three predicates below are plain "stable" on purpose. They inherit the
-- recursion break from tree_role(), so making them definers too would widen the
-- part of the schema that runs without row level security for no gain.

create or replace function public.can_view_tree(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.tree_role(target) is not null;
$$;

create or replace function public.can_edit_tree(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.tree_role(target) in ('owner', 'editor');
$$;

create or replace function public.is_tree_owner(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.tree_role(target) = 'owner';
$$;


-- =============================================================================
-- 6. POLICIES
-- =============================================================================
--
--   using       checks rows that already exist (read, change, delete)
--   with check  checks rows as they are meant to look afterwards (create, change)
--
-- Every update rule carries both. Without "with check", a row could be changed
-- into a tree the caller does not belong to and parked there.

-- -----------------------------------------------------------------------------
-- family_trees
-- -----------------------------------------------------------------------------

drop policy if exists "Read trees you belong to" on public.family_trees;
create policy "Read trees you belong to" on public.family_trees
  for select using (public.can_view_tree(id));

-- Anyone signed in may create a tree; the trigger in section 7 makes them its
-- owner in the same statement. There is nothing to check about the new row —
-- it carries no ownership column that could be forged.
drop policy if exists "Create a tree" on public.family_trees;
create policy "Create a tree" on public.family_trees
  for insert with check (auth.uid() is not null);

drop policy if exists "Owners change the tree" on public.family_trees;
create policy "Owners change the tree" on public.family_trees
  for update using (public.is_tree_owner(id)) with check (public.is_tree_owner(id));

drop policy if exists "Owners delete the tree" on public.family_trees;
create policy "Owners delete the tree" on public.family_trees
  for delete using (public.is_tree_owner(id));

-- -----------------------------------------------------------------------------
-- tree_persons and tree_relations – identical rules, one tree at a time
-- -----------------------------------------------------------------------------

drop policy if exists "Read people of your trees" on public.tree_persons;
create policy "Read people of your trees" on public.tree_persons
  for select using (public.can_view_tree(tree_id));

drop policy if exists "Editors add people" on public.tree_persons;
create policy "Editors add people" on public.tree_persons
  for insert with check (public.can_edit_tree(tree_id));

drop policy if exists "Editors change people" on public.tree_persons;
create policy "Editors change people" on public.tree_persons
  for update using (public.can_edit_tree(tree_id)) with check (public.can_edit_tree(tree_id));

drop policy if exists "Editors delete people" on public.tree_persons;
create policy "Editors delete people" on public.tree_persons
  for delete using (public.can_edit_tree(tree_id));

drop policy if exists "Read relations of your trees" on public.tree_relations;
create policy "Read relations of your trees" on public.tree_relations
  for select using (public.can_view_tree(tree_id));

drop policy if exists "Editors add relations" on public.tree_relations;
create policy "Editors add relations" on public.tree_relations
  for insert with check (public.can_edit_tree(tree_id));

drop policy if exists "Editors change relations" on public.tree_relations;
create policy "Editors change relations" on public.tree_relations
  for update using (public.can_edit_tree(tree_id)) with check (public.can_edit_tree(tree_id));

drop policy if exists "Editors delete relations" on public.tree_relations;
create policy "Editors delete relations" on public.tree_relations
  for delete using (public.can_edit_tree(tree_id));

-- -----------------------------------------------------------------------------
-- tree_members
-- -----------------------------------------------------------------------------
--
-- Everyone in a tree sees who else is in it. Hiding the other members from each
-- other while showing them the same data would be theatre.

drop policy if exists "Read members of your trees" on public.tree_members;
create policy "Read members of your trees" on public.tree_members
  for select using (public.can_view_tree(tree_id));

-- Adding a member directly is an owner's act. The other way in is
-- accept_tree_invitation() in section 8, which does not go through this policy.
drop policy if exists "Owners add members" on public.tree_members;
create policy "Owners add members" on public.tree_members
  for insert with check (public.is_tree_owner(tree_id));

drop policy if exists "Owners change roles" on public.tree_members;
create policy "Owners change roles" on public.tree_members
  for update using (public.is_tree_owner(tree_id)) with check (public.is_tree_owner(tree_id));

-- Two ways a membership ends: an owner removes somebody, or somebody leaves by
-- themselves. The second half of this condition is what makes leaving possible
-- without asking permission from the person you are leaving.
drop policy if exists "Owners remove members, everyone may leave" on public.tree_members;
create policy "Owners remove members, everyone may leave" on public.tree_members
  for delete using (public.is_tree_owner(tree_id) or user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- tree_invitations
-- -----------------------------------------------------------------------------
--
-- Owners only, all four ways. Nobody else has any business reading this table —
-- least of all the invitee, who is not a member yet and gets in through the
-- function in section 8 instead.

drop policy if exists "Owners read invitations" on public.tree_invitations;
create policy "Owners read invitations" on public.tree_invitations
  for select using (public.is_tree_owner(tree_id));

drop policy if exists "Owners create invitations" on public.tree_invitations;
create policy "Owners create invitations" on public.tree_invitations
  for insert with check (public.is_tree_owner(tree_id));

drop policy if exists "Owners revoke invitations" on public.tree_invitations;
create policy "Owners revoke invitations" on public.tree_invitations
  for update using (public.is_tree_owner(tree_id)) with check (public.is_tree_owner(tree_id));

drop policy if exists "Owners delete invitations" on public.tree_invitations;
create policy "Owners delete invitations" on public.tree_invitations
  for delete using (public.is_tree_owner(tree_id));


-- =============================================================================
-- 7. AUTOMATION (TRIGGERS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at – reuses set_updated_at() from schema.sql
-- -----------------------------------------------------------------------------

drop trigger if exists family_trees_set_updated_at on public.family_trees;
create trigger family_trees_set_updated_at
  before update on public.family_trees
  for each row execute function public.set_updated_at();

drop trigger if exists tree_persons_set_updated_at on public.tree_persons;
create trigger tree_persons_set_updated_at
  before update on public.tree_persons
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Whoever creates a tree owns it
-- -----------------------------------------------------------------------------
--
-- security definer, and this is the one place it is unavoidable: the insert
-- policy on tree_members demands is_tree_owner(), and at this instant the
-- creator is not an owner of anything. Something has to hand out the first
-- membership, and it cannot be the caller.
--
-- Without a session — the SQL editor, a service-role script — auth.uid() is
-- empty and the tree is left without an owner rather than failing the insert.
-- Such a tree is invisible to every policy in section 6, which is the correct
-- outcome for a row that was created outside the application.

create or replace function public.claim_new_tree()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  insert into public.tree_members (tree_id, user_id, role)
  values (new.id, auth.uid(), 'owner');

  return new;
end;
$$;

drop trigger if exists family_trees_claim_new_tree on public.family_trees;
create trigger family_trees_claim_new_tree
  after insert on public.family_trees
  for each row execute function public.claim_new_tree();

-- -----------------------------------------------------------------------------
-- A tree without an owner is deleted
-- -----------------------------------------------------------------------------
--
-- The whole account-deletion rule falls out of this one trigger. Deleting an
-- account cascades its tree_members rows away, which fires this. Ownership
-- handed over beforehand means an owner remains and the tree carries on under
-- them; the last owner gone means the tree goes with them.
--
-- security definer because the person who just left is, by definition, no
-- longer allowed to delete anything in this tree.
--
-- The first condition is what makes it terminate: deleting the tree cascades
-- back into tree_members and fires this trigger once per remaining member, and
-- by then the tree row is gone, so nothing happens.

create or replace function public.delete_tree_without_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.family_trees t where t.id = old.tree_id)
     and not exists (
       select 1 from public.tree_members m
       where m.tree_id = old.tree_id and m.role = 'owner'
     )
  then
    delete from public.family_trees where id = old.tree_id;
  end if;

  return null;
end;
$$;

drop trigger if exists tree_members_delete_tree_without_owner on public.tree_members;
create trigger tree_members_delete_tree_without_owner
  after delete on public.tree_members
  for each row execute function public.delete_tree_without_owner();

-- -----------------------------------------------------------------------------
-- The last owner cannot demote themselves
-- -----------------------------------------------------------------------------
--
-- The trigger above handles an owner who leaves. It does not see an owner who
-- stays and merely stops being one — and that would leave a tree nobody can
-- rename, share or delete, standing there forever.
--
-- Refusing is the friendlier half of the same rule: hand ownership over first,
-- or leave the tree and let it go.

create or replace function public.keep_one_tree_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and new.role <> 'owner'
     and not exists (
       select 1 from public.tree_members m
       where m.tree_id = old.tree_id and m.role = 'owner' and m.user_id <> old.user_id
     )
  then
    raise exception 'the last owner of a tree cannot give up ownership';
  end if;

  return new;
end;
$$;

drop trigger if exists tree_members_keep_one_owner on public.tree_members;
create trigger tree_members_keep_one_owner
  before update on public.tree_members
  for each row execute function public.keep_one_tree_owner();

-- -----------------------------------------------------------------------------
-- Deleting the root person clears the tree's pointer to them
-- -----------------------------------------------------------------------------
--
-- Without this, deleting the person the tree opens on fails on the foreign key
-- from section 2, and the application would have to remember to clear the
-- pointer first. It would forget. The database does not.
--
-- security definer because an editor may delete people but may not write to
-- family_trees; under row level security their update would quietly match no
-- row and the foreign key would then refuse the delete with a message nobody
-- can act on.

create or replace function public.clear_deleted_root_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.family_trees
  set root_person_id = null
  where id = old.tree_id and root_person_id = old.id;

  return old;
end;
$$;

drop trigger if exists tree_persons_clear_deleted_root on public.tree_persons;
create trigger tree_persons_clear_deleted_root
  before delete on public.tree_persons
  for each row execute function public.clear_deleted_root_person();

-- -----------------------------------------------------------------------------
-- At most two parents
-- -----------------------------------------------------------------------------
--
-- This one cannot be a constraint — a check constraint sees a single row, and
-- the question is about all the rows around it. It is worth the trigger for the
-- reason schema.sql §5 already gives: the application forgets a rule in one of
-- the places it applies, the database never does.
--
-- Plain, not a definer: the caller is an editor of this tree, so the rows this
-- counts are rows they are allowed to read anyway.
--
-- Two editors inserting a third parent at the same moment can both pass this
-- check, because neither transaction sees the other's uncommitted row. The
-- layout function tolerates it; a stricter lock is not worth what it costs on a
-- table this size.

create or replace function public.enforce_two_parents_at_most()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind <> 'parent' then
    return new;
  end if;

  if (
    select count(*) from public.tree_relations r
    where r.kind = 'parent' and r.person_b = new.person_b and r.id <> new.id
  ) >= 2 then
    raise exception 'a person can have at most two parents';
  end if;

  return new;
end;
$$;

drop trigger if exists tree_relations_two_parents_at_most on public.tree_relations;
create trigger tree_relations_two_parents_at_most
  before insert or update on public.tree_relations
  for each row execute function public.enforce_two_parents_at_most();


-- -----------------------------------------------------------------------------
-- Trigger functions are not part of the API
-- -----------------------------------------------------------------------------
--
-- Postgres grants execute on a new function to PUBLIC, and Supabase publishes
-- everything in the public schema through PostgREST. Without the lines below,
-- each trigger function above is reachable as /rest/v1/rpc/<name>, signed in or
-- not, and Supabase's database linter says so ("Public Can Execute SECURITY
-- DEFINER Function").
--
-- Both halves have to go. Revoking from PUBLIC alone leaves the function open,
-- because Supabase ships a default privilege that grants execute on every new
-- function in this schema to anon, authenticated and service_role by name. A
-- named grant survives a revoke aimed at PUBLIC, so the roles are listed here.
--
-- Calling one outside a trigger fails on its own, but an endpoint that exists
-- only in order to return an error is still an endpoint. A trigger invokes its
-- function through the trigger mechanism, which never checks execute
-- permission, so taking the permission away costs nothing at all.

revoke all on function public.claim_new_tree() from public, anon, authenticated;
revoke all on function public.delete_tree_without_owner() from public, anon, authenticated;
revoke all on function public.keep_one_tree_owner() from public, anon, authenticated;
revoke all on function public.clear_deleted_root_person() from public, anon, authenticated;
revoke all on function public.enforce_two_parents_at_most() from public, anon, authenticated;

-- public.tree_role() stays callable, and the linter keeps flagging it. That is
-- accepted, not overlooked: the policies in section 6 run as the caller, so the
-- caller needs execute permission or every read of these tables fails outright.
-- What it hands out is worth nothing — it answers only about auth.uid(), only
-- for a tree id the caller already knows, and returns null for everyone else.


-- =============================================================================
-- 8. INVITATION REDEMPTION
-- =============================================================================
--
-- Redeeming an invitation cannot go through the policies in section 6. The
-- invitee is not a member yet, so they may not read tree_invitations, may not
-- write tree_members, and must not be given either permission just to get in.
--
-- So there is exactly one way in, and this is it. It takes the raw token from
-- the link, hashes it, and only ever compares hashes. Every failure raises;
-- there is no code path that returns a tree id without a membership having been
-- written.
--
-- "for update" locks the invitation row for the rest of the transaction, so two
-- browsers redeeming the same link at the same time cannot both find it unused.
--
-- The messages below are English and technical. The application maps them to
-- what the user should read; a raised message is not user-facing copy.

create or replace function public.accept_tree_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.tree_invitations;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into invitation
  from public.tree_invitations i
  where i.token_hash = encode(sha256(convert_to(token, 'utf8')), 'hex')
  for update;

  if invitation.id is null then
    raise exception 'invitation not found';
  end if;

  if invitation.revoked_at is not null
     or invitation.accepted_at is not null
     or invitation.expires_at <= now()
  then
    raise exception 'invitation is no longer valid';
  end if;

  -- Already a member: the link is still used up, but an existing role is never
  -- overwritten. An owner who follows a viewer link stays an owner.
  insert into public.tree_members (tree_id, user_id, role)
  values (invitation.tree_id, auth.uid(), invitation.role)
  on conflict (tree_id, user_id) do nothing;

  update public.tree_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invitation.id;

  return invitation.tree_id;
end;
$$;

-- The function runs without row level security, so who may call it at all is
-- part of its protection. Signed-in accounts, nobody else. anon is named
-- separately for the reason given in section 7: Supabase grants it execute by
-- name, and revoking from PUBLIC does not touch a named grant.
revoke all on function public.accept_tree_invitation(text) from public, anon;
grant execute on function public.accept_tree_invitation(text) to authenticated;


-- =============================================================================
-- 9. CHECKS
-- =============================================================================
--
-- These queries change nothing. Run them one at a time to confirm the result.
--
-- a) Are all five tables there?
--    Expected: family_trees, tree_invitations, tree_members, tree_persons,
--    tree_relations — plus folders and folder_entries from the other files.
--
--    select table_name from information_schema.tables
--    where table_schema = 'public' order by table_name;
--
-- b) Is access control on everywhere? Five rows, all true.
--
--    select relname, relrowsecurity from pg_class
--    where relname in ('family_trees', 'tree_persons', 'tree_relations',
--                      'tree_members', 'tree_invitations')
--    order by relname;
--
-- c) Are all the rules there? 20 rows expected: four each for family_trees,
--    tree_persons, tree_relations, tree_members and tree_invitations.
--
--    select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public'
--      and (tablename like 'tree%' or tablename = 'family_trees')
--    order by tablename, cmd;
--
-- d) Is exactly the intended set of functions running without row level
--    security? Expected true for tree_role, claim_new_tree,
--    delete_tree_without_owner, keep_one_tree_owner, clear_deleted_root_person
--    and accept_tree_invitation — and false for can_view_tree, can_edit_tree,
--    is_tree_owner and enforce_two_parents_at_most.
--
--    select proname, prosecdef as security_definer, proconfig
--    from pg_proc where pronamespace = 'public'::regnamespace
--    and proname in ('tree_role', 'can_view_tree', 'can_edit_tree',
--                    'is_tree_owner', 'claim_new_tree', 'delete_tree_without_owner',
--                    'keep_one_tree_owner', 'clear_deleted_root_person',
--                    'enforce_two_parents_at_most', 'accept_tree_invitation')
--    order by proname;
--
-- e) Does the partner ordering rule actually reject the mirrored duplicate?
--    This one is supposed to FAIL with "violates check constraint".
--
--    insert into public.tree_relations (tree_id, kind, person_a, person_b)
--    values (gen_random_uuid(),
--            'partner',
--            'ffffffff-ffff-4fff-8fff-ffffffffffff',
--            '00000000-0000-4000-8000-000000000000');
--
-- f) Does the hash the browser computes match the one this file compares
--    against? Both sides must print the same 64 characters.
--
--    select encode(sha256(convert_to('probe', 'utf8')), 'hex');
--
--    In the browser console:
--      crypto.subtle.digest('SHA-256', new TextEncoder().encode('probe'))
--        .then(b => console.log([...new Uint8Array(b)]
--          .map(x => x.toString(16).padStart(2, '0')).join('')))
--
-- g) What is actually stored, per tree? (In the SQL editor you are the
--    administrator and see everything — this bypasses section 6. The
--    application cannot.)
--
--    select t.id, t.name,
--           (select count(*) from public.tree_persons p where p.tree_id = t.id) as people,
--           (select count(*) from public.tree_relations r where r.tree_id = t.id) as edges,
--           (select count(*) from public.tree_members m where m.tree_id = t.id) as members
--    from public.family_trees t order by t.created_at;
--
-- h) Which of these functions can a visitor without an account still call?
--    Expected: exactly one row, tree_role — and the reason is in section 7.
--
--    select p.proname
--    from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('tree_role', 'claim_new_tree', 'delete_tree_without_owner',
--                        'keep_one_tree_owner', 'clear_deleted_root_person',
--                        'enforce_two_parents_at_most', 'accept_tree_invitation')
--      and has_function_privilege('anon', p.oid, 'execute')
--    order by p.proname;
--
--
-- ERRORS YOU MIGHT MEET
--
--   42P17 "infinite recursion detected in policy for relation tree_members"
--     public.tree_role() lost its "security definer". Section 5 explains why it
--     has to have it.
--
--   "new row violates row-level security policy for table family_trees"
--     There was no session, so auth.uid() was empty. In the application that
--     means the user is not signed in.
--
--   "insert or update on table tree_relations violates foreign key constraint
--    tree_relations_person_a_fkey"
--     One end of the edge is not a person in that tree. Usually the tree_id sent
--     with the relation does not match the tree the two people are in.
--
--   "a person can have at most two parents"
--     The trigger in section 7 doing its job.
--
--   PGRST202 "Could not find the function public.accept_tree_invitation"
--     Supabase has not picked the function up yet:
--     notify pgrst, 'reload schema';
--
-- =============================================================================
