"use client";

/**
 * Supabase sync layer.
 *
 * The UI keeps using the Zustand store. When Supabase is configured:
 *  - loadAll() fills the store from the database after sign-in
 *  - startSync() watches the store and writes every change back
 *    (batched, debounced, in foreign-key order, one flush at a time)
 */

import type {
  Activity,
  Client,
  Invoice,
  Lead,
  Member,
  Project,
  Quote,
  Role,
  Settings,
  Permissions,
  Module,
  Task,
} from "./types";
import { supabase } from "./supabase/client";
import { useStore, type Store } from "./store";
import { buildSeed } from "./seed";
import { isUuid, uid } from "./utils";
import { DEFAULT_PERMISSIONS } from "./constants";

/* ───────────── helpers ───────────── */

type Row = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : v);
const u = <T,>(v: T | null | undefined) => (v === null || v === undefined ? undefined : v);
const num = (v: unknown) => Number(v ?? 0);
const childId = (id?: string) => (isUuid(id) ? id! : uid());

const ROLE_TO_DB: Record<Role, string> = {
  Director: "director",
  "Sales Executive": "sales_executive",
  "Project Manager": "project_manager",
  "Interior Designer": "interior_designer",
  "Site Engineer": "site_engineer",
  "Procurement Officer": "procurement_officer",
  "Finance Officer": "finance_officer",
};
const ROLE_FROM_DB = Object.fromEntries(Object.entries(ROLE_TO_DB).map(([k, v]) => [v, k])) as Record<string, Role>;
export const roleToDb = (r: Role) => ROLE_TO_DB[r];

/* ───────────── row mappers ───────────── */

const memberFrom = (r: Row): Member => ({
  id: r.id as string,
  name: r.name as string,
  role: ROLE_FROM_DB[r.role as string] ?? "Sales Executive",
  email: r.email as string,
  phone: (r.phone as string) ?? "",
  tone: (r.tone as string) ?? "#9D825D",
  active: r.active as boolean,
  title: (r.job_title as string) || undefined,
  photo: (r.photo as string) || undefined,
});
const memberTo = (m: Member): Row => ({
  id: m.id, name: m.name, role: ROLE_TO_DB[m.role], email: m.email, phone: n(m.phone), tone: m.tone, active: m.active,
  // only sent once set, so the app keeps working before 007_team_profiles.sql is run
  ...(m.title !== undefined ? { job_title: n(m.title.trim()) } : {}),
  ...(m.photo !== undefined ? { photo: n(m.photo) } : {}),
});

const settingsFrom = (r: Row, currentUserId: string): Settings => ({
  companyName: (r.company_name as string) ?? "",
  legalName: (r.legal_name as string) ?? "",
  trn: (r.trn as string) ?? "",
  address: (r.address as string) ?? "",
  phone: (r.phone as string) ?? "",
  email: (r.email as string) ?? "",
  website: (r.website as string) ?? "",
  currency: (r.currency as string) ?? "AED",
  vatPct: num(r.vat_pct),
  quoteValidityDays: num(r.quote_validity_days) || 30,
  invoiceDueDays: num(r.invoice_due_days) || 15,
  aiMonthlyLimit: num(r.ai_monthly_limit) || 100,
  currentUserId,
  logo: (r.logo as string) || undefined,
  tagline: (r.tagline as string) ?? undefined,
  bankName: (r.bank_name as string) ?? undefined,
  bankAccountName: (r.bank_account_name as string) ?? undefined,
  bankIban: (r.bank_iban as string) ?? undefined,
  bankSwift: (r.bank_swift as string) ?? undefined,
  quoteTerms: (r.quote_terms as string) ?? undefined,
  invoiceNotes: (r.invoice_notes as string) ?? undefined,
});
// the extra columns are only sent once used, so saving works before 008_settings_extra.sql is run
const optional = (v: string | undefined, col: string) => (v !== undefined ? { [col]: v === "" ? null : v } : {});
const settingsTo = (s: Settings): Row => ({
  company_name: s.companyName,
  legal_name: s.legalName,
  trn: s.trn,
  address: s.address,
  phone: s.phone,
  email: s.email,
  website: s.website,
  currency: s.currency,
  vat_pct: s.vatPct,
  quote_validity_days: s.quoteValidityDays,
  invoice_due_days: s.invoiceDueDays,
  ai_monthly_limit: s.aiMonthlyLimit,
  ...optional(s.logo, "logo"),
  ...optional(s.tagline, "tagline"),
  ...optional(s.bankName, "bank_name"),
  ...optional(s.bankAccountName, "bank_account_name"),
  ...optional(s.bankIban, "bank_iban"),
  ...optional(s.bankSwift, "bank_swift"),
  ...optional(s.quoteTerms, "quote_terms"),
  ...optional(s.invoiceNotes, "invoice_notes"),
});

