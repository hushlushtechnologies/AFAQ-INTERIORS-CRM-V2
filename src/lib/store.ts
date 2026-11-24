"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeed } from "./seed";
import type {
  Activity,
  ActivityType,
  Client,
  Invoice,
  Lead,
  LeadStage,
  Member,
  Payment,
  Project,
  Quote,
  Settings,
  Task,
  Module,
  Perm,
  Permissions,
} from "./types";
import { dayOffset, uid } from "./utils";
import { DEFAULT_PERMISSIONS, DEFAULT_PHASES, DEFAULT_QUOTE_TERMS, PROPERTY_TYPES, stageMeta } from "./constants";
import { isSupabaseConfigured } from "./supabase/client";

/** With Supabase the store starts empty and is filled by loadAll() after sign-in. */
const initialData = (): Data => {
  const seed = buildSeed();
  if (!isSupabaseConfigured) return seed;
  return { ...seed, members: [], clients: [], projects: [], leads: [], quotes: [], invoices: [], tasks: [], activities: [] };
};

const noStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

/**
 * Phase 1 data layer: a typed client-side store persisted to localStorage.
 * Every screen goes through these actions, so Phase 2 can swap the bodies
 * for Supabase calls (see supabase/schema.sql) without touching the UI.
 */

type Data = ReturnType<typeof buildSeed>;

