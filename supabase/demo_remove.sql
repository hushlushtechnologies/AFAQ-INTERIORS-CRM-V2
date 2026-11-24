-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — remove ALL demo data added by demo_add.sql.
--  Real records are not touched. Anything staff added onto demo records
--  (notes, tasks, photos, invoices) is removed with them.
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  d_leads uuid[] := array(select id from demo_rows where tbl = 'leads');
  d_clients uuid[] := array(select id from demo_rows where tbl = 'clients');
  d_projects uuid[] := array(select id from demo_rows where tbl = 'projects');
  d_quotes uuid[] := array(select id from demo_rows where tbl = 'quotes');
  d_invoices uuid[] := array(select id from demo_rows where tbl = 'invoices');
begin
  if to_regclass('public.demo_rows') is null then raise notice 'No demo data found.'; return; end if;

  -- everything hanging off demo records
  delete from activities where id in (select id from demo_rows where tbl = 'activities')
     or (entity = 'lead' and entity_id = any(d_leads))
     or (entity = 'project' and entity_id = any(d_projects))
     or (entity = 'client' and entity_id = any(d_clients));
  delete from tasks where id in (select id from demo_rows where tbl = 'tasks') or lead_id = any(d_leads) or project_id = any(d_projects);
  if to_regclass('public.media') is not null then
    delete from storage.objects where bucket_id = 'crm-media' and name in (
      select path from media where (entity = 'lead' and entity_id = any(d_leads)) or (entity = 'project' and entity_id = any(d_projects)));
    delete from media where (entity = 'lead' and entity_id = any(d_leads)) or (entity = 'project' and entity_id = any(d_projects));
  end if;

  -- invoices on demo records (payments first)
  delete from payments where invoice_id in (select id from invoices where id = any(d_invoices) or client_id = any(d_clients) or project_id = any(d_projects));
  delete from invoices where id = any(d_invoices) or client_id = any(d_clients) or project_id = any(d_projects);

  -- quotations (all versions) on demo records; sections/items/milestones cascade
  delete from quotes where id = any(d_quotes) or ref in (select ref from quotes where id = any(d_quotes))
     or lead_id = any(d_leads) or client_id = any(d_clients) or project_id = any(d_projects);

  delete from projects where id = any(d_projects) or client_id = any(d_clients);   -- phases cascade
  delete from leads where id = any(d_leads);
  update leads set client_id = null where client_id = any(d_clients);
  delete from clients where id = any(d_clients);

  delete from demo_rows;
  raise notice 'Demo data removed.';
end $$;

select 'done — demo data removed' as status;
