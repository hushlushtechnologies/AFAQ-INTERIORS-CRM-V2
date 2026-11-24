-- ════════════════════════════════════════════════════════════════════
--  Afaq Al Manzel Interiors CRM v2 — Supabase schema (Phase 2)
--  Mirrors src/lib/types.ts. Run in a NEW Supabase project
--  (SQL editor → paste → run). Money is numeric(14,2) in AED.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── enums ───
create type app_role as enum ('director','sales_executive','project_manager','interior_designer','site_engineer','procurement_officer','finance_officer');
create type lead_stage as enum ('new','contacted','requirements','site_visit','quotation','negotiation','won','lost');
create type project_status as enum ('planning','design','execution','handover','completed','on_hold');
create type quote_status as enum ('draft','sent','accepted','rejected','expired');
create type task_status as enum ('todo','in_progress','review','done');
create type priority as enum ('low','medium','high');
create type activity_type as enum ('call','meeting','site_visit','note','email','stage','system');
create type client_type as enum ('Residential','Commercial','Hospitality');

-- ─── people ───
create table members (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role app_role not null,
  email text not null unique,
  phone text,
  tone text default '#9D825D',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1 check (id = 1),
  company_name text not null,
  legal_name text,
  trn text,
  address text,
  phone text,
  email text,
  website text,
  currency text not null default 'AED',
  vat_pct numeric(5,2) not null default 5,
  quote_validity_days int not null default 30,
  invoice_due_days int not null default 15
);

-- ─── sales ───
create sequence lead_ref_seq start 3001;
create table leads (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default 'LD-' || nextval('lead_ref_seq'),
  name text not null,
  company text,
  phone text,
  email text,
  source text not null,
  property_type text not null,
  location text,
  area_sqft int default 0,
  budget numeric(14,2) default 0,
  style text,
  stage lead_stage not null default 'new',
  owner_id uuid not null references members(id),
  next_follow_up date,
  notes text,
  lost_reason text,
  client_id uuid,
  created_at timestamptz not null default now(),
  constraint lost_needs_reason check (stage <> 'lost' or lost_reason is not null)
);
create index on leads (stage);
create index on leads (owner_id);
create index on leads (next_follow_up) where stage not in ('won','lost');

-- ─── delivery ───
create sequence client_ref_seq start 1001;
create table clients (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default 'CL-' || nextval('client_ref_seq'),
  name text not null,
  company text,
  phone text,
  email text,
  address text,
  city text,
  type client_type not null default 'Residential',
  created_at timestamptz not null default now()
);
alter table leads add constraint leads_client_fk foreign key (client_id) references clients(id);

create table projects (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  name text not null,
  client_id uuid not null references clients(id),
  type text not null,
  location text,
  value numeric(14,2) not null default 0,
  budget numeric(14,2) not null default 0,
  spent numeric(14,2) not null default 0,
  start_date date not null,
  due_date date not null,
  status project_status not null default 'planning',
  manager_id uuid references members(id),
  designer_id uuid references members(id),
  cover text default 'dune',
  created_at timestamptz not null default now()
);

create table project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  position int not null,
  name text not null,
  progress int not null default 0 check (progress between 0 and 100)
);

-- ─── quotations ───
create table quotes (
  id uuid primary key default gen_random_uuid(),
  ref text not null,                 -- shared by all versions, e.g. QT-2026-041
  version int not null default 1,
  title text not null,
  client_id uuid references clients(id),
  lead_id uuid references leads(id),
  project_id uuid references projects(id),
  status quote_status not null default 'draft',
  issue_date date not null,
  valid_until date not null,
  discount_pct numeric(5,2) not null default 0,
  vat_pct numeric(5,2) not null default 5,
  notes text,
  terms text,
  prepared_by uuid references members(id),
  created_at timestamptz not null default now(),
  unique (ref, version),
  constraint quote_has_recipient check (client_id is not null or lead_id is not null)
);

create table quote_sections (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  position int not null,
  room text not null
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references quote_sections(id) on delete cascade,
  position int not null,
  description text not null default '',
  qty numeric(12,3) not null default 1,
  unit text not null default 'nos',
  rate numeric(14,2) not null default 0
);

create table quote_milestones (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  position int not null,
  label text not null,
  pct numeric(5,2) not null
);

-- sent / accepted versions are immutable: changes require a new version
create or replace function forbid_locked_quote_edit() returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' and (new.title, new.discount_pct, new.vat_pct, new.client_id) is distinct from (old.title, old.discount_pct, old.vat_pct, old.client_id) then
    raise exception 'Quotation % v% is locked; create a revision', old.ref, old.version;
  end if;
  return new;
