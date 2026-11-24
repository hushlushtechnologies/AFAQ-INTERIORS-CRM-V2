-- ════════════════════════════════════════════════════════════════════
--  Afaq CRM v2 — add DEMO data (for testing). Run in the SQL Editor.
--  Uses your existing team members (rotates work among them).
--  Every demo row is recorded in demo_rows so demo_remove.sql can
--  delete exactly these rows later. Running it twice adds a second set.
-- ════════════════════════════════════════════════════════════════════

create table if not exists demo_rows (tbl text not null, id uuid not null, primary key (tbl, id));
alter table demo_rows enable row level security;  -- not readable from the app

do $$
declare
  dir uuid := (select id from members where active and role = 'director' order by created_at limit 1);
  sales uuid[] := array(select id from members where active and role = 'sales_executive' order by created_at);
  pms uuid[] := array(select id from members where active and role = 'project_manager' order by created_at);
  des uuid[] := array(select id from members where active and role = 'interior_designer' order by created_at);
  anyone uuid[] := array(select id from members where active order by created_at);
  s1 uuid; s2 uuid; pm uuid; dz uuid;
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); c3 uuid := gen_random_uuid(); c4 uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid(); p3 uuid := gen_random_uuid();
  q1 uuid := gen_random_uuid(); q2 uuid := gen_random_uuid(); q3 uuid := gen_random_uuid();
  i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid(); i3 uuid := gen_random_uuid();
  l uuid[] := array(select gen_random_uuid() from generate_series(1, 16));
  sec uuid;
  n int := coalesce((select max(nullif(regexp_replace(ref, '\D', '', 'g'), '')::int) from leads), 3000);
  cn int := coalesce((select max(nullif(regexp_replace(ref, '\D', '', 'g'), '')::int) from clients), 1000);
  y text := to_char(now(), 'YYYY');
  yy text := to_char(now(), 'YY');
  qn int := coalesce((select max(nullif(split_part(ref, '-', 3), '')::int) from quotes where ref like 'QT-' || to_char(now(), 'YYYY') || '-%'), 0);
  inn int := coalesce((select max(nullif(split_part(ref, '-', 3), '')::int) from invoices where ref like 'INV-' || to_char(now(), 'YYYY') || '-%'), 0);
  pn int := coalesce((select max(nullif(substr(ref, 7), '')::int) from projects where ref like 'PRJ-' || to_char(now(), 'YY') || '%'), 0);
  stdterms text := E'1. Prices are in UAE Dirhams and valid for the period stated.\n2. Any change in scope will be quoted separately as a variation.\n3. Timelines start from receipt of the advance payment and design sign-off.';