const clientFrom = (r: Row): Client => ({
  id: r.id as string,
  ref: r.ref as string,
  name: r.name as string,
  company: u(r.company as string),
  phone: (r.phone as string) ?? "",
  email: (r.email as string) ?? "",
  address: (r.address as string) ?? "",
  city: (r.city as string) ?? "",
  type: r.type as Client["type"],
  createdAt: r.created_at as string,
});
const clientTo = (c: Client): Row => ({
  id: c.id, ref: c.ref, name: c.name, company: n(c.company), phone: n(c.phone), email: n(c.email), address: n(c.address), city: n(c.city), type: c.type, created_at: c.createdAt,
});

const leadFrom = (r: Row): Lead => ({
  id: r.id as string,
  ref: r.ref as string,
  name: r.name as string,
  company: u(r.company as string),
  phone: (r.phone as string) ?? "",
  altPhone: u(r.alt_phone as string),
  email: (r.email as string) ?? "",
  source: r.source as Lead["source"],
  propertyType: r.property_type as Lead["propertyType"],
  location: (r.location as string) ?? "",
  areaSqft: num(r.area_sqft),
  budget: num(r.budget),
  style: u(r.style as string),
  stage: r.stage as Lead["stage"],
  ownerId: (r.owner_id as string) ?? "",
  priority: ((r.priority as string) ?? "normal") as Lead["priority"],
  inquiryDate: u(r.inquiry_date as string),
  expectedStart: u(r.expected_start as string),
  createdAt: r.created_at as string,
  nextFollowUp: u(r.next_follow_up as string),
  notes: u(r.notes as string),
  lostReason: u(r.lost_reason as string),
  clientId: u(r.client_id as string),
  sourceDetail: u(r.source_detail as string),
  externalId: u(r.external_id as string),
});
const leadTo = (l: Lead): Row => ({
  id: l.id, ref: l.ref, name: l.name, company: n(l.company), phone: n(l.phone), email: n(l.email), source: l.source, property_type: l.propertyType,
  location: n(l.location), area_sqft: Math.round(l.areaSqft || 0), budget: l.budget || 0, style: n(l.style), stage: l.stage, owner_id: n(l.ownerId),
  next_follow_up: n(l.nextFollowUp), notes: n(l.notes), lost_reason: n(l.lostReason), client_id: n(l.clientId), created_at: l.createdAt,
  source_detail: n(l.sourceDetail),
  alt_phone: n(l.altPhone),
  priority: l.priority ?? "normal",
  inquiry_date: l.inquiryDate ?? l.createdAt.slice(0, 10),
  expected_start: n(l.expectedStart),
});

const projectFrom = (r: Row, phases: Row[]): Project => ({
  id: r.id as string,
  ref: r.ref as string,
  name: r.name as string,
  clientId: r.client_id as string,
  type: r.type as Project["type"],
  location: (r.location as string) ?? "",
  value: num(r.value),
  budget: num(r.budget),
  spent: num(r.spent),
  startDate: r.start_date as string,
  dueDate: r.due_date as string,
  status: r.status as Project["status"],
  managerId: (r.manager_id as string) ?? "",
  designerId: (r.designer_id as string) ?? "",
  cover: (r.cover as string) ?? "dune",
  phases: phases
    .filter((p) => p.project_id === r.id)
    .sort((a, b) => num(a.position) - num(b.position))
    .map((p) => ({ id: p.id as string, name: p.name as string, progress: num(p.progress) })),
});
const projectTo = (p: Project): Row => ({
  id: p.id, ref: p.ref, name: p.name, client_id: p.clientId, type: p.type, location: n(p.location), value: p.value || 0, budget: p.budget || 0, spent: p.spent || 0,
  start_date: p.startDate, due_date: p.dueDate, status: p.status, manager_id: n(p.managerId), designer_id: n(p.designerId), cover: p.cover,
});