end $$;
create trigger quotes_locked before update on quotes for each row execute function forbid_locked_quote_edit();

-- ─── finance ───
create table invoices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  client_id uuid not null references clients(id),
  project_id uuid references projects(id),
  quote_id uuid references quotes(id),
  title text not null,
  issue_date date not null,
  due_date date not null,
  vat_pct numeric(5,2) not null default 5,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position int not null,
  description text not null,
  qty numeric(12,3) not null default 1,
  unit text not null default 'lot',
  rate numeric(14,2) not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete restrict,
  date date not null,
  amount numeric(14,2) not null check (amount > 0),
  method text not null,
  reference text,
  recorded_by uuid references members(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─── work ───
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid references projects(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  assignee_id uuid not null references members(id),
  due_date date not null,
  priority priority not null default 'medium',
  status task_status not null default 'todo',
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('lead','client','project')),
  entity_id uuid not null,
  type activity_type not null,
  text text not null,
  at timestamptz not null default now(),
  by_id uuid references members(id) default auth.uid()
);
create index on activities (entity, entity_id, at desc);

-- ─── row-level security ───
create or replace function my_role() returns app_role language sql stable security definer set search_path = public as
$$ select role from members where id = auth.uid() and active $$;

create or replace function has_role(variadic roles app_role[]) returns boolean language sql stable as
$$ select coalesce(my_role() = any(roles), false) $$;

alter table members enable row level security;
alter table settings enable row level security;
alter table leads enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table project_phases enable row level security;
alter table quotes enable row level security;
alter table quote_sections enable row level security;
alter table quote_items enable row level security;
alter table quote_milestones enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table tasks enable row level security;
alter table activities enable row level security;

-- every active employee can read the directory and company settings
create policy members_read on members for select using (my_role() is not null);
create policy members_admin on members for all using (has_role('director')) with check (has_role('director'));
create policy settings_read on settings for select using (my_role() is not null);
create policy settings_admin on settings for update using (has_role('director','finance_officer'));

-- leads: sales see their own, directors see all
create policy leads_read on leads for select using (has_role('director') or owner_id = auth.uid() or has_role('interior_designer','project_manager'));
create policy leads_write on leads for all using (has_role('director') or (has_role('sales_executive') and owner_id = auth.uid()))
  with check (has_role('director') or (has_role('sales_executive') and owner_id = auth.uid()));

-- clients & projects: everyone reads, delivery + sales leadership write
create policy clients_read on clients for select using (my_role() is not null);
create policy clients_write on clients for all using (has_role('director','sales_executive','project_manager')) with check (has_role('director','sales_executive','project_manager'));
create policy projects_read on projects for select using (my_role() is not null);
create policy projects_write on projects for all using (has_role('director','project_manager')) with check (has_role('director','project_manager'));
create policy phases_read on project_phases for select using (my_role() is not null);
create policy phases_write on project_phases for all using (has_role('director','project_manager','interior_designer','site_engineer')) with check (has_role('director','project_manager','interior_designer','site_engineer'));

-- quotations: sales, directors and finance
create policy quotes_rw on quotes for all using (has_role('director','sales_executive','finance_officer')) with check (has_role('director','sales_executive'));
create policy qs_rw on quote_sections for all using (has_role('director','sales_executive','finance_officer')) with check (has_role('director','sales_executive'));
create policy qi_rw on quote_items for all using (has_role('director','sales_executive','finance_officer')) with check (has_role('director','sales_executive'));
create policy qm_rw on quote_milestones for all using (has_role('director','sales_executive','finance_officer')) with check (has_role('director','sales_executive'));

-- finance: finance + directors write; PMs can read their projects' invoices
create policy invoices_read on invoices for select using (has_role('director','finance_officer') or (has_role('project_manager') and project_id in (select id from projects where manager_id = auth.uid())));
create policy invoices_write on invoices for all using (has_role('director','finance_officer')) with check (has_role('director','finance_officer'));
create policy inv_items_read on invoice_items for select using (invoice_id in (select id from invoices));
create policy inv_items_write on invoice_items for all using (has_role('director','finance_officer')) with check (has_role('director','finance_officer'));
create policy payments_read on payments for select using (invoice_id in (select id from invoices));
create policy payments_write on payments for all using (has_role('director','finance_officer')) with check (has_role('director','finance_officer'));

-- tasks & activity: whole team collaborates
create policy tasks_read on tasks for select using (my_role() is not null);
create policy tasks_write on tasks for all using (my_role() is not null) with check (my_role() is not null);
create policy activities_read on activities for select using (my_role() is not null);
create policy activities_insert on activities for insert with check (my_role() is not null and by_id = auth.uid());
