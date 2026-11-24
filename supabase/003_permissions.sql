-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — step 3: role-based permissions (run ONCE after 002)
--  The Director edits this matrix on Team → Roles & permissions.
--  Every table's row-level security reads it, so the rules hold
--  in the database, not only in the app. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

create table if not exists role_permissions (
  role app_role not null,
  module text not null check (module in ('leads','quotes','clients','projects','tasks','invoices','team','settings')),
  access text not null default 'none' check (access in ('none','view','edit')),
  scope text not null default 'all' check (scope in ('own','all')),
  primary key (role, module)
);

-- defaults (existing rows are kept)
insert into role_permissions (role, module, access, scope) values
  ('sales_executive','leads','edit','own'), ('sales_executive','quotes','edit','all'), ('sales_executive','clients','edit','all'),
  ('sales_executive','projects','view','all'), ('sales_executive','tasks','edit','own'), ('sales_executive','invoices','none','all'),
  ('sales_executive','team','view','all'), ('sales_executive','settings','none','all'),

  ('project_manager','leads','view','all'), ('project_manager','quotes','view','all'), ('project_manager','clients','edit','all'),
  ('project_manager','projects','edit','own'), ('project_manager','tasks','edit','all'), ('project_manager','invoices','view','all'),
  ('project_manager','team','view','all'), ('project_manager','settings','none','all'),

  ('interior_designer','leads','view','all'), ('interior_designer','quotes','view','all'), ('interior_designer','clients','view','all'),
  ('interior_designer','projects','edit','own'), ('interior_designer','tasks','edit','own'), ('interior_designer','invoices','none','all'),
  ('interior_designer','team','view','all'), ('interior_designer','settings','none','all'),

  ('site_engineer','leads','none','all'), ('site_engineer','quotes','none','all'), ('site_engineer','clients','view','all'),
  ('site_engineer','projects','edit','own'), ('site_engineer','tasks','edit','own'), ('site_engineer','invoices','none','all'),
  ('site_engineer','team','view','all'), ('site_engineer','settings','none','all'),

  ('procurement_officer','leads','none','all'), ('procurement_officer','quotes','view','all'), ('procurement_officer','clients','view','all'),
  ('procurement_officer','projects','view','all'), ('procurement_officer','tasks','edit','own'), ('procurement_officer','invoices','none','all'),
  ('procurement_officer','team','view','all'), ('procurement_officer','settings','none','all'),

  ('finance_officer','leads','view','all'), ('finance_officer','quotes','view','all'), ('finance_officer','clients','view','all'),
  ('finance_officer','projects','view','all'), ('finance_officer','tasks','edit','own'), ('finance_officer','invoices','edit','all'),
  ('finance_officer','team','view','all'), ('finance_officer','settings','edit','all')
on conflict (role, module) do nothing;