const quoteFrom = (r: Row, sections: Row[], items: Row[], milestones: Row[]): Quote => ({
  id: r.id as string,
  ref: r.ref as string,
  version: num(r.version),
  title: r.title as string,
  clientId: u(r.client_id as string),
  leadId: u(r.lead_id as string),
  projectId: u(r.project_id as string),
  status: r.status as Quote["status"],
  issueDate: r.issue_date as string,
  validUntil: r.valid_until as string,
  discountPct: num(r.discount_pct),
  vatPct: num(r.vat_pct),
  notes: (r.notes as string) ?? "",
  terms: (r.terms as string) ?? "",
  preparedById: (r.prepared_by as string) ?? "",
  sections: sections
    .filter((s) => s.quote_id === r.id)
    .sort((a, b) => num(a.position) - num(b.position))
    .map((s) => ({
      id: s.id as string,
      room: s.room as string,
      items: items
        .filter((i) => i.section_id === s.id)
        .sort((a, b) => num(a.position) - num(b.position))
        .map((i) => ({ id: i.id as string, description: (i.description as string) ?? "", qty: num(i.qty), unit: i.unit as string, rate: num(i.rate) })),
    })),
  milestones: milestones
    .filter((m) => m.quote_id === r.id)
    .sort((a, b) => num(a.position) - num(b.position))
    .map((m) => ({ id: m.id as string, label: m.label as string, pct: num(m.pct) })),
});
const quoteTo = (q: Quote): Row => ({
  id: q.id, ref: q.ref, version: q.version, title: q.title, client_id: n(q.clientId), lead_id: n(q.leadId), project_id: n(q.projectId), status: q.status,
  issue_date: q.issueDate, valid_until: q.validUntil, discount_pct: q.discountPct || 0, vat_pct: q.vatPct || 0, notes: q.notes, terms: q.terms, prepared_by: n(q.preparedById),
});

const invoiceFrom = (r: Row, items: Row[], payments: Row[]): Invoice => ({
  id: r.id as string,
  ref: r.ref as string,
  clientId: r.client_id as string,
  projectId: u(r.project_id as string),
  quoteId: u(r.quote_id as string),
  title: r.title as string,
  issueDate: r.issue_date as string,
  dueDate: r.due_date as string,
  vatPct: num(r.vat_pct),
  cancelled: (r.cancelled as boolean) || undefined,
  items: items
    .filter((i) => i.invoice_id === r.id)
    .sort((a, b) => num(a.position) - num(b.position))
    .map((i) => ({ id: i.id as string, description: (i.description as string) ?? "", qty: num(i.qty), unit: i.unit as string, rate: num(i.rate) })),
  payments: payments
    .filter((p) => p.invoice_id === r.id)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((p) => ({ id: p.id as string, date: p.date as string, amount: num(p.amount), method: p.method as Invoice["payments"][number]["method"], reference: u(p.reference as string) })),
});
const invoiceTo = (i: Invoice): Row => ({
  id: i.id, ref: i.ref, client_id: i.clientId, project_id: n(i.projectId), quote_id: n(i.quoteId), title: i.title, issue_date: i.issueDate, due_date: i.dueDate,
  vat_pct: i.vatPct || 0, cancelled: !!i.cancelled,
});

const taskFrom = (r: Row): Task => ({
  id: r.id as string,
  title: r.title as string,
  description: u(r.description as string),
  projectId: u(r.project_id as string),
  leadId: u(r.lead_id as string),
  assigneeId: r.assignee_id as string,
  dueDate: r.due_date as string,
  priority: r.priority as Task["priority"],
  status: r.status as Task["status"],
  createdAt: r.created_at as string,
});
const taskTo = (t: Task): Row => ({
  id: t.id, title: t.title, description: n(t.description), project_id: n(t.projectId), lead_id: n(t.leadId), assignee_id: t.assigneeId, due_date: t.dueDate,
  priority: t.priority, status: t.status, created_at: t.createdAt,
});

