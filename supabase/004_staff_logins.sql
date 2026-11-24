-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — step 4: let the server create staff logins (run ONCE)
--  The Team page's "Add member / Reset password / Deactivate" run on the
--  server with SUPABASE_SECRET_KEY. Newer Supabase projects don't grant
--  table access to that key automatically, so grant it here. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

select 'ok — staff logins can now be managed from the Team page' as status;
