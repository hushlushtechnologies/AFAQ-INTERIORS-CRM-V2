-- 008 · More company settings: logo, tagline, bank details, default terms
-- Run once in Supabase → SQL Editor (safe to run again).

alter table settings add column if not exists logo text;               -- small PNG/JPEG data URL shown on PDFs
alter table settings add column if not exists tagline text;
alter table settings add column if not exists bank_name text;
alter table settings add column if not exists bank_account_name text;
alter table settings add column if not exists bank_iban text;
alter table settings add column if not exists bank_swift text;
alter table settings add column if not exists quote_terms text;        -- default terms for new quotations
alter table settings add column if not exists invoice_notes text;      -- payment note printed on invoices

do $$ begin
  alter table settings add constraint settings_logo_size check (logo is null or (logo like 'data:image/%' and length(logo) < 400000));
exception when duplicate_object then null; end $$;
