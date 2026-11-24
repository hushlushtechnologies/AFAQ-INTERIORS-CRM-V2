# Afaq Al Manzel Interiors — CRM v2

A fresh, premium CRM for Afaq Al Manzel Interiors: leads → quotations → clients & projects → invoices, plus team tasks and a live dashboard.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Motion · dnd-kit · Recharts · Zustand.

## Run it (Windows / PowerShell)

```powershell
cd "$HOME\Desktop\interior crm\afaq-crm-v2"
npm install
npm run dev
```

Open http://localhost:3000. Demo data loads on first run. **Settings → Reset demo data** restores it, and **Clear all records** starts clean.

## Modules

| Area | What it does |
| --- | --- |
| Dashboard | Greeting banner, pipeline, contracted work, collections, receivables, cash-flow chart, pipeline funnel, follow-ups, live projects, my tasks, activity |
| Leads & Pipeline | Drag-and-drop Kanban (New → Contacted → Requirements → Site visit → Quotation → Negotiation → Won/Lost), sortable table, "follow-ups due" view, duplicate detection, lost reasons, reopen, won → client + project conversion |
| Lead detail | Stage stepper, call / WhatsApp / email, brief, follow-up scheduling, timeline (calls, meetings, site visits, notes), linked quotes & tasks |
| Quotations | Room-by-room builder, units, discount, VAT, payment milestones, notes & T&Cs, versioning (sent versions lock and you revise), status flow, branded print / PDF, invoice a milestone |
| Clients | Segmented directory with contract value & balance, client profile with projects, quotes, invoices, notes |
| Projects | Cover cards with status and progress, phase sliders, schedule vs progress, cost vs budget, billing, team, site log |
| Invoices & Payments | Tax invoices, part payments, overdue tracking, receivables KPIs, cancel (kept on record), branded print / PDF |
| Tasks | Kanban by status with drag-and-drop, linked to projects or leads, priorities, overdue flags |
| Team | Members by role with workload stats, add / edit / deactivate, "view as" to see someone's dashboard |
| Settings | Letterhead details, TRN, VAT %, validity and payment terms, JSON backup / restore |

Global: **Ctrl + K** search across everything, follow-up bell, quick-create, responsive mobile layout.

## Architecture

```
src/
  app/                 routes (one folder per module, [id] = detail, /print = printable doc)
  components/ui        design system (Button, Card, Modal, Field, Badge, Segmented…)
  components/layout    sidebar shell, command palette, toasts
  components/*.tsx     module modals (lead, task, client, project), activity feed, print document
  lib/types.ts         domain model
  lib/store.ts         all reads & writes go through these actions
  lib/utils.ts         money formatting + quote / invoice calculations (single source of truth)
  lib/seed.ts          demo data
supabase/schema.sql    Phase 2 database, with row-level security by role
```

## Supabase (live, multi-user)

The app runs in two modes:

- **Demo mode:** no `.env.local` keys. Data lives in the browser and loads with sample data.
- **Live mode:** `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A login is required and all data is saved to Supabase.

One-time setup in a new Supabase project:

1. SQL Editor → run `supabase/schema.sql`
2. Authentication → Users → add the first user (the Director)
3. SQL Editor → run `supabase/002_connect_app.sql` (makes the first user the Director, creates the settings row)

3b. SQL Editor → run `supabase/003_permissions.sql` (role-based permissions)

Adding staff: create their login in Authentication → Users, then add them on the Team page with the same email and a role. Row-level security limits what each role can see and change.

How saving works: the UI updates instantly, and `src/lib/db.ts` writes the changes to Supabase about half a second later, in batches. The top bar shows Saving… / Saved / Not saved.

## Roles & permissions

Go to **Team → Roles & permissions**. For each role, a Director sets every section to **None**, **View** or **Edit**. Leads, projects and tasks can also be limited to **Own only**. Directors always have full access.

- **In the app:** sections the role can't open are hidden from the sidebar, search and dashboard, and their pages show "no access". View-only sections hide or disable every create, edit and delete control.
- **In the database:** every table's row-level security reads the same `role_permissions` table, so a person can't read or change hidden data even outside the app (API, browser console).
- **In demo mode:** "View as" on the Team page shows the app with that person's permissions. Own-only filtering is enforced by the database, so it only applies in live mode.

## Staff logins (no Supabase dashboard needed)

One-time developer setup:

1. Supabase → Project Settings → API Keys → **Secret keys** → copy the `sb_secret_…` key.
2. Add it to `.env.local` (and to the hosting provider's environment variables when deploying):
   ```
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
   It is used only by `src/app/api/team/route.ts` on the server. Never prefix it with `NEXT_PUBLIC_`.
3. SQL Editor → run `supabase/004_staff_logins.sql`.

After that, a Director does everything from **Team**:
- **Add member:** name, email, role and a generated password. The login is created, and the app shows a ready-to-send message (Copy or WhatsApp).
- **Reset password** on a member card.
- **Edit → untick Active:** blocks their login. Ticking it again restores access.
- Every employee can use **Change my password** by clicking their name at the top right.

## Meta lead ads → CRM (automatic)

When someone submits a Facebook/Instagram instant form, Meta calls `/api/meta/webhook`. The app then:

1. checks Meta's signature, so fake requests are rejected;
2. fetches the full lead from the Graph API;
3. saves it as a **New** lead with source *Meta Ads* or *Instagram*, the campaign, ad and form name, and every form answer in the notes. Budget, size, community, property type and style are also filled in when the form asks for them;
4. assigns it to the next Sales Executive in rotation (the Director if there are none);
5. shows it immediately in every open CRM window, with a "New lead" toast.

If Meta sends the same lead twice, it is saved only once.

Environment variables (`.env.local` and Vercel):
```
META_VERIFY_TOKEN=any-long-random-text-you-choose
META_APP_SECRET=...            # Meta app → App settings → Basic → App secret
META_PAGE_ACCESS_TOKEN=...     # long-lived Page token with leads_retrieval
# META_GRAPH_VERSION=v25.0     # optional
```

## AI Studio (Google Gemini)

```
GEMINI_API_KEY=...             # https://aistudio.google.com/apikey (billing enabled)
# GEMINI_IMAGE_MODEL=gemini-3.1-flash-image   # optional; e.g. gemini-3.1-flash-lite-image for lower cost
```
- Photos are uploaded on a lead or project, or inside AI Studio. They are stored privately in the Supabase Storage bucket `crm-media`, created by `005_meta_leads_ai_studio.sql`.
- AI Studio redesigns a selected photo, keeping the walls and windows by default, or creates a concept from scratch. Every result is saved to the lead or project, with a before/after slider, Refine and Download.
- A monthly image limit (Settings → Integrations, default 100) protects the budget.
- The **AI Studio** permission controls who can view designs and who can generate them.