const activityFrom = (r: Row): Activity => ({
  id: r.id as string,
  entity: r.entity as Activity["entity"],
  entityId: r.entity_id as string,
  type: r.type as Activity["type"],
  text: r.text as string,
  at: r.at as string,
  byId: (r.by_id as string) ?? "",
});
const activityTo = (a: Activity): Row => ({ id: a.id, entity: a.entity, entity_id: a.entityId, type: a.type, text: a.text, at: a.at, by_id: a.byId });

const permissionsFrom = (rows: Row[]): Permissions => {
  const p = structuredClone(DEFAULT_PERMISSIONS);
  for (const r of rows) {
    const role = ROLE_FROM_DB[r.role as string];
    if (!role || role === "Director") continue;
    const mod = r.module as Module;
    if (p[role]?.[mod]) p[role][mod] = { access: r.access as "none" | "view" | "edit", scope: r.scope as "own" | "all" };
  }
  return p;
};

/* ───────────── load ───────────── */

async function all(table: string, order?: { col: string; asc?: boolean; limit?: number }) {
  let q = supabase().from(table).select("*");
  if (order) q = q.order(order.col, { ascending: order.asc ?? true });
  if (order?.limit) q = q.limit(order.limit);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

export type LoadResult = { ok: true } | { ok: false; reason: "no-member" | "error"; message?: string };

export async function loadAll(userId: string): Promise<LoadResult> {
  try {
    const members = await all("members", { col: "name" });
    if (!members.some((m) => m.id === userId && m.active)) return { ok: false, reason: "no-member" };
    const [permRows, settingsRows, clients, leads, projects, phases, quotes, sections, items, milestones, invoices, invItems, payments, tasks, activities] = await Promise.all([
      all("role_permissions").catch(() => [] as Row[]), // table exists after 003_permissions.sql
      all("settings"),
      all("clients", { col: "created_at", asc: false }),
      all("leads", { col: "created_at", asc: false }),
      all("projects", { col: "created_at", asc: false }),
      all("project_phases"),
      all("quotes", { col: "created_at", asc: false }),
      all("quote_sections"),
      all("quote_items"),
      all("quote_milestones"),
      all("invoices", { col: "created_at", asc: false }),
      all("invoice_items"),
      all("payments"),
      all("tasks", { col: "due_date" }),
      all("activities", { col: "at", asc: false, limit: 1000 }),
    ]);
    pauseSync(() =>
      useStore.setState({
        members: members.map(memberFrom),
        permissions: permissionsFrom(permRows),
        settings: settingsRows[0] ? settingsFrom(settingsRows[0], userId) : { ...useStore.getState().settings, currentUserId: userId },
        clients: clients.map(clientFrom),
        leads: leads.map(leadFrom),
        projects: projects.map((p) => projectFrom(p, phases)),
        quotes: quotes.map((q) => quoteFrom(q, sections, items, milestones)),
        invoices: invoices.map((i) => invoiceFrom(i, invItems, payments)),
        tasks: tasks.map(taskFrom),
        activities: activities.map(activityFrom),
      }),
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "error", message: (e as Error).message };
  }
}

/* ───────────── sync ───────────── */

const ORDER = ["clients", "leads", "projects", "quotes", "invoices", "tasks", "activities"] as const;
type Col = (typeof ORDER)[number];

let paused = false;
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<void> = Promise.resolve();
const upserts: Record<Col, Set<string>> = Object.fromEntries(ORDER.map((c) => [c, new Set<string>()])) as Record<Col, Set<string>>;
const deletes: Record<Col, Set<string>> = Object.fromEntries(ORDER.map((c) => [c, new Set<string>()])) as Record<Col, Set<string>>;
const memberUpdates = new Set<string>();
let settingsDirty = false;
let permissionsDirty = false;

type Status = "idle" | "saving" | "error";
let status: Status = "idle";
const listeners = new Set<(s: Status, msg?: string) => void>();
const setStatus = (s: Status, msg?: string) => {
  status = s;
  listeners.forEach((l) => l(s, msg));
};
export const onSyncStatus = (l: (s: Status, msg?: string) => void) => {
  listeners.add(l);
  l(status);
  return () => void listeners.delete(l);
};

export function pauseSync(fn: () => void) {
  paused = true;
  try {
    fn();
  } finally {
    paused = false;
  }
}

function schedule(delay = 600) {
  if (timer) clearTimeout(timer);
  setStatus("saving");
  timer = setTimeout(() => {
    timer = null;
    chain = chain.then(flush).catch(() => undefined);
  }, delay);
}

export function flushNow() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    chain = chain.then(flush).catch(() => undefined);
  }
  return chain;
}

