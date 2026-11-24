-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — step 6: lead form fields (run ONCE). Safe to re-run.
--  Alternate phone, expected start, inquiry date, priority, unassigned leads.
-- ════════════════════════════════════════════════════════════════════

alter table leads add column if not exists alt_phone text;
alter table leads add column if not exists expected_start date;
alter table leads add column if not exists inquiry_date date not null default current_date;
alter table leads add column if not exists priority text not null default 'normal';
alter table leads drop constraint if exists leads_priority_check;
alter table leads add constraint leads_priority_check check (priority in ('low','normal','high','urgent'));

-- leads may be created "Unassigned" and handed out later
alter table leads alter column owner_id drop not null;

-- existing leads: inquiry date = the day they were created
update leads set inquiry_date = created_at::date where inquiry_date = current_date and created_at::date <> current_date;

select 'ok — lead form fields added' as status;