interface Actions {
  // leads
  addLead: (l: Omit<Lead, "id" | "ref" | "createdAt">) => string;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  moveLead: (id: string, stage: LeadStage, lostReason?: string) => void;
  convertLead: (id: string, project?: { name: string; value: number; dueDate: string }) => { clientId: string; projectId?: string };
  deleteLead: (id: string) => void;
  // activities
  logActivity: (entity: Activity["entity"], entityId: string, type: ActivityType, text: string) => void;
  // clients & projects
  addClient: (c: Omit<Client, "id" | "ref" | "createdAt">) => string;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => boolean;
  addProject: (p: Omit<Project, "id" | "ref" | "phases" | "spent" | "cover"> & { phases?: Project["phases"] }) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => boolean;
  // quotes
  saveQuote: (q: Quote) => void;
  newQuote: (seed?: Partial<Quote>) => string;
  reviseQuote: (id: string) => string;
  setQuoteStatus: (id: string, status: Quote["status"]) => void;
  deleteQuote: (id: string) => void;
  // invoices
  saveInvoice: (inv: Invoice) => void;
  newInvoice: (seed?: Partial<Invoice>) => string;
  invoiceFromQuote: (quoteId: string, milestoneId: string) => string;
  addPayment: (invoiceId: string, p: Omit<Payment, "id">) => void;
  removePayment: (invoiceId: string, paymentId: string) => void;
  deleteInvoice: (id: string) => void;
  // tasks
  addTask: (t: Omit<Task, "id" | "createdAt">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  // team & settings
  addMember: (m: Omit<Member, "id">) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setPermission: (role: keyof Permissions, module: Module, patch: Partial<Perm>) => void;
  resetPermissions: () => void;
  resetDemo: () => void;
  clearAll: () => void;
}

export type Store = Data & Actions;

const nextRef = (prefix: string, existing: { ref: string }[], start: number) => {
  const nums = existing.map((e) => Number(e.ref.replace(/\D/g, "").slice(-4))).filter((n) => !Number.isNaN(n));
  return `${prefix}${Math.max(start, ...nums) + 1}`;
};
const yearRef = (prefix: string, existing: { ref: string }[]) => {
  const y = new Date().getFullYear();
  const nums = existing
    .filter((e) => e.ref.includes(`-${y}-`))
    .map((e) => Number(e.ref.split("-").pop()))
    .filter((n) => !Number.isNaN(n));
  return `${prefix}-${y}-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const me = () => get().settings.currentUserId;
      const act = (entity: Activity["entity"], entityId: string, type: ActivityType, text: string): Activity => ({
        id: uid("a"),
        entity,
        entityId,
        type,
        text,
        at: new Date().toISOString(),
        byId: me(),
      });

      return {
        ...initialData(),

        /* ── leads ── */
        addLead: (l) => {
          const id = uid("l");
          const lead: Lead = { ...l, id, ref: nextRef("LD-", get().leads, 3000), createdAt: new Date().toISOString() };
          set((s) => ({ leads: [lead, ...s.leads], activities: [act("lead", id, "system", `Lead created (${l.source})`), ...s.activities] }));
          return id;
        },
        updateLead: (id, patch) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
        moveLead: (id, stage, lostReason) => {
          const lead = get().leads.find((l) => l.id === id);
          if (!lead || lead.stage === stage) return;
          const text =
            stage === "lost"
              ? `Marked as Lost — ${lostReason ?? "no reason"}`
              : lead.stage === "lost"
                ? `Reopened → ${stageMeta(stage).label}`
                : `Moved to ${stageMeta(stage).label}`;
          set((s) => ({
            leads: s.leads.map((l) => (l.id === id ? { ...l, stage, lostReason: stage === "lost" ? lostReason : undefined } : l)),
            activities: [act("lead", id, "stage", text), ...s.activities],
          }));
        },
        convertLead: (id, project) => {
          const lead = get().leads.find((l) => l.id === id)!;
          let clientId = lead.clientId;
          if (!clientId) {
            clientId = get().addClient({
              name: lead.name,
              company: lead.company,
              phone: lead.phone,
              email: lead.email,
              address: "",
              city: lead.location,
              type: ["Office", "Retail"].includes(lead.propertyType)
                ? "Commercial"
                : ["Restaurant", "Hotel"].includes(lead.propertyType)
                  ? "Hospitality"
                  : "Residential",
            });
          }
          let projectId: string | undefined;
          if (project) {
            const designer = get().members.find((m) => m.role === "Interior Designer" && m.active);
            const pm = get().members.find((m) => m.role === "Project Manager" && m.active);
            projectId = get().addProject({
              name: project.name,
              clientId,
              type: (PROPERTY_TYPES.find((t) => lead.propertyType.toLowerCase().includes(t.toLowerCase())) ?? "Villa") as Project["type"],
              location: lead.location,
              value: project.value,
              budget: Math.round(project.value * 0.75),
              startDate: dayOffset(0),
              dueDate: project.dueDate,
              status: "planning",
              managerId: pm?.id ?? me(),
              designerId: designer?.id ?? me(),
            });
          }
          set((s) => ({
            leads: s.leads.map((l) => (l.id === id ? { ...l, stage: "won", clientId, lostReason: undefined } : l)),
            activities: [act("lead", id, "stage", "Won — converted to client" + (project ? " and project" : "")), ...s.activities],
            quotes: s.quotes.map((q) => (q.leadId === id && !q.clientId ? { ...q, clientId, projectId: q.projectId ?? projectId } : q)),
          }));
          return { clientId, projectId };
        },
        deleteLead: (id) =>
          set((s) => ({
            leads: s.leads.filter((l) => l.id !== id),
            activities: s.activities.filter((a) => !(a.entity === "lead" && a.entityId === id)),
          })),

        logActivity: (entity, entityId, type, text) => set((s) => ({ activities: [act(entity, entityId, type, text), ...s.activities] })),

        /* ── clients & projects ── */
        addClient: (c) => {
          const id = uid("c");
          set((s) => ({ clients: [{ ...c, id, ref: nextRef("CL-", s.clients, 1000), createdAt: new Date().toISOString() }, ...s.clients] }));
          return id;
        },
        updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        // only a client with nothing linked to it can be removed
        deleteClient: (id) => {
          const s = get();
          if (s.projects.some((p) => p.clientId === id) || s.quotes.some((q) => q.clientId === id) || s.invoices.some((i) => i.clientId === id) || s.leads.some((l) => l.clientId === id)) return false;
          set((st) => ({ clients: st.clients.filter((c) => c.id !== id), activities: st.activities.filter((a) => !(a.entity === "client" && a.entityId === id)) }));
          return true;
        },
        addProject: (p) => {
          const id = uid("p");
          const covers = ["dune", "ivory", "night", "clay", "sage", "stone"];
          const y = String(new Date().getFullYear()).slice(-2);
          set((s) => ({
            projects: [
              {
                ...p,
                id,
                ref: `PRJ-${y}${String(
                  Math.max(0, ...s.projects.filter((x) => x.ref.startsWith(`PRJ-${y}`)).map((x) => Number(x.ref.slice(6)) || 0)) + 1,
                ).padStart(2, "0")}`,
                spent: 0,
                cover: covers[s.projects.length % covers.length]!,
                phases: p.phases ?? DEFAULT_PHASES.map((name) => ({ id: uid(), name, progress: 0 })),
              },
              ...s.projects,
            ],
            activities: [act("project", id, "system", "Project created"), ...s.activities],
          }));
          return id;
        },
        updateProject: (id, patch) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        // blocked while invoices are linked; quotes and tasks are kept but unlinked
        deleteProject: (id) => {
          if (get().invoices.some((i) => i.projectId === id)) return false;
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            quotes: s.quotes.map((q) => (q.projectId === id ? { ...q, projectId: undefined } : q)),
            tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
            activities: s.activities.filter((a) => !(a.entity === "project" && a.entityId === id)),
          }));
          return true;
        },

        /* ── quotes ── */
        saveQuote: (q) => set((s) => ({ quotes: s.quotes.some((x) => x.id === q.id) ? s.quotes.map((x) => (x.id === q.id ? q : x)) : [q, ...s.quotes] })),
        newQuote: (seed = {}) => {
          const st = get().settings;
          const id = uid("q");
          const q: Quote = {
            id,
            ref: yearRef("QT", get().quotes),
            version: 1,
            title: "New quotation",
            status: "draft",
            issueDate: dayOffset(0),
            validUntil: dayOffset(st.quoteValidityDays),
            sections: [{ id: uid("s"), room: "Living room", items: [{ id: uid("i"), description: "", qty: 1, unit: "lot", rate: 0 }] }],
            discountPct: 0,
            vatPct: st.vatPct,
            notes: "",
            terms: st.quoteTerms?.trim() || DEFAULT_QUOTE_TERMS,
            milestones: [
              { id: uid("m"), label: "Advance on signing", pct: 40 },
              { id: uid("m"), label: "On design approval & procurement", pct: 30 },
              { id: uid("m"), label: "On fit-out completion", pct: 25 },
              { id: uid("m"), label: "On handover", pct: 5 },
            ],
            preparedById: me(),
            ...seed,
          };
          set((s) => ({ quotes: [q, ...s.quotes] }));
          if (q.leadId) get().logActivity("lead", q.leadId, "system", `Quotation ${q.ref} drafted`);
          return id;
        },
        reviseQuote: (id) => {
          const src = get().quotes.find((q) => q.id === id)!;
          const nid = uid("q");
          const maxV = Math.max(...get().quotes.filter((q) => q.ref === src.ref).map((q) => q.version));
          const clone = structuredClone(src);
          const copy: Quote = {
            ...clone,
            // fresh ids for every child row, otherwise the copy collides with the original in the database
            sections: clone.sections.map((sec) => ({ ...sec, id: uid("s"), items: sec.items.map((i) => ({ ...i, id: uid("i") })) })),
            milestones: clone.milestones.map((m) => ({ ...m, id: uid("m") })),
            id: nid,
            version: maxV + 1,
            status: "draft",
            issueDate: dayOffset(0),
            validUntil: dayOffset(get().settings.quoteValidityDays),
          };
          set((s) => ({ quotes: [copy, ...s.quotes] }));
          return nid;
        },
        setQuoteStatus: (id, status) => {
          const q = get().quotes.find((x) => x.id === id);
          set((s) => ({
            quotes: s.quotes.map((x) =>
              x.id === id
                ? { ...x, status }
                : // a newer version that is sent or accepted supersedes older versions still awaiting the client
                  q && x.ref === q.ref && x.version < q.version && x.status === "sent" && (status === "sent" || status === "accepted")
                  ? { ...x, status: "expired" as const }
                  : x,
            ),
          }));
          if (q?.leadId) {
            get().logActivity("lead", q.leadId, "system", `Quotation ${q.ref} v${q.version} marked ${status}`);
            const lead = get().leads.find((l) => l.id === q.leadId);
            if (status === "sent" && lead && ["new", "contacted", "requirements", "site_visit"].includes(lead.stage)) get().moveLead(lead.id, "quotation");
          }
        },
        deleteQuote: (id) => set((s) => ({ quotes: s.quotes.filter((q) => q.id !== id) })),

        /* ── invoices ── */
        saveInvoice: (inv) => set((s) => ({ invoices: s.invoices.some((x) => x.id === inv.id) ? s.invoices.map((x) => (x.id === inv.id ? inv : x)) : [inv, ...s.invoices] })),
        newInvoice: (seed = {}) => {
          const st = get().settings;
          const id = uid("i");
          const inv: Invoice = {
            id,
            ref: yearRef("INV", get().invoices),
            clientId: get().clients[0]?.id ?? "",
            title: "New invoice",
            issueDate: dayOffset(0),
            dueDate: dayOffset(st.invoiceDueDays),
            items: [{ id: uid("li"), description: "", qty: 1, unit: "lot", rate: 0 }],
            vatPct: st.vatPct,
            payments: [],
            ...seed,
          };
          set((s) => ({ invoices: [inv, ...s.invoices] }));
          return id;
        },
        invoiceFromQuote: (quoteId, milestoneId) => {
          const q = get().quotes.find((x) => x.id === quoteId)!;
          const ms = q.milestones.find((m) => m.id === milestoneId)!;
          const subtotal = q.sections.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty * i.rate, 0), 0);
          const taxable = subtotal * (1 - q.discountPct / 100);
          return get().newInvoice({
            clientId: q.clientId ?? "",
            projectId: q.projectId,
            quoteId: q.id,
            title: `${q.title} — ${ms.label}`,
            vatPct: q.vatPct,
            items: [{ id: uid("li"), description: `${ms.label} — ${ms.pct}% of ${q.ref} v${q.version}`, qty: 1, unit: "lot", rate: Math.round(taxable * ms.pct) / 100 }],
          });
        },
        addPayment: (invoiceId, p) =>
          set((s) => ({ invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, payments: [...i.payments, { ...p, id: uid("pay") }] } : i)) })),
        removePayment: (invoiceId, paymentId) =>
          set((s) => ({ invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, payments: i.payments.filter((p) => p.id !== paymentId) } : i)) })),
        deleteInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),

        /* ── tasks ── */
        addTask: (t) => {
          const id = uid("t");
          set((s) => ({ tasks: [{ ...t, id, createdAt: new Date().toISOString() }, ...s.tasks] }));
          return id;
        },
        updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
        deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

        /* ── team & settings ── */
        addMember: (m) => set((s) => ({ members: [...s.members, { ...m, id: uid("m") }] })),
        updateMember: (id, patch) => set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setPermission: (role, module, patch) =>
          set((s) => ({ permissions: { ...s.permissions, [role]: { ...s.permissions[role], [module]: { ...s.permissions[role][module], ...patch } } } })),
        resetPermissions: () => set(() => ({ permissions: structuredClone(DEFAULT_PERMISSIONS) })),
        resetDemo: () => set(() => ({ ...buildSeed() })),
        clearAll: () =>
          set((s) => ({
            leads: [],
            clients: [],
            projects: [],
            quotes: [],
            invoices: [],
            tasks: [],
            activities: [],
            members: s.members.filter((m) => m.id === s.settings.currentUserId),
          })),
      };
    },
    {
      name: "afaq-crm-v2",
      version: 5,
      // demo mode: older saved demo data is replaced with the richer sample set
      migrate: (persisted, version) => (version < 5 ? buildSeed() : { ...(persisted as object), permissions: structuredClone(DEFAULT_PERMISSIONS) }) as Store,
      // Supabase mode: the database is the source of truth, nothing is cached in the browser
      storage: createJSONStorage(() => (isSupabaseConfigured ? noStorage : localStorage)),
      partialize: (s) => ({
        members: s.members,
        clients: s.clients,
        projects: s.projects,
        leads: s.leads,
        quotes: s.quotes,
        invoices: s.invoices,
        tasks: s.tasks,
        activities: s.activities,
        settings: s.settings,
        permissions: s.permissions,
      }),
    },
  ),
);

/* ── lookup helpers ── */
export function useMember(id?: string) {
  return useStore((s) => s.members.find((m) => m.id === id));
}
export function useClient(id?: string) {
  return useStore((s) => s.clients.find((c) => c.id === id));
}

export function quoteRecipient(q: Quote, s: Pick<Store, "clients" | "leads">) {
  const c = q.clientId ? s.clients.find((x) => x.id === q.clientId) : undefined;
  if (c) return { name: c.name, company: c.company, email: c.email, phone: c.phone, address: [c.address, c.city].filter(Boolean).join(", ") };
  const l = q.leadId ? s.leads.find((x) => x.id === q.leadId) : undefined;
  if (l) return { name: l.name, company: l.company, email: l.email, phone: l.phone, address: l.location };
  return { name: "—", company: undefined, email: "", phone: "", address: "" };
}
