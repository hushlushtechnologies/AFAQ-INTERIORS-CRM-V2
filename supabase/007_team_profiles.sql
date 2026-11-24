-- 007 · Team profiles: optional profile photo + free-text job title
-- Run once in Supabase → SQL Editor (safe to run again).
--
--   job_title  e.g. "Accountant", "Site Supervisor", "Draftsman" — any title the Director types.
--              What a person can SEE and DO still comes from their access role (members.role).
--   photo      small square JPEG stored as a data URL (the app shrinks it to ~256px before saving).

alter table members add column if not exists job_title text;
alter table members add column if not exists photo text;

do $$ begin
  alter table members add constraint members_photo_size check (photo is null or (photo like 'data:image/%' and length(photo) < 300000));
exception when duplicate_object then null; end $$;

-- everyone can change their own photo, even without Team access
create or replace function set_my_photo(p_photo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update members set photo = nullif(p_photo, '') where id = auth.uid() and active;
end $$;

revoke all on function set_my_photo(text) from public;
grant execute on function set_my_photo(text) to authenticated;