-- ─── permission helpers (Director always has full access) ───
create or replace function perm_access(p_module text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when my_role() is null then 'none'
    when my_role() = 'director' then 'edit'
    else coalesce((select access from role_permissions where role = my_role() and module = p_module), 'none')
  end
$$;

create or replace function can_view(p_module text) returns boolean language sql stable as
$$ select perm_access(p_module) in ('view','edit') $$;

create or replace function can_edit(p_module text) returns boolean language sql stable as
$$ select perm_access(p_module) = 'edit' $$;

create or replace function sees_all(p_module text) returns boolean
language sql stable security definer set search_path = public as $$
  select my_role() = 'director'
      or coalesce((select scope = 'all' from role_permissions where role = my_role() and module = p_module), false)
$$;

-- ─── drop the original fixed policies ───
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table role_permissions enable row level security;

-- permissions matrix: everyone reads (the app needs it), only Directors change it
create policy rp_read on role_permissions for select using (my_role() is not null);
create policy rp_write on role_permissions for all using (my_role() = 'director') with check (my_role() = 'director');

-- team: everyone sees colleagues; Team "edit" manages them; only Directors create or change Directors
create policy members_read on members for select using (my_role() is not null);
create policy members_insert on members for insert with check (can_edit('team') and (my_role() = 'director' or role <> 'director'));
create policy members_update on members for update using (can_edit('team') and (my_role() = 'director' or role <> 'director'))
  with check (can_edit('team') and (my_role() = 'director' or role <> 'director'));
create policy members_delete on members for delete using (my_role() = 'director');

-- settings
create policy settings_read on settings for select using (my_role() is not null);
create policy settings_update on settings for update using (can_edit('settings')) with check (can_edit('settings'));

-- leads (scope "own" = leads they own)
create policy leads_read on leads for select using (can_view('leads') and (sees_all('leads') or owner_id = auth.uid()));
create policy leads_insert on leads for insert with check (can_edit('leads') and (sees_all('leads') or owner_id = auth.uid()));
create policy leads_update on leads for update using (can_edit('leads') and (sees_all('leads') or owner_id = auth.uid()))
  with check (can_edit('leads') and (sees_all('leads') or owner_id = auth.uid()));
create policy leads_delete on leads for delete using (can_edit('leads') and (sees_all('leads') or owner_id = auth.uid()));

-- clients: readable by anyone working with leads, quotes, projects or invoices; sales can create them when converting a won lead
create policy clients_read on clients for select using (can_view('clients') or can_view('projects') or can_view('quotes') or can_view('invoices') or can_view('leads'));
create policy clients_insert on clients for insert with check (can_edit('clients') or can_edit('leads'));
create policy clients_update on clients for update using (can_edit('clients') or can_edit('leads')) with check (can_edit('clients') or can_edit('leads'));
create policy clients_delete on clients for delete using (can_edit('clients'));

-- projects (scope "own" = they are the manager or designer)
create policy projects_read on projects for select using (can_view('projects') and (sees_all('projects') or manager_id = auth.uid() or designer_id = auth.uid()));
create policy projects_insert on projects for insert with check ((can_edit('projects') or can_edit('leads')) and (sees_all('projects') or manager_id = auth.uid() or designer_id = auth.uid() or can_edit('leads')));
create policy projects_update on projects for update using (can_edit('projects') and (sees_all('projects') or manager_id = auth.uid() or designer_id = auth.uid()))
  with check (can_edit('projects'));
create policy projects_delete on projects for delete using (can_edit('projects') and sees_all('projects'));

create policy phases_read on project_phases for select using (exists (select 1 from projects p where p.id = project_id));
create policy phases_write on project_phases for all using ((can_edit('projects') or can_edit('leads')) and exists (select 1 from projects p where p.id = project_id))
  with check ((can_edit('projects') or can_edit('leads')) and exists (select 1 from projects p where p.id = project_id));

-- quotations
create policy quotes_read on quotes for select using (can_view('quotes'));
create policy quotes_write on quotes for all using (can_edit('quotes')) with check (can_edit('quotes'));
create policy qs_read on quote_sections for select using (can_view('quotes'));
create policy qs_write on quote_sections for all using (can_edit('quotes')) with check (can_edit('quotes'));
create policy qi_read on quote_items for select using (can_view('quotes'));
create policy qi_write on quote_items for all using (can_edit('quotes')) with check (can_edit('quotes'));
create policy qm_read on quote_milestones for select using (can_view('quotes'));
create policy qm_write on quote_milestones for all using (can_edit('quotes')) with check (can_edit('quotes'));

-- invoices & payments
create policy invoices_read on invoices for select using (can_view('invoices'));
create policy invoices_write on invoices for all using (can_edit('invoices')) with check (can_edit('invoices'));
create policy ii_read on invoice_items for select using (can_view('invoices'));
create policy ii_write on invoice_items for all using (can_edit('invoices')) with check (can_edit('invoices'));
create policy pay_read on payments for select using (can_view('invoices'));
create policy pay_write on payments for all using (can_edit('invoices')) with check (can_edit('invoices'));

-- tasks (scope "own" = assigned to them)
create policy tasks_read on tasks for select using (can_view('tasks') and (sees_all('tasks') or assignee_id = auth.uid()));
create policy tasks_insert on tasks for insert with check (can_edit('tasks') and (sees_all('tasks') or assignee_id = auth.uid()));
create policy tasks_update on tasks for update using (can_edit('tasks') and (sees_all('tasks') or assignee_id = auth.uid()))
  with check (can_edit('tasks') and (sees_all('tasks') or assignee_id = auth.uid()));
create policy tasks_delete on tasks for delete using (can_edit('tasks') and (sees_all('tasks') or assignee_id = auth.uid()));

-- activity follows the record it belongs to (row security on that table applies inside exists)
create policy activities_read on activities for select using (
  (entity = 'lead' and exists (select 1 from leads l where l.id = entity_id)) or
  (entity = 'project' and exists (select 1 from projects p where p.id = entity_id)) or
  (entity = 'client' and exists (select 1 from clients c where c.id = entity_id))
);
create policy activities_insert on activities for insert with check (
  by_id = auth.uid() and (
    (entity = 'lead' and exists (select 1 from leads l where l.id = entity_id)) or
    (entity = 'project' and exists (select 1 from projects p where p.id = entity_id)) or
    (entity = 'client' and exists (select 1 from clients c where c.id = entity_id))
  )
);

-- staff management uses the Team permission
create or replace function add_member_by_email(p_email text, p_name text, p_role app_role, p_phone text default null, p_tone text default '#9D825D')
returns members language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_row members;
begin
  if not can_edit('team') then raise exception 'You do not have permission to add team members'; end if;
  if p_role = 'director' and my_role() <> 'director' then raise exception 'Only a Director can add another Director'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'No login exists for %. Create the user in Supabase → Authentication → Users first.', p_email;
  end if;
  insert into members (id, name, role, email, phone, tone, active)
  values (v_uid, p_name, p_role, lower(trim(p_email)), p_phone, coalesce(p_tone, '#9D825D'), true)
  on conflict (id) do update set name = excluded.name, role = excluded.role, phone = excluded.phone, tone = excluded.tone, active = true
  returning * into v_row;
  return v_row;
end $$;

grant select, insert, update, delete on role_permissions to authenticated;
grant execute on all functions in schema public to authenticated;
revoke all on role_permissions from anon;

select role, count(*) filter (where access <> 'none') as modules_with_access from role_permissions group by role order by role;
