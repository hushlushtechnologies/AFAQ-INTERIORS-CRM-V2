"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, Mail, MessageCircle, Pencil, Phone, Plus, RotateCcw, Trash2, Trophy, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { LEAD_PRIORITY, OPEN_STAGES, STAGES, quoteStatusMeta, stageMeta, PRIORITY } from "@/lib/constants";
import { cn, daysFromToday, fmtDate, money, quoteTotals, relative } from "@/lib/utils";
import { Avatar, Badge, Button, Card, CardHeader, Empty, Input, useConfirm } from "@/components/ui";
import { ActivityFeed } from "@/components/activity";
import { LeadFormModal, LostModal, SourceBadge, WonModal } from "@/components/leads";
import { TaskModal } from "@/components/tasks";
import { toast } from "@/components/layout/app-shell";
import { usePerm } from "@/lib/perms";
import { PhotosCard } from "@/components/photos";

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore();
  const lead = s.leads.find((l) => l.id === id);
  const [edit, setEdit] = React.useState(false);
  const [lost, setLost] = React.useState(false);
  const [won, setWon] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const { confirm, node } = useConfirm();
  const { canEdit } = usePerm("leads");
  const quotesP = usePerm("quotes");
  const tasksP = usePerm("tasks");
  const clientsP = usePerm("clients");
  const usePermStudioEdit = usePerm("studio").canEdit;

  if (!lead) return <Card><Empty title="Lead not found" action={<Link href="/leads" className="text-bronze underline">Back to leads</Link>} /></Card>;

  const owner = s.members.find((m) => m.id === lead.ownerId);
  const meta = stageMeta(lead.stage);
  const quotes = s.quotes.filter((q) => q.leadId === lead.id).sort((a, b) => b.version - a.version);
  const tasks = s.tasks.filter((t) => t.leadId === lead.id);
  const isOpen = OPEN_STAGES.includes(lead.stage);
  const openIdx = OPEN_STAGES.indexOf(lead.stage);
  const wa = lead.phone.replace(/\D/g, "");

  return (
    <div>
      <Link href="/leads" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft size={14} /> Pipeline
      </Link>

      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.tone} dot={meta.dot}>{meta.label}</Badge>
            <SourceBadge source={lead.source} viaAd={!!lead.externalId} />
            <span className="text-[12.5px] text-ink-3">{lead.ref} · created {fmtDate(lead.createdAt)}</span>
          </div>
          <h1 className="font-display mt-2 text-[34px] leading-tight font-medium text-ink">{lead.name}</h1>
          <p className="mt-1 text-[14px] text-ink-3">
            {lead.company ? `${lead.company} · ` : ""}
            {[lead.propertyType, lead.location].filter(Boolean).join(" in ") || lead.source}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!canEdit && <span className="self-center rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>}
          {canEdit && <Button variant="outline" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</Button>}
          {quotesP.canEdit && <Button variant="outline" onClick={() => router.push(`/quotes/new?lead=${lead.id}`)}><FileText size={15} /> Quotation</Button>}
          {canEdit && isOpen && (
            <>
              <Button variant="outline" className="text-danger hover:border-danger" onClick={() => setLost(true)}><XCircle size={15} /> Lost</Button>
              <Button onClick={() => setWon(true)}><Trophy size={15} /> Mark won</Button>
            </>
          )}
          {canEdit && lead.stage === "lost" && (
            <Button variant="outline" onClick={() => { s.moveLead(lead.id, "contacted"); toast("Lead reopened"); }}><RotateCcw size={15} /> Reopen</Button>
          )}
          {lead.stage === "won" && lead.clientId && clientsP.canView && (
            <Button variant="dark" onClick={() => router.push(`/clients/${lead.clientId}`)}>Open client</Button>
          )}
        </div>
      </div>

      {/* stage stepper */}
      {isOpen && (
        <Card className="mb-6 p-2">
          <div className="scroll-thin flex overflow-x-auto">
            {OPEN_STAGES.map((st, i) => {
              const done = i < openIdx;
              const cur = i === openIdx;
              return (
                <button
                  key={st}
                  disabled={!canEdit}
                  onClick={() => s.moveLead(lead.id, st)}
                  className={cn(
                    "group flex min-w-[140px] flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition",
                    cur ? "bg-espresso text-cream" : "hover:bg-surface-2",
                  )}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", cur ? "bg-sand text-espresso" : done ? "bg-bronze text-white" : "bg-surface-2 text-ink-3 group-hover:bg-cream")}>
                    {done ? <Check size={13} /> : i + 1}
                  </span>
                  <span className={cn("text-[12.5px] font-medium", cur ? "text-cream" : done ? "text-ink" : "text-ink-3")}>{stageMeta(st).label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <p className="text-[12px] font-medium text-ink-3">Indicative budget</p>
            <p className="font-display tabular mt-1 text-[30px] font-medium text-bronze">{lead.budget ? money(lead.budget) : <span className="text-[18px] text-ink-3">Not given yet</span>}</p>
            {lead.areaSqft > 0 && <p className="text-[12.5px] text-ink-3">≈ {money(lead.budget / lead.areaSqft)} / sqft over {lead.areaSqft.toLocaleString()} sqft</p>}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <a href={`tel:${lead.phone}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-line py-3 text-[12px] text-ink-2 transition hover:border-bronze-2 hover:text-bronze"><Phone size={17} /> Call</a>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 rounded-xl border border-line py-3 text-[12px] text-ink-2 transition hover:border-bronze-2 hover:text-bronze"><MessageCircle size={17} /> WhatsApp</a>
              <a href={`mailto:${lead.email}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-line py-3 text-[12px] text-ink-2 transition hover:border-bronze-2 hover:text-bronze"><Mail size={17} /> Email</a>
            </div>
          </Card>

          <Card>
            <CardHeader title="Brief" />
            <dl className="divide-y divide-line px-5 pb-3 text-[13.5px]">
              {[
                ["Phone", lead.phone || "—"],
                ...(lead.altPhone ? [["Alternate phone", lead.altPhone]] : []),
                ["Email", lead.email || "—"],
                ["Priority", LEAD_PRIORITY[lead.priority ?? "normal"].label],
                ["Inquiry date", fmtDate(lead.inquiryDate ?? lead.createdAt)],
                ["Expected start", lead.expectedStart ? fmtDate(lead.expectedStart) : "—"],
                ["Source", lead.sourceDetail ? `${lead.source} · ${lead.sourceDetail}` : lead.source],
                ["Property", lead.propertyType || "—"],
                ["Location", lead.location || "—"],
                ...(lead.areaSqft ? [["Area", `${lead.areaSqft.toLocaleString()} sqft`]] : []),
                ...(lead.style ? [["Style", lead.style]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-3">Owner</dt>
                <dd>
                  <select disabled={!canEdit} value={lead.ownerId} onChange={(e) => { s.updateLead(lead.id, { ownerId: e.target.value }); const m = s.members.find((x) => x.id === e.target.value); s.logActivity("lead", lead.id, "system", m ? `Assigned to ${m.name}` : "Unassigned"); }} className="cursor-pointer rounded-lg bg-transparent py-1 text-right font-medium text-ink outline-none hover:bg-surface-2">
                    <option value="">Unassigned</option>
                    {s.members.filter((m) => m.active && ["Sales Executive", "Director"].includes(m.role)).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </dd>
              </div>
              {canEdit && lead.stage === "lost" && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-3">Lost reason</dt>
                  <dd className="text-right font-medium text-danger">{lead.lostReason}</dd>
                </div>
              )}
            </dl>
            {lead.notes && (
              <div className="mx-5 mb-5">
                <p className="mb-1.5 text-[12px] font-medium text-ink-3">Inquiry description</p>
                <p className="rounded-xl bg-surface-2/60 p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{lead.notes}</p>
              </div>
            )}
          </Card>

          {isOpen && canEdit && (
            <Card className="p-5">
              <p className="text-[13px] font-semibold text-ink">Next follow-up</p>
              <div className="mt-3 flex items-center gap-2">
                <Input type="date" value={lead.nextFollowUp ?? ""} onChange={(e) => s.updateLead(lead.id, { nextFollowUp: e.target.value })} />
              </div>
              {lead.nextFollowUp && (
                <p className={cn("mt-2 text-[12.5px]", daysFromToday(lead.nextFollowUp) < 0 ? "font-medium text-danger" : "text-ink-3")}>{relative(lead.nextFollowUp)}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[1, 3, 7].map((n) => (
                  <button key={n} onClick={() => { const d = new Date(); d.setDate(d.getDate() + n); s.updateLead(lead.id, { nextFollowUp: d.toISOString().slice(0, 10) }); }} className="rounded-lg border border-line px-2.5 py-1 text-[12px] text-ink-2 hover:border-bronze-2">
                    +{n}d
                  </button>
                ))}
              </div>
            </Card>
          )}

          {quotesP.canView && <Card>
            <CardHeader title="Quotations" action={quotesP.canEdit ? <Link href={`/quotes/new?lead=${lead.id}`} className="text-[12.5px] font-medium text-bronze hover:underline">+ New</Link> : undefined} />
            <div className="px-2 pb-3">
              {quotes.length === 0 && <p className="px-3 py-4 text-[13px] text-ink-3">No quotations yet.</p>}
              {quotes.map((q) => (
                <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                  <div>
                    <p className="text-[13.5px] font-medium text-ink">{q.ref} <span className="text-ink-3">v{q.version}</span></p>
                    <p className="tabular text-[12px] text-ink-3">{money(quoteTotals(q).total)}</p>
                  </div>
                  <Badge className={quoteStatusMeta(q.status).tone}>{quoteStatusMeta(q.status).label}</Badge>
                </Link>
              ))}
            </div>
          </Card>}

          {tasksP.canView && <Card>
            <CardHeader title="Tasks" action={tasksP.canEdit ? <button onClick={() => setTaskOpen(true)} className="flex items-center gap-1 text-[12.5px] font-medium text-bronze hover:underline"><Plus size={13} /> Add</button> : undefined} />
            <div className="px-2 pb-3">
              {tasks.length === 0 && <p className="px-3 py-4 text-[13px] text-ink-3">No tasks linked.</p>}
              {tasks.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                  <input type="checkbox" disabled={!tasksP.canEdit} checked={t.status === "done"} onChange={(e) => s.updateTask(t.id, { status: e.target.checked ? "done" : "todo" })} className="mt-0.5 h-4 w-4 accent-[#674F2D]" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[13.5px]", t.status === "done" ? "text-ink-3 line-through" : "text-ink")}>{t.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3">
                      <Avatar member={s.members.find((m) => m.id === t.assigneeId)} size={16} /> {relative(t.dueDate)}
                      <Badge className={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>}

          {canEdit && <button
            onClick={() => confirm("Delete lead?", `${lead.name} and its activity history will be removed. Quotations are kept.`, () => { s.deleteLead(lead.id); toast("Lead deleted"); router.push("/leads"); })}
            className="flex items-center gap-1.5 px-1 text-[12.5px] text-ink-3 hover:text-danger"
          >
            <Trash2 size={13} /> Delete lead
          </button>}
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <Avatar member={owner} size={34} />
            <div className="text-[13px]">
              <p className="font-semibold text-ink">{owner?.name ?? "Unassigned"}</p>
              <p className="text-ink-3">{owner ? `Lead owner · ${owner.phone}` : "Choose an owner in the Brief section"}</p>
            </div>
          </div>
          <div className="mb-6">
            <PhotosCard entity="lead" entityId={lead.id} canUpload={canEdit || usePermStudioEdit} />
          </div>
          <ActivityFeed entity="lead" entityId={lead.id} title="Timeline" canPost={canEdit} />
        </div>
      </div>

      <LeadFormModal open={edit} onClose={() => setEdit(false)} lead={lead} />
      <LostModal lead={lost ? lead : null} onClose={() => setLost(false)} />
      <WonModal lead={won ? lead : null} onClose={() => setWon(false)} onDone={(r) => r.projectId && router.push(`/projects/${r.projectId}`)} />
      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} preset={{ leadId: lead.id, title: `Follow up with ${lead.name}` }} />
      {node}
    </div>
  );
}
