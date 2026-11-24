-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — step 2: connect the app (run ONCE, after schema.sql)
--  • relaxes a few constraints the app relies on
--  • creates the company settings row
--  • makes the FIRST user in Authentication → Users the Director
--  • adds add_member_by_email() so Directors can add staff from the Team page
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- newer Supabase projects don't auto-grant tables to the API roles
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
revoke all on all tables in schema public from anon;

-- drafts may be created before a client/lead is chosen
alter table quotes drop constraint if exists quote_has_recipient;

-- deleting a lead/project/quote must not be blocked by documents that mention it
alter table quotes drop constraint if exists quotes_lead_id_fkey;
alter table quotes add constraint quotes_lead_id_fkey foreign key (lead_id) references leads(id) on delete set null;
alter table quotes drop constraint if exists quotes_project_id_fkey;
alter table quotes add constraint quotes_project_id_fkey foreign key (project_id) references projects(id) on delete set null;
alter table invoices drop constraint if exists invoices_project_id_fkey;
alter table invoices add constraint invoices_project_id_fkey foreign key (project_id) references projects(id) on delete set null;
alter table invoices drop constraint if exists invoices_quote_id_fkey;
alter table invoices add constraint invoices_quote_id_fkey foreign key (quote_id) references quotes(id) on delete set null;
alter table leads drop constraint if exists leads_client_fk;
alter table leads add constraint leads_client_fk foreign key (client_id) references clients(id) on delete set null;

-- company settings (single row)
insert into settings (id, company_name, legal_name, trn, address, phone, email, website)
values (1, 'Afaq Al Manzel Interiors', 'Afaq Al Manzel Interiors L.L.C', '', 'Dubai, UAE', '', '', 'afaqalmanzel.ae')
on conflict (id) do nothing;

-- first auth user becomes Director (only when no members exist yet)
insert into members (id, name, role, email)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'name', ''), initcap(split_part(u.email, '@', 1))),
       'director',
       u.email
from auth.users u
where not exists (select 1 from members)
order by u.created_at
limit 1;

-- Directors add staff: the person must first exist in Authentication → Users
create or replace function add_member_by_email(p_email text, p_name text, p_role app_role, p_phone text default null, p_tone text default '#9D825D')
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row members;
begin
  if not has_role('director') then
    raise exception 'Only a Director can add team members';
  end if;
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

revoke all on function add_member_by_email(text, text, app_role, text, text) from public;
grant execute on function add_member_by_email(text, text, app_role, text, text) to authenticated;

-- check: should show your Director row
select id, name, role, email from members;
