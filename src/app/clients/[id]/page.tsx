"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { INVOICE_STATUS_TONE, projectStatusMeta, quoteStatusMeta, COVERS } from "@/lib/constants";
import { cn, fmtDate, invoiceStatus, invoiceTotals, money, quoteTotals, waNumber } from "@/lib/utils";
import { Avatar, Badge, Button, Card, CardHeader, Empty, Progress, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";
import { ActivityFeed } from "@/components/activity";
import { ClientModal, ProjectModal } from "@/components/delivery";
import { usePerm } from "@/lib/perms";


export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore();
  const c = s.clients.find((x) => x.id === id);
  const [edit, setEdit] = React.useState(false);
  const [newProject, setNewProject] = React.useState(false);
  const { canEdit } = usePerm("clients");
  const projP = usePerm("projects");
  const quoteP = usePerm("quotes");
  const invP = usePerm("invoices");
  const { confirm, node } = useConfirm();
  if (!c) return <Card><Empty title="Client not found" action={<Link href="/clients" className="text-bronze underline">Back</Link>} /></Card>;

  const projects = s.projects.filter((p) => p.clientId === c.id);
  // one row per quotation — the latest version
  const allQuotes = s.quotes.filter((q) => q.clientId === c.id);
  const quotes = allQuotes
    .filter((q) => !allQuotes.some((o) => o.ref === q.ref && o.version > q.version))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const invoices = s.invoices.filter((i) => i.clientId === c.id).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const totals = invoices.filter((i) => !i.cancelled).reduce(
    (a, i) => {
      const t = invoiceTotals(i);
      return { invoiced: a.invoiced + t.total, paid: a.paid + t.paid, due: a.due + Math.max(0, t.balance) };
    },
    { invoiced: 0, paid: 0, due: 0 },
  );
  const lead = s.leads.find((l) => l.clientId === c.id);
  const wa = waNumber(c.phone);
  const linked = projects.length + allQuotes.length + invoices.length + (lead ? 1 : 0);
  const btn = "flex h-10 items-center gap-2 rounded-xl border border-line-strong px-3.5 text-[13.5px] text-ink hover:border-bronze-2";

  return (
    <div>
      <Link href="/clients" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Clients</Link>

      <Card className="mb-6 overflow-hidden">
        <div className="sheen h-24" />
        <div className="flex flex-col gap-5 px-6 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={c.name} size={80} className="-mt-10 shrink-0 border-4 border-surface bg-gradient-to-br from-sand to-bronze text-[28px]" />
            <div className="min-w-0 pt-3">
              <h1 className="font-display text-[24px] leading-tight font-medium break-words text-ink sm:text-[28px]">{c.name}</h1>
              <p className="mt-0.5 text-[13.5px] text-ink-3">{c.company ? `${c.company} · ` : ""}{c.type} · {c.ref}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className={btn}><Phone size={15} /> Call</a>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={btn}><MessageCircle size={15} /> WhatsApp</a>}
            {c.email && <a href={`mailto:${c.email}`} className={btn}><Mail size={15} /> Email</a>}
            {canEdit && <Button variant="outline" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</Button>}
            {projP.canEdit && projP.scope === "all" && <Button onClick={() => setNewProject(true)}><Plus size={15} /> Project</Button>}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line md:grid-cols-4">
          {[
            ["Contract value", money(projects.reduce((a, p) => a + p.value, 0))],
            ["Invoiced (incl. VAT)", money(totals.invoiced)],
            ["Received", money(totals.paid)],
            ["Outstanding", money(totals.due)],
          ].map(([k, v], i) => (
            <div key={k} className={cn("px-5 py-4 sm:px-6", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line md:border-t-0", i === 2 && "md:border-l")}>
              <p className="text-[12px] text-ink-3">{k}</p>
              <p className={cn("font-display tabular mt-1 text-[17px] font-medium whitespace-nowrap sm:text-[20px]", k === "Outstanding" && totals.due > 0 ? "text-warning" : "text-ink")}>{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Projects" subtitle={`${projects.length} total`} />
            <div className="grid grid-cols-1 gap-3 px-5 pb-5 md:grid-cols-2">
              {projects.length === 0 && <p className="text-[13px] text-ink-3">No projects yet.</p>}
              {projects.map((p) => {
                const prog = p.phases.length ? Math.round(p.phases.reduce((a, ph) => a + ph.progress, 0) / p.phases.length) : 0;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="overflow-hidden rounded-2xl border border-line transition hover:border-line-strong">
                    <div className="h-16" style={{ background: COVERS[p.cover] }} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[14px] font-semibold text-ink">{p.name}</p>
                        <Badge className={projectStatusMeta(p.status).tone}>{projectStatusMeta(p.status).label}</Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-3"><Progress value={prog} /><span className="text-[12px] text-ink-2">{prog}%</span></div>
                      <p className="tabular mt-2 text-[12.5px] text-ink-3">{money(p.value)} · due {fmtDate(p.dueDate)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className={quoteP.canView ? "" : "hidden"}>
            <CardHeader title="Quotations" action={quoteP.canEdit && <Link href={`/quotes/new?client=${c.id}`} className="text-[12.5px] font-medium text-bronze hover:underline">+ New quotation</Link>} />
            <div className="px-2 pb-3">
              {quotes.length === 0 && <p className="px-3 py-3 text-[13px] text-ink-3">None.</p>}
              {quotes.map((q) => (
                <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{q.title}</p>
                    <p className="text-[12px] text-ink-3">{q.ref}{q.version > 1 ? ` · v${q.version}` : ""} · {fmtDate(q.issueDate)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular hidden text-[13px] font-medium text-ink sm:inline">{money(quoteTotals(q).total)}</span>
                    <Badge className={quoteStatusMeta(q.status).tone}>{quoteStatusMeta(q.status).label}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className={invP.canView ? "" : "hidden"}>
            <CardHeader title="Invoices" action={invP.canEdit && <button onClick={() => router.push(`/invoices?new=1&client=${c.id}`)} className="text-[12.5px] font-medium text-bronze hover:underline">+ New invoice</button>} />
            <div className="px-2 pb-3">
              {invoices.length === 0 && <p className="px-3 py-3 text-[13px] text-ink-3">None.</p>}
              {invoices.map((i) => {
                const st = INVOICE_STATUS_TONE[invoiceStatus(i)]!;
                const t = invoiceTotals(i);
                return (
                  <Link key={i.id} href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">{i.title}</p>
                      <p className="text-[12px] text-ink-3">{i.ref} · due {fmtDate(i.dueDate)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular hidden text-[13px] font-medium text-ink sm:inline">{money(t.total)}</span>
                      <Badge className={st.tone}>{st.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <p className="mb-3 text-[13px] font-semibold text-ink">Contact</p>
            <div className="space-y-2.5 text-[13.5px] text-ink-2">
              <p className="flex items-center gap-2.5"><Phone size={15} className="shrink-0 text-ink-3" /> {c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="hover:text-bronze">{c.phone}</a> : "—"}</p>
              <p className="flex items-center gap-2.5"><Mail size={15} className="shrink-0 text-ink-3" /> {c.email ? <a href={`mailto:${c.email}`} className="truncate hover:text-bronze">{c.email}</a> : "—"}</p>
              <p className="flex items-start gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" /> {[c.address, c.city].filter(Boolean).join(", ") || "—"}</p>
              <p className="pt-1 text-[12px] text-ink-3">Client since {fmtDate(c.createdAt)}</p>
            </div>
            {lead && <Link href={`/leads/${lead.id}`} className="mt-4 inline-block text-[12.5px] font-medium text-bronze hover:underline">View original lead {lead.ref} →</Link>}
            {canEdit && linked === 0 && (
              <button
                onClick={() => confirm("Delete client?", `${c.name} (${c.ref}) and their notes will be permanently removed.`, () => { if (s.deleteClient(c.id)) { toast("Client deleted"); router.push("/clients"); } })}
                className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-danger"
              >
                <Trash2 size={13} /> Delete client
              </button>
            )}
          </Card>
          <ActivityFeed entity="client" entityId={c.id} title="Notes & activity" canPost={canEdit} />
        </div>
      </div>

      {node}
      <ClientModal open={edit} onClose={() => setEdit(false)} client={c} />
      <ProjectModal open={newProject} onClose={() => setNewProject(false)} clientId={c.id} onSaved={(pid) => router.push(`/projects/${pid}`)} />
    </div>
  );
}