begin
  if dir is null then raise exception 'No active Director found — run 002_connect_app.sql first.'; end if;
  s1 := coalesce(sales[1], dir);
  s2 := coalesce(sales[2], sales[1], dir);
  pm := coalesce(pms[1], dir);
  dz := coalesce(des[1], dir);

  -- ── clients ──
  insert into clients (id, ref, name, company, phone, email, address, city, type, created_at) values
    (c1, 'CL-' || (cn + 1), 'Khalid Al Mansoori', null, '+971505551201', 'khalid.demo@example.com', 'Frond K, Villa 14', 'Palm Jumeirah', 'Residential', now() - interval '140 days'),
    (c2, 'CL-' || (cn + 2), 'Elena Rossi', 'Rossi Family Office', '+971558203311', 'elena.demo@example.com', 'Gate Village 3, Level 4', 'DIFC', 'Commercial', now() - interval '110 days'),
    (c3, 'CL-' || (cn + 3), 'Maya Thompson', 'Saffron & Sea Restaurant', '+971562107788', 'maya.demo@example.com', 'The Walk, Unit R-12', 'Jumeirah Beach Residence', 'Hospitality', now() - interval '80 days'),
    (c4, 'CL-' || (cn + 4), 'Abdullah Bin Sultan', null, '+971503339090', 'abdullah.demo@example.com', 'Sector E, Villa 21', 'Emirates Hills', 'Residential', now() - interval '45 days');
  insert into demo_rows select 'clients', unnest(array[c1, c2, c3, c4]);

  -- ── leads (incl. Meta ad leads, unassigned, every stage) ──
  insert into leads (id, ref, name, company, phone, alt_phone, email, source, source_detail, external_id, property_type, location, area_sqft, budget, style, stage, priority, owner_id, inquiry_date, expected_start, next_follow_up, notes, lost_reason, client_id, created_at) values
    (l[1],  'LD-' || (n+1),  'Ahmed Al Zarooni', null, '+971502231100', null, 'ahmed.demo@example.com', 'Meta Ads', 'Villa Makeover Nov · Majlis Reel · Form: Free consultation', 'demo-fb-' || l[1], 'Villa', 'Tilal Al Ghaf', 6200, 900000, 'Modern luxury', 'new', 'high', s1, current_date, current_date + 45, current_date,
       E'What type of property: villa (5 bedrooms)\nYour budget (aed): 700k-900k\nWhich community: tilal al ghaf\nWhen do you want to start: within 2 months', null, null, now() - interval '2 hours'),
    (l[2],  'LD-' || (n+2),  'Rebecca Lawson', null, '+971554018822', null, 'rebecca.demo@example.com', 'Instagram', 'Apartment Refresh · Story ad · Form: Get a quote', 'demo-ig-' || l[2], 'Apartment', 'Dubai Marina', 1850, 220000, 'Coastal', 'new', 'normal', s2, current_date, null, current_date + 1,
       E'What type of property: apartment\nYour budget (aed): 200k-250k\nWhich rooms: living, master bedroom', null, null, now() - interval '5 hours'),
    (l[3],  'LD-' || (n+3),  'Omar Siddiqui', null, '+971527719045', null, 'omar.s.demo@example.com', 'Meta Ads', 'Villa Makeover Nov · Before/After carousel · Form: Free consultation', 'demo-fb-' || l[3], 'Townhouse', 'Arabian Ranches', 3100, 380000, null, 'new', 'normal', s1, current_date - 1, null, current_date - 1,
       E'What type of property: townhouse\nYour budget (aed): 300k-400k', null, null, now() - interval '30 hours'),
    (l[4],  'LD-' || (n+4),  'Zest Café', 'Zest F&B', '+97142209988', null, 'hello.demo@zestcafe.example', 'Walk-in', null, null, 'Restaurant', 'Al Wasl', 1600, 280000, null, 'new', 'urgent', null, current_date, current_date + 20, current_date,
       'Café fit-out for 40 covers. Wants to open before Ramadan.', null, null, now() - interval '3 hours'),
    (l[5],  'LD-' || (n+5),  'Priya Raman', null, '+971556612340', '+971501112233', 'priya.demo@example.com', 'Website', null, null, 'Apartment', 'Downtown Dubai', 2400, 360000, 'Japandi', 'new', 'low', null, current_date - 2, null, null,
       'Filled the contact form on the website. Full apartment, 2BR.', null, null, now() - interval '2 days'),
    (l[6],  'LD-' || (n+6),  'Yousef Haddad', 'Haddad Clinics', '+971526673301', null, 'yousef.demo@example.com', 'Google', null, null, 'Office', 'Al Wasl', 4200, 650000, null, 'contacted', 'normal', s2, current_date - 4, current_date + 60, current_date - 1,
       'Clinic reception + 6 consult rooms. Calm, warm, clinical.', null, null, now() - interval '4 days'),
    (l[7],  'LD-' || (n+7),  'Natalia Ivanova', null, '+971569912045', null, 'natalia.demo@example.com', 'Referral', null, null, 'Penthouse', 'Downtown Dubai', 5400, 1400000, 'Art deco', 'contacted', 'high', s1, current_date - 6, null, current_date + 2,
       'Referred by Khalid Al Mansoori.', null, null, now() - interval '6 days'),
    (l[8],  'LD-' || (n+8),  'Mariam Al Shamsi', null, '+971508127766', null, 'mariam.demo@example.com', 'Meta Ads', 'Kitchen Ideas · Video ad · Form: Kitchen consultation', 'demo-fb-' || l[8], 'Townhouse', 'Arabian Ranches', 3100, 380000, 'Japandi', 'requirements', 'normal', s2, current_date - 9, current_date + 30, current_date + 1,
       E'Which rooms: kitchen, ground floor\nYour budget (aed): 350k-400k\nKitchen island must seat 4', null, null, now() - interval '9 days'),
    (l[9],  'LD-' || (n+9),  'Sheikha Al Maktoum', null, '+971501002020', null, 'office.demo@example.com', 'Referral', null, null, 'Villa', 'Mohammed Bin Rashid City', 14500, 4200000, 'Contemporary Arabic', 'site_visit', 'urgent', dir, current_date - 14, current_date + 30, current_date,
       'Whole villa. Site visit Thursday 11am — bring stone & fabric samples.', null, null, now() - interval '14 days'),
    (l[10], 'LD-' || (n+10), 'Karan Malhotra', null, '+971524489000', null, 'karan.demo@example.com', 'Meta Ads', 'Villa Makeover Nov · Majlis Reel · Form: Free consultation', 'demo-fb-' || l[10], 'Villa', 'Jumeirah Golf Estates', 5600, 760000, 'Minimal warm', 'site_visit', 'normal', s1, current_date - 16, null, current_date - 2,
       E'What type of property: villa\nYour budget (aed): 700k-800k', null, null, now() - interval '16 days'),
    (l[11], 'LD-' || (n+11), 'Hessa Al Falasi', null, '+971529081122', null, 'hessa.demo@example.com', 'Instagram', null, null, 'Apartment', 'Downtown Dubai', 2400, 360000, 'Japandi', 'quotation', 'normal', s2, current_date - 21, current_date + 21, current_date + 2,
       'Full apartment. Waiting on revision 2 feedback.', null, null, now() - interval '21 days'),
    (l[12], 'LD-' || (n+12), 'Grand Oasis Hotel', 'Oasis Hospitality LLC', '+97143301200', null, 'projects.demo@oasishosp.example', 'Referral', null, null, 'Hotel', 'Al Barsha', 22000, 3600000, null, 'negotiation', 'urgent', dir, current_date - 38, current_date + 40, current_date + 1,
       'Lobby + 40 keys refresh. Procurement asked for 4% discount.', null, null, now() - interval '38 days'),
    (l[13], 'LD-' || (n+13), 'Abdullah Bin Sultan', null, '+971503339090', null, 'abdullah.demo@example.com', 'Referral', null, null, 'Villa', 'Emirates Hills', 9800, 1960000, null, 'won', 'normal', dir, current_date - 62, null, null, null, null, c4, now() - interval '62 days'),
    (l[14], 'LD-' || (n+14), 'Chris Evans', null, '+971561203344', null, 'chris.demo@example.com', 'Google', null, null, 'Apartment', 'Dubai Marina', 1200, 90000, null, 'lost', 'low', s1, current_date - 30, null, null, null, 'Budget mismatch', null, now() - interval '30 days'),
    (l[15], 'LD-' || (n+15), 'Fatima Noor', null, '+971509091818', null, 'fatima.demo@example.com', 'WhatsApp', null, null, 'Villa', 'Al Barsha', 4800, 520000, 'Classic', 'quotation', 'high', s1, current_date - 19, null, current_date - 3,
       'Quote sent; waiting on husband''s approval.', null, null, now() - interval '19 days'),
    (l[16], 'LD-' || (n+16), 'Tom Whitaker', 'Whitaker & Co', '+971552304419', null, 'tom.demo@example.com', 'Manual entry', null, null, 'Office', 'Business Bay', 2800, 420000, null, 'requirements', 'normal', null, current_date - 11, current_date + 50, current_date + 3,
       'Called the office. 2,800 sqft office, 20 workstations, 2 meeting rooms.', null, null, now() - interval '11 days');
  insert into demo_rows select 'leads', unnest(l);

  -- ── projects ──
  insert into projects (id, ref, name, client_id, type, location, value, budget, spent, start_date, due_date, status, manager_id, designer_id, cover, created_at) values
    (p1, 'PRJ-' || yy || lpad((pn + 1)::text, 2, '0'), 'Frond K Signature Villa', c1, 'Villa', 'Palm Jumeirah', 2850000, 2150000, 1420000, current_date - 120, current_date + 45, 'execution', pm, dz, 'dune', now() - interval '120 days'),
    (p2, 'PRJ-' || yy || lpad((pn + 2)::text, 2, '0'), 'Rossi Family Office Fit-out', c2, 'Office', 'DIFC', 980000, 760000, 702000, current_date - 100, current_date + 6, 'handover', pm, dz, 'night', now() - interval '100 days'),
    (p3, 'PRJ-' || yy || lpad((pn + 3)::text, 2, '0'), 'Emirates Hills Majlis & Pool House', c4, 'Villa', 'Emirates Hills', 1960000, 1480000, 95000, current_date - 30, current_date + 150, 'planning', pm, dz, 'sage', now() - interval '30 days');
  insert into demo_rows select 'projects', unnest(array[p1, p2, p3]);
  insert into project_phases (project_id, position, name, progress)
  select pid, ord - 1, ph, prog
  from (values (p1, array[100,100,100,85,55,0]), (p2, array[100,100,100,100,100,70]), (p3, array[80,10,0,0,0,0])) v(pid, progs),
       unnest(array['Concept & mood board','Detailed design & 3D','Approvals & permits','Procurement','Fit-out & joinery','Styling & handover'], progs) with ordinality u(ph, prog, ord);

  -- ── quotations (with rooms, items, milestones) ──
  insert into quotes (id, ref, version, title, client_id, lead_id, project_id, status, issue_date, valid_until, discount_pct, vat_pct, notes, terms, prepared_by) values
    (q1, 'QT-' || y || '-' || lpad((qn + 1)::text, 3, '0'), 1, 'Il Primo Apartment — Full Interior', null, l[11], null, 'sent', current_date - 6, current_date + 24, 3, 5, 'Large-format porcelain instead of marble to keep within budget.', stdterms, s2),
    (q2, 'QT-' || y || '-' || lpad((qn + 2)::text, 3, '0'), 1, 'Grand Oasis — Lobby & Guest Floor Refresh', null, l[12], null, 'sent', current_date - 12, current_date + 18, 0, 5, 'Includes mock-up room for approval before rollout.', stdterms, dir),
    (q3, 'QT-' || y || '-' || lpad((qn + 3)::text, 3, '0'), 1, 'Emirates Hills Majlis & Pool House', c4, l[13], p3, 'accepted', current_date - 40, current_date - 10, 2, 5, '', stdterms, dir);
  insert into demo_rows select 'quotes', unnest(array[q1, q2, q3]);

  sec := gen_random_uuid();
  insert into quote_sections values (sec, q1, 0, 'Living room');
  insert into quote_items (section_id, position, description, qty, unit, rate) values
    (sec, 0, 'Large-format porcelain flooring 120x120, supply & install', 640, 'sqft', 68),
    (sec, 1, 'Feature wall — fluted oak panelling with LED cove', 1, 'lot', 24500),
    (sec, 2, 'Custom sofa, 3.2m boucle', 1, 'nos', 18900);
  sec := gen_random_uuid();
  insert into quote_sections values (sec, q1, 1, 'Kitchen');
  insert into quote_items (section_id, position, description, qty, unit, rate) values
    (sec, 0, 'Handleless kitchen cabinets, matte lacquer', 14, 'lm', 3950),
    (sec, 1, 'Quartz countertop & splashback', 1, 'lot', 16800);
  sec := gen_random_uuid();
  insert into quote_sections values (sec, q2, 0, 'Reception');
  insert into quote_items (section_id, position, description, qty, unit, rate) values
    (sec, 0, 'Reception desk — travertine & brass', 1, 'nos', 148000),
    (sec, 1, 'Lobby lounge furniture package', 1, 'lot', 386000);
  sec := gen_random_uuid();
  insert into quote_sections values (sec, q2, 1, 'Guest rooms (40 keys)');
  insert into quote_items (section_id, position, description, qty, unit, rate) values (sec, 0, 'Guest room soft refurbishment package', 40, 'nos', 46500);
  sec := gen_random_uuid();
  insert into quote_sections values (sec, q3, 0, 'Majlis');
  insert into quote_items (section_id, position, description, qty, unit, rate) values
    (sec, 0, 'Majlis seating, bespoke', 1, 'set', 165000),
    (sec, 1, 'Carved timber screens', 6, 'nos', 14800);
  sec := gen_random_uuid();
  insert into quote_sections values (sec, q3, 1, 'Outdoor & terrace');
  insert into quote_items (section_id, position, description, qty, unit, rate) values
    (sec, 0, 'Pool house joinery & kitchenette', 1, 'lot', 286000),
    (sec, 1, 'Pergola with louvred roof', 1, 'nos', 178000);
  insert into quote_milestones (quote_id, position, label, pct)
  select q, m.ord - 1, m.label, m.pct from unnest(array[q1, q2, q3]) q,
    (values (1, 'Advance on signing', 40), (2, 'On design approval & procurement', 30), (3, 'On fit-out completion', 25), (4, 'On handover', 5)) m(ord, label, pct);

  -- ── invoices & payments ──
  insert into invoices (id, ref, client_id, project_id, quote_id, title, issue_date, due_date, vat_pct) values
    (i1, 'INV-' || y || '-' || lpad((inn + 1)::text, 3, '0'), c1, p1, null, 'Frond K Villa — Milestone 2 (Procurement)', current_date - 35, current_date - 5, 5),
    (i2, 'INV-' || y || '-' || lpad((inn + 2)::text, 3, '0'), c2, p2, null, 'Rossi Family Office — Milestone 3', current_date - 18, current_date + 12, 5),
    (i3, 'INV-' || y || '-' || lpad((inn + 3)::text, 3, '0'), c4, p3, q3, 'Emirates Hills — Advance on signing', current_date - 8, current_date + 7, 5);
  insert into demo_rows select 'invoices', unnest(array[i1, i2, i3]);
  insert into invoice_items (invoice_id, position, description, qty, unit, rate) values
    (i1, 0, 'Milestone 2 — 30% of contract value', 1, 'lot', 855000),
    (i2, 0, 'Milestone 3 — fit-out completion (25%)', 1, 'lot', 245000),
    (i3, 0, 'Advance — 40% of contract value', 1, 'lot', 784000);
  insert into payments (invoice_id, date, amount, method, reference) values
    (i1, current_date - 20, 500000, 'Bank Transfer', 'ENBD-77812'),
    (i3, current_date - 2, 400000, 'Bank Transfer', 'FAB-55190');

  -- ── tasks ──
  with t as (
    insert into tasks (title, project_id, lead_id, assignee_id, due_date, priority, status) values
      ('Finalise joinery shop drawings — master suite', p1, null, dz, current_date + 1, 'high', 'in_progress'),
      ('Confirm marble slab selection with client', p1, null, pm, current_date, 'high', 'todo'),
      ('Snag list walk-through', p2, null, pm, current_date + 2, 'medium', 'todo'),
      ('Concept presentation — Majlis options A/B', p3, null, dz, current_date + 4, 'medium', 'in_progress'),
      ('Call Ahmed Al Zarooni (Meta lead)', null, l[1], s1, current_date, 'high', 'todo'),
      ('Call Yousef Haddad re: clinic brief', null, l[6], s2, current_date - 1, 'medium', 'todo'),
      ('Prepare samples for MBR City site visit', null, l[9], dz, current_date, 'high', 'todo'),
      ('Revise Grand Oasis quote with 4% discount option', null, l[12], dir, current_date + 1, 'high', 'in_progress'),
      ('Assign Zest Café enquiry to a sales executive', null, l[4], dir, current_date, 'medium', 'todo'),
      ('Chase Milestone 2 balance — Frond K', p1, null, coalesce((select id from members where active and role = 'finance_officer' limit 1), dir), current_date, 'high', 'todo')
    returning id
  ) insert into demo_rows select 'tasks', id from t;

  -- ── activity timeline ──
  with a as (
    insert into activities (entity, entity_id, type, text, at, by_id) values
      ('lead', l[1], 'system', 'Lead received from Facebook lead form — Villa Makeover Nov · Majlis Reel · Form: Free consultation', now() - interval '2 hours', s1),
      ('lead', l[2], 'system', 'Lead received from Instagram lead form — Apartment Refresh · Story ad', now() - interval '5 hours', s2),
      ('lead', l[3], 'system', 'Lead received from Facebook lead form — Villa Makeover Nov · Before/After carousel', now() - interval '30 hours', s1),
      ('lead', l[4], 'note', 'Walked into the office. Wants to open before Ramadan — needs a fast turnaround.', now() - interval '3 hours', dir),
      ('lead', l[6], 'call', 'Spoke to Yousef — wants proposal for reception + 6 consult rooms. Call back next week.', now() - interval '3 days', s2),
      ('lead', l[8], 'meeting', 'Requirements session — Japandi, light oak, kitchen island must seat 4.', now() - interval '5 days', s2),
      ('lead', l[9], 'meeting', 'Intro meeting at office. Whole villa, ~14,500 sqft.', now() - interval '10 days', dir),
      ('lead', l[12], 'meeting', 'Negotiation meeting with procurement head. Requested 4% discount and 60-day credit.', now() - interval '2 days', dir),
      ('lead', l[15], 'call', 'Fatima asked for payment plan options. Sent milestone breakdown on WhatsApp.', now() - interval '4 days', s1),
      ('project', p1, 'site_visit', 'Site inspection: ceiling works 90% complete, joinery install starts Monday.', now() - interval '1 day', pm),
      ('project', p2, 'note', 'Client walk-through done. Minor snags on glass partition seals.', now() - interval '1 day', pm),
      ('project', p3, 'note', 'Client approved concept direction; 3D renders in progress.', now() - interval '3 days', dz)
    returning id
  ) insert into demo_rows select 'activities', id from a;

  -- ── 12 months of history so the dashboard charts have shape ──
  perform setseed(0.42);
  declare
    hc uuid; hp uuid; hi uuid; amt numeric; issued int; paid int; k int;
    hnames text[] := array['Rania Khoury','James Carter','Aisha Al Hammadi','Vikash Patel','Sophie Laurent','Hamad Al Ketbi','Lena Fischer','Mohammed Rafi','Claire Dubois','Saeed Al Mazrouei','Anita Desai','Daniel Kim','Noor Al Huda','Peter Novak','Layla Saeed','Tariq Aziz','Emma Wilson','Faris Al Amiri','Grace Liu','Rashed Lootah','Isabel Santos','Kareem Nasser','Olga Petrova','Sami Haddad'];
    hsrc text[] := array['Meta Ads','Meta Ads','Meta Ads','Instagram','Instagram','Referral','Referral','Website','Walk-in','Google','WhatsApp'];
    htype text[] := array['Villa','Apartment','Penthouse','Townhouse','Office'];
    hloc text[] := array['Dubai Hills Estate','Palm Jumeirah','Arabian Ranches','Business Bay','Jumeirah Village Circle','Damac Hills','Al Barsha','Dubai Marina','Mirdif'];
    owners uuid[] := coalesce(nullif(sales, '{}'), array[dir]);
    people uuid[] := coalesce(nullif(anyone, '{}'), array[dir]);
    pr record; lid uuid; ago int; stg text; src text; r float; ord int := 0;
    h_leads uuid[] := '{}';
  begin
    -- past leads, mostly closed
    for i in 1..60 loop
      lid := gen_random_uuid(); ago := 25 + floor(random() * 330)::int; r := random();
      stg := case when r < 0.32 then 'won' when r < 0.78 then 'lost' else (array['contacted','requirements','quotation'])[1 + floor(random() * 3)::int] end;
      src := hsrc[1 + floor(random() * array_length(hsrc, 1))::int];
      insert into leads (id, ref, name, phone, source, source_detail, external_id, property_type, location, area_sqft, budget, stage, priority, owner_id, inquiry_date, lost_reason, created_at)
      values (lid, 'LD-0', hnames[1 + (i % 24)], '+9715' || (10000000 + floor(random() * 89999999)::int), src,
        case when src = 'Meta Ads' then 'Villa Makeover · Majlis Reel · Form: Free consultation' end,
        case when src in ('Meta Ads','Instagram') then 'demo-hist-' || lid end,
        htype[1 + floor(random() * 5)::int], hloc[1 + floor(random() * 9)::int], 1200 + floor(random() * 6000)::int, round((150 + random() * 1400) / 10) * 10000,
        stg::lead_stage, 'normal', owners[1 + floor(random() * array_length(owners, 1))::int], current_date - ago,
        case when stg = 'lost' then (array['Budget mismatch','Chose another company','Project postponed','No response'])[1 + floor(random() * 4)::int] end,
        now() - make_interval(days => ago));
      h_leads := h_leads || lid;
    end loop;
    insert into demo_rows select 'leads', unnest(h_leads);

    -- finished / older projects, each billed in milestones and paid 2–4 weeks later
    inn := inn + 3; -- after the three current invoices above
    for pr in select * from (values
      ('Al Furjan Villa','Villa','Al Furjan',690000,345), ('Silicon Oasis Clinic','Office','Dubai Silicon Oasis',480000,300),
      ('Jumeirah Islands Mansion','Villa','Jumeirah Islands',1960000,262), ('City Walk Boutique','Retail','City Walk',390000,225),
      ('Jumeirah Golf Villa','Villa','Jumeirah Golf Estates',1450000,175), ('Bay Square Showroom','Retail','Business Bay',520000,160),
      ('Marina Penthouse 4402','Penthouse','Dubai Marina',1180000,140), ('Mirdif Family Villa','Villa','Mirdif',760000,118),
      ('DIFC Law Office','Office','DIFC',610000,92), ('Damac Hills Townhouse','Townhouse','Damac Hills',430000,64),
      ('Creek Harbour Apartment','Apartment','Dubai Creek Harbour',345000,21), ('Al Barari Garden Villa','Villa','Al Barari',1240000,9)
    ) v(name, ptype, loc, val, ago) loop
      ord := ord + 1;
      hc := gen_random_uuid(); hp := gen_random_uuid();
      insert into clients (id, ref, name, phone, city, type, created_at) values (hc, 'CL-' || (cn + 10 + ord), hnames[1 + ((ord * 5) % 24)], '+971500000000', pr.loc,
        (case when pr.ptype in ('Office','Retail') then 'Commercial' else 'Residential' end)::client_type, now() - make_interval(days => pr.ago + 10));
      insert into projects (id, ref, name, client_id, type, location, value, budget, spent, start_date, due_date, status, manager_id, designer_id, cover, created_at)
      values (hp, 'PRJ-' || yy || lpad((pn + 10 + ord)::text, 2, '0'), pr.name, hc, pr.ptype, pr.loc, pr.val, round(pr.val * 0.76),
        round(pr.val * case when pr.ago > 110 then 0.74 when pr.ago < 30 then 0.04 else 0.45 end),
        current_date - pr.ago, current_date - pr.ago + 120,
        (case when pr.ago > 110 then 'completed' when pr.ago < 15 then 'planning' when pr.ago < 30 then 'design' when pr.ago > 80 then 'handover' else 'execution' end)::project_status,
        pm, dz, (array['stone','clay','night','ivory','sage','dune'])[1 + (ord % 6)], now() - make_interval(days => pr.ago));
      insert into project_phases (project_id, position, name, progress)
      select hp, o - 1, ph, case when pr.ago > 110 then 100 when pr.ago < 30 then case when o = 1 then 60 else 0 end else greatest(0, least(100, 100 - (o - 1) * 18 - case when pr.ago < 80 then 25 else 0 end)) end
      from unnest(array['Concept & mood board','Detailed design & 3D','Approvals & permits','Procurement','Fit-out & joinery','Styling & handover']) with ordinality u(ph, o);
      insert into demo_rows values ('clients', hc), ('projects', hp);
      k := 0;
      foreach amt in array array[0.40, 0.30, 0.25, 0.05] loop
        issued := pr.ago - k * 32;
        exit when issued < 3;
        hi := gen_random_uuid();
        inn := inn + 1;
        insert into invoices (id, ref, client_id, project_id, title, issue_date, due_date, vat_pct)
        values (hi, 'INV-' || y || '-' || lpad(inn::text, 3, '0'), hc, hp, pr.name || ' — Milestone ' || (k + 1), current_date - issued, current_date - issued + 15, 5);
        insert into invoice_items (invoice_id, position, description, qty, unit, rate) values (hi, 0, 'Milestone ' || (k + 1) || ' — ' || (amt * 100)::int || '%', 1, 'lot', round(pr.val * amt));
        paid := issued - 12 - floor(random() * 14)::int;
        if paid > 0 then insert into payments (invoice_id, date, amount, method) values (hi, current_date - paid, round(pr.val * amt * 1.05), 'Bank Transfer'); end if;
        insert into demo_rows values ('invoices', hi);
        k := k + 1;
      end loop;
    end loop;

    -- daily team rhythm (calls, meetings, visits, notes) for the activity heatmap
    with a as (
      insert into activities (entity, entity_id, type, text, at, by_id)
      select 'lead', h_leads[1 + floor(random() * array_length(h_leads, 1))::int], t.kind::activity_type,
             case t.kind when 'call' then 'Follow-up call with client' when 'meeting' then 'Design review meeting' when 'site_visit' then 'Site visit & measurements' when 'email' then 'Sent revised drawings' else 'Updated client brief' end,
             (current_date - g.ago) + make_interval(hours => 9 + floor(random() * 8)::int), people[1 + floor(random() * array_length(people, 1))::int]
      from generate_series(1, 83) g(ago)
      cross join lateral generate_series(1, case when extract(dow from current_date - g.ago) = 5 then floor(random() * 2)::int else 1 + floor(random() * 6)::int end) n
      cross join lateral (select (array['call','call','note','meeting','site_visit','email'])[1 + floor(random() * 6)::int] as kind) t
      returning id
    ) insert into demo_rows select 'activities', id from a;
  end;

  raise notice 'Demo data added: current leads, clients, projects, quotations, invoices and tasks, plus 12 months of history.';
end $$;

select tbl as "added", count(*) from demo_rows group by tbl order by tbl;
