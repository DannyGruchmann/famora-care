-- =============================================================================
-- FAMORA – DROP THE TABLES LEFT OVER FROM THE REACT APP
-- =============================================================================
--
-- WHAT IS THIS?
-- Removes 19 tables the Angular app never touches. It queries exactly two:
-- "folders" and "folder_entries". Everything listed below is scaffolding from
-- the React version that was never filled — every one of them holds 0 rows.
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
-- It counts every table first and raises if any of them has gained a row in the
-- meantime. A raise rolls the entire block back: either all 19 go, or none do.
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
  target text;
  occupied bigint;
begin
  -- First pass: refuse the whole operation if anything is no longer empty.
  foreach target in array dead_tables loop
    if to_regclass(format('public.%I', target)) is null then
      continue;
    end if;

    execute format('select count(*) from public.%I', target) into occupied;

    if occupied > 0 then
      raise exception 'Aborted: public.% holds % row(s). Nothing was dropped.', target, occupied;
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