export function startSync() {
  if (started) return;
  started = true;
  useStore.subscribe((next, prev) => {
    if (paused) return;
    let dirty = false;
    for (const col of ORDER) {
      const a = prev[col] as { id: string }[];
      const b = next[col] as { id: string }[];
      if (a === b) continue;
      const before = new Map(a.map((x) => [x.id, x]));
      for (const x of b) {
        if (before.get(x.id) !== x) {
          upserts[col].add(x.id);
          deletes[col].delete(x.id);
          dirty = true;
        }
        before.delete(x.id);
      }
      for (const id of before.keys()) {
        deletes[col].add(id);
        upserts[col].delete(id);
        dirty = true;
      }
    }
    if (prev.members !== next.members) {
      const before = new Map(prev.members.map((m) => [m.id, m]));
      for (const m of next.members) if (before.has(m.id) && before.get(m.id) !== m) (memberUpdates.add(m.id), (dirty = true));
    }
    if (prev.settings !== next.settings) {
      const { currentUserId: _a, ...x } = prev.settings;
      const { currentUserId: _b, ...y } = next.settings;
      void _a;
      void _b;
      if (JSON.stringify(x) !== JSON.stringify(y)) (settingsDirty = true), (dirty = true);
    }
    if (prev.permissions !== next.permissions) (permissionsDirty = true), (dirty = true);
    if (dirty) schedule();
  });
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", (e) => {
      if (timer || status === "saving") {
        void flushNow();
        e.preventDefault();
      }
    });
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && void flushNow());
  }
}

async function must<T extends { error: { message: string } | null }>(p: PromiseLike<T>, what: string) {
  const r = await p;
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r;
}

async function replaceChildren(table: string, fk: string, parentIds: string[], rows: Row[]) {
  if (!parentIds.length) return;
  await must(supabase().from(table).delete().in(fk, parentIds), `clear ${table}`);
  if (rows.length) await must(supabase().from(table).insert(rows), `save ${table}`);
}

