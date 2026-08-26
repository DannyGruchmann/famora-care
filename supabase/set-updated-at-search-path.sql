-- =============================================================================
-- FAMORA – PIN THE SEARCH PATH OF set_updated_at
-- =============================================================================
--
-- WHAT IS THIS?
-- One line added to a trigger function that already exists. Nothing about the
-- schema changes, nothing about the data changes.
--
-- WHY?
-- The Supabase database linter flags "Function Search Path Mutable" on
-- public.set_updated_at. A function without a fixed search_path resolves the
-- names inside it against whatever the calling role happens to have set. Anyone
-- able to influence that setting can decide which now() the function calls.
--
-- Pinning it to the empty string takes the lever away. now() lives in
-- pg_catalog, which Postgres keeps reachable no matter what the search path
-- says, so the body needs no other change.
--
-- SAFE TO RE-RUN. "create or replace" leaves the triggers pointing at it alone.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
