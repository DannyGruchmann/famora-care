-- =============================================================================
-- FAMORA – DROP THE TABLES LEFT OVER FROM THE REACT APP
-- =============================================================================
--
-- WHAT IS THIS?
-- Removes 19 tables the Angular app never touches. It queries exactly seven:
-- "folders", "folder_entries" and the five tables of family-tree.sql.
-- Everything listed below is scaffolding from an earlier version of Famora.
--
-- Among them are four tables preparing a Stripe billing flow that was never
-- built, and "document_analysis", which contradicts the decision that Famora
-- stores no documents at all. Leaving them standing means every future security
-- review, every RLS audit and every schema dump has to reason about tables that
-- do nothing.
--
-- WHY IT IS SAFE
-- Checked before writing this: no foreign key connects "folders" or
-- "folder_entries" to any table below, and no trigger on auth.users writes to
-- "profiles" — so registration does not depend on it either.
--
-- HOW IT PROTECTS ITSELF
-- The whole thing is one DO block, which Postgres runs as a single transaction.
-- It counts every table first and raises if it finds a row it will not throw
-- away. A raise rolls the entire block back: either all 19 go, or none do.
--
-- THREE OF THEM ARE NOT EMPTY, AND THAT IS EXPECTED
-- When this file was first written every table held 0 rows. It has since turned
-- out that three do not (checked 2026-09-05):
--
--   audit_logs     3 rows   'phase13_probe_final', 'phase8b-live-check',
--                           'billing_checkout_completed'
--   subscriptions  1 row    stripe_customer_id 'cus_phase13final_...'
--   entitlements   1 row    the same invented customer
--
-- All five were written by the old app's own release checks in May 2026, all
-- five carry user_id null, and the Stripe customer they name never existed.
-- So the rule below is not "ignore rows in these three" but the narrower and
-- checkable "no row here belongs to an account". The moment a real one appears,
-- this file refuses to run — which is the whole point of the guard.
--
-- WHAT SUCCESS LOOKS LIKE
-- "Success. No rows returned". The Supabase SQL editor does not print notices,
-- so the "Dropped 19 legacy tables" line at the bottom is never shown — a run
-- that worked and a run that did nothing look exactly the same. To see which it
-- was, count what is left:
--
--   select count(*) from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r';
--
-- Expected afterwards: 7 — folders, folder_entries and the five tree tables.
--
-- A run that refused says so loudly instead: an abort is an error, and the
-- editor prints the "Aborted: ..." message in red.
--
-- NOT RE-RUNNABLE IN THE SENSE OF UNDOING. Tables dropped here are gone.
-- =============================================================================

do $$
declare
  dead_tables text[] := array[
    'profiles',
    'legacy_cases',
    'case_members',
    'family_members',
    'checklist_tasks',
    'task_assignments',
    'document_entries',
    'family_tasks',
    'message_templates',
    'generated_messages',
    'important_contacts',
    'legacy_notes',
    'audit_logs',
    'document_analysis',
    'billing_accounts',
    'subscriptions',
    'payments',
    'entitlements',
    'organization_placeholders'
  ];

  -- The three from the header. Each has a user_id column, which is what makes
  -- the narrower check possible.
  probe_tables text[] := array['audit_logs', 'subscriptions', 'entitlements'];

  target text;
  unexpected bigint;
begin
  -- First pass: refuse the whole operation over a single row worth keeping.
  foreach target in array dead_tables loop
    if to_regclass(format('public.%I', target)) is null then
      continue;
    end if;

    if target = any(probe_tables) then
      execute format('select count(*) from public.%I where user_id is not null', target)
        into unexpected;
    else
      execute format('select count(*) from public.%I', target) into unexpected;
    end if;

    if unexpected > 0 then
      raise exception
        'Aborted: public.% holds % row(s) this file will not throw away. Nothing was dropped.',
        target, unexpected;
    end if;
  end loop;

  -- Second pass: cascade clears the policies, triggers and the foreign keys
  -- these tables hold on each other.
  foreach target in array dead_tables loop
    execute format('drop table if exists public.%I cascade', target);
  end loop;

  raise notice 'Dropped % legacy tables.', array_length(dead_tables, 1);
end;
$$;