async function flush() {
  const s = useStore.getState();
  const take = (col: Col) => {
    const ids = [...upserts[col]];
    upserts[col].clear();
    return ids;
  };
  const takeDel = (col: Col) => {
    const ids = [...deletes[col]];
    deletes[col].clear();
    return ids;
  };
  try {
    const db = supabase();
    for (const col of ORDER) {
      const ids = new Set(take(col));
      if (!ids.size) continue;
      if (col === "clients") await must(db.from("clients").upsert(s.clients.filter((x) => ids.has(x.id)).map(clientTo)), "save clients");
      if (col === "leads") await must(db.from("leads").upsert(s.leads.filter((x) => ids.has(x.id)).map(leadTo)), "save leads");
      if (col === "tasks") await must(db.from("tasks").upsert(s.tasks.filter((x) => ids.has(x.id)).map(taskTo)), "save tasks");
      if (col === "activities")
        await must(db.from("activities").upsert(s.activities.filter((x) => ids.has(x.id)).map(activityTo), { ignoreDuplicates: true }), "save activity");
      if (col === "projects") {
        const ps = s.projects.filter((x) => ids.has(x.id));
        await must(db.from("projects").upsert(ps.map(projectTo)), "save projects");
        await replaceChildren(
          "project_phases",
          "project_id",
          ps.map((p) => p.id),
          ps.flatMap((p) => p.phases.map((ph, i) => ({ id: childId(ph.id), project_id: p.id, position: i, name: ph.name, progress: ph.progress }))),
        );
      }
      if (col === "quotes") {
        // a draft with no client or lead can't be stored yet (quote_has_recipient); it saves once one is picked
        const qs = s.quotes.filter((x) => ids.has(x.id) && (x.clientId || x.leadId));
        await must(db.from("quotes").upsert(qs.map(quoteTo)), "save quotations");
        const secRows: Row[] = [];
        const itemRows: Row[] = [];
        for (const q of qs)
          q.sections.forEach((sec, si) => {
            const sid = childId(sec.id);
            secRows.push({ id: sid, quote_id: q.id, position: si, room: sec.room });
            sec.items.forEach((it, ii) =>
              itemRows.push({ id: childId(it.id), section_id: sid, position: ii, description: it.description ?? "", qty: Number(it.qty) || 0, unit: it.unit, rate: Number(it.rate) || 0 }),
            );
          });
        await replaceChildren("quote_sections", "quote_id", qs.map((q) => q.id), secRows);
        if (itemRows.length) await must(db.from("quote_items").insert(itemRows), "save quotation items");
        await replaceChildren(
          "quote_milestones",
          "quote_id",
          qs.map((q) => q.id),
          qs.flatMap((q) => q.milestones.map((m, i) => ({ id: childId(m.id), quote_id: q.id, position: i, label: m.label, pct: Number(m.pct) || 0 }))),
        );
      }
      if (col === "invoices") {
        // an invoice needs a client before it can be stored (client_id is required)
        for (const id of [...ids]) if (!s.invoices.find((x) => x.id === id)?.clientId) ids.delete(id);
        const is = s.invoices.filter((x) => ids.has(x.id));
        await must(db.from("invoices").upsert(is.map(invoiceTo)), "save invoices");
        await replaceChildren(
          "invoice_items",
          "invoice_id",
          is.map((i) => i.id),
          is.flatMap((inv) => inv.items.map((it, i) => ({ id: childId(it.id), invoice_id: inv.id, position: i, description: it.description || "—", qty: Number(it.qty) || 0, unit: it.unit, rate: Number(it.rate) || 0 }))),
        );
        await replaceChildren(
          "payments",
          "invoice_id",
          is.map((i) => i.id),
          is.flatMap((inv) => inv.payments.map((p) => ({ id: childId(p.id), invoice_id: inv.id, date: p.date, amount: p.amount, method: p.method, reference: n(p.reference) }))),
        );
      }
    }
    for (const col of [...ORDER].reverse()) {
      const ids = takeDel(col);
      if (ids.length && col !== "activities") await must(db.from(col).delete().in("id", ids), `delete ${col}`);
    }
    if (memberUpdates.size) {
      const ids = [...memberUpdates];
      memberUpdates.clear();
      for (const m of s.members.filter((x) => ids.includes(x.id))) {
        const { id, ...rest } = memberTo(m);
        await must(db.from("members").update(rest).eq("id", id as string), "save team member");
      }
    }
    if (permissionsDirty) {
      permissionsDirty = false;
      const rows = Object.entries(s.permissions).flatMap(([role, mods]) =>
        Object.entries(mods).map(([module, p]) => ({ role: ROLE_TO_DB[role as Role], module, access: p.access, scope: p.scope })),
      );
      await must(db.from("role_permissions").upsert(rows), "save permissions");
    }
    if (settingsDirty) {
      settingsDirty = false;
      await must(db.from("settings").update(settingsTo(s.settings)).eq("id", 1), "save settings");
    }
    setStatus(timer ? "saving" : "idle");
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[sync]", msg);
    setStatus("error", msg);
  }
}

/* ───────────── team & sample data ───────────── */

export async function addMemberRemote(m: Omit<Member, "id">) {
  const { data, error } = await supabase().rpc("add_member_by_email", {
    p_email: m.email,
    p_name: m.name,
    p_role: ROLE_TO_DB[m.role],
    p_phone: m.phone || null,
    p_tone: m.tone,
  });
  if (error) throw new Error(error.message);
  const member = memberFrom(data as Row);
  pauseSync(() => useStore.setState((s: Store) => ({ members: [...s.members.filter((x) => x.id !== member.id), member] })));
  return member;
}

