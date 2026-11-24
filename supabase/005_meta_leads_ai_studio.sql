-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — step 5: Meta lead ads + photos + AI Studio (run ONCE)
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ─── leads from Meta ───
alter table leads add column if not exists source_detail text;        -- campaign · ad · form
alter table leads add column if not exists external_id text;          -- Meta leadgen_id (prevents duplicates)
create unique index if not exists leads_external_id_key on leads (external_id) where external_id is not null;

-- lead numbers stay unique even when the app and the Meta webhook create leads at the same moment
create or replace function leads_unique_ref() returns trigger language plpgsql as $$
begin
  if new.ref is null or new.ref in ('', 'LD-0') or exists (select 1 from leads where ref = new.ref and id <> new.id) then
    new.ref := 'LD-' || (coalesce((select max(nullif(regexp_replace(ref, '\D', '', 'g'), '')::int) from leads), 3000) + 1);
  end if;
  return new;
end $$;
drop trigger if exists leads_unique_ref on leads;
create trigger leads_unique_ref before insert on leads for each row execute function leads_unique_ref();

-- round-robin: the active Sales Executive who received an ad lead longest ago (Director if there are none)
create or replace function next_lead_owner() returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.id from members m
      where m.active and m.role = 'sales_executive'
      order by (select max(l.created_at) from leads l where l.owner_id = m.id and l.external_id is not null) asc nulls first, m.created_at
      limit 1),
    (select id from members where active and role = 'director' order by created_at limit 1)
  )
$$;
revoke all on function next_lead_owner() from public, anon, authenticated;
grant execute on function next_lead_owner() to service_role;

-- live updates: new leads appear in open CRM windows without refreshing
do $$ begin
  alter publication supabase_realtime add table leads;
exception when others then null; end $$;

-- ─── AI Studio permission ───
alter table role_permissions drop constraint if exists role_permissions_module_check;
alter table role_permissions add constraint role_permissions_module_check
  check (module in ('leads','quotes','clients','projects','tasks','invoices','team','settings','studio'));
insert into role_permissions (role, module, access, scope) values
  ('sales_executive','studio','edit','all'), ('project_manager','studio','view','all'), ('interior_designer','studio','edit','all'),
  ('site_engineer','studio','none','all'), ('procurement_officer','studio','none','all'), ('finance_officer','studio','none','all')
on conflict (role, module) do nothing;

alter table settings add column if not exists ai_monthly_limit int not null default 100;

-- ─── photos & generated designs ───
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('lead','project')),
  entity_id uuid not null,
  kind text not null check (kind in ('photo','generated')),
  path text not null unique,
  name text,
  mime text,
  prompt text,
  style text,
  room text,
  model text,
  source_id uuid references media(id) on delete set null,
  created_by uuid references members(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists media_entity_idx on media (entity, entity_id, created_at desc);
create index if not exists media_generated_month_idx on media (created_at) where kind = 'generated';

alter table media enable row level security;
drop policy if exists media_read on media;
drop policy if exists media_insert on media;
drop policy if exists media_delete on media;
-- visible when the lead/project is visible (row security on those tables applies inside exists)
create policy media_read on media for select using (
  (entity = 'lead' and exists (select 1 from leads l where l.id = entity_id)) or
  (entity = 'project' and exists (select 1 from projects p where p.id = entity_id))
);
-- staff upload photos to records they can edit; generated designs are saved by the server
create policy media_insert on media for insert with check (
  kind = 'photo' and created_by = auth.uid() and (
    (entity = 'lead' and (can_edit('leads') or can_edit('studio')) and exists (select 1 from leads l where l.id = entity_id)) or
    (entity = 'project' and (can_edit('projects') or can_edit('studio')) and exists (select 1 from projects p where p.id = entity_id))
  )
);
create policy media_delete on media for delete using (created_by = auth.uid() or my_role() = 'director');

grant select, insert, delete on media to authenticated;
grant all on media to service_role;
revoke all on media from anon;

-- ─── private storage bucket ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crm-media', 'crm-media', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "crm media read" on storage.objects;
drop policy if exists "crm media upload" on storage.objects;
drop policy if exists "crm media delete" on storage.objects;
create policy "crm media read" on storage.objects for select to authenticated using (bucket_id = 'crm-media' and public.my_role() is not null);
create policy "crm media upload" on storage.objects for insert to authenticated with check (bucket_id = 'crm-media' and public.my_role() is not null);
create policy "crm media delete" on storage.objects for delete to authenticated using (bucket_id = 'crm-media' and (owner = auth.uid() or public.my_role() = 'director'));

select 'ok — Meta leads, photos and AI Studio are ready' as status;