/** Inserts the demo dataset, owned by the signed-in user (other demo staff have no logins). */
export function loadSampleData() {
  const seed = buildSeed();
  const me = useStore.getState().settings.currentUserId;
  const map = new Map<string, string>();
  const id = (old?: string) => {
    if (!old) return undefined;
    if (!map.has(old)) map.set(old, uid());
    return map.get(old)!;
  };
  const memberIds = new Set(seed.members.map((m) => m.id));
  const person = (old?: string) => (old && memberIds.has(old) ? me : id(old));

  const clients = seed.clients.map((c) => ({ ...c, id: id(c.id)! }));
  const leads = seed.leads.map((l) => ({ ...l, id: id(l.id)!, ownerId: me, clientId: id(l.clientId) }));
  const projects = seed.projects.map((p) => ({ ...p, id: id(p.id)!, clientId: id(p.clientId)!, managerId: me, designerId: me, phases: p.phases.map((ph) => ({ ...ph, id: uid() })) }));
  const quotes = seed.quotes.map((q) => ({
    ...q,
    id: id(q.id)!,
    clientId: id(q.clientId),
    leadId: id(q.leadId),
    projectId: id(q.projectId),
    preparedById: me,
    sections: q.sections.map((s) => ({ ...s, id: uid(), items: s.items.map((i) => ({ ...i, id: uid() })) })),
    milestones: q.milestones.map((m) => ({ ...m, id: uid() })),
  }));
  const invoices = seed.invoices.map((i) => ({
    ...i,
    id: id(i.id)!,
    clientId: id(i.clientId)!,
    projectId: id(i.projectId),
    quoteId: id(i.quoteId),
    items: i.items.map((x) => ({ ...x, id: uid() })),
    payments: i.payments.map((p) => ({ ...p, id: uid() })),
  }));
  const tasks = seed.tasks.map((t) => ({ ...t, id: id(t.id)!, assigneeId: me, projectId: id(t.projectId), leadId: id(t.leadId) }));
  const activities = seed.activities.map((a) => ({ ...a, id: uid(), entityId: id(a.entityId)!, byId: person(a.byId)! }));

  // refs must stay unique next to existing records
  const s = useStore.getState();
  const taken = new Set([...s.clients, ...s.leads, ...s.projects, ...s.quotes, ...s.invoices].map((x) => x.ref));
  const fix = <T extends { ref: string }>(xs: T[]) => xs.map((x) => (taken.has(x.ref) ? { ...x, ref: `${x.ref}-S` } : x));

  useStore.setState({
    clients: [...fix(clients), ...s.clients],
    leads: [...fix(leads), ...s.leads],
    projects: [...fix(projects), ...s.projects],
    quotes: [...fix(quotes), ...s.quotes],
    invoices: [...fix(invoices), ...s.invoices],
    tasks: [...tasks, ...s.tasks],
    activities: [...activities, ...s.activities],
  });
}

/** exported for tests */
export const __mappers = { clientTo, leadTo, projectTo, quoteTo, invoiceTo, taskTo, activityTo, settingsTo, memberTo, childId };

/* ───────────── live: leads arriving from Meta while the CRM is open ───────────── */

let liveStarted = false;
export function startLiveLeads(onNew: (l: Lead) => void) {
  if (liveStarted) return;
  liveStarted = true;
  supabase()
    .channel("crm-leads")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
      const lead = leadFrom(payload.new as Row);
      const s = useStore.getState();
      if (s.leads.some((l) => l.id === lead.id)) return; // created in this window
      pauseSync(() =>
        useStore.setState((st) => ({
          leads: [lead, ...st.leads],
          activities: [
            { id: uid(), entity: "lead", entityId: lead.id, type: "system", text: `Lead received from ${lead.source}${lead.sourceDetail ? ` — ${lead.sourceDetail}` : ""}`, at: new Date().toISOString(), byId: lead.ownerId },
            ...st.activities,
          ],
        })),
      );
      onNew(lead);
    })
    .subscribe();
}
