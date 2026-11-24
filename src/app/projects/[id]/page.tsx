"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Pencil, Plus, Receipt, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { COVERS, INVOICE_STATUS_TONE, PRIORITY, PROJECT_STATUS, projectStatusMeta, quoteStatusMeta, TASK_STATUS } from "@/lib/constants";
import { cn, daysBetween, daysFromToday, fmtDate, invoiceStatus, invoiceTotals, money, quoteTotals, relative, uid } from "@/lib/utils";
import { Avatar, Badge, Button, Card, CardHeader, Empty, Progress, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";
import { ActivityFeed } from "@/components/activity";
import { ProjectModal } from "@/components/delivery";
import { TaskModal } from "@/components/tasks";
import { PhotosCard } from "@/components/photos";
import { usePerm } from "@/lib/perms";


export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore();
  const p = s.projects.find((x) => x.id === id);
  const [edit, setEdit] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const { canEdit } = usePerm("projects");
  const tasksP = usePerm("tasks");
  const invP = usePerm("invoices");
  const quoteP = usePerm("quotes");
  const [editPhases, setEditPhases] = React.useState(false);
  const { confirm, node } = useConfirm();
  if (!p) return <Card><Empty title="Project not found" action={<Link href="/projects" className="text-bronze underline">Back</Link>} /></Card>;

  const client = s.clients.find((c) => c.id === p.clientId);
  const pm = s.members.find((m) => m.id === p.managerId);
  const designer = s.members.find((m) => m.id === p.designerId);
  const tasks = s.tasks.filter((t) => t.projectId === p.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const invoices = s.invoices.filter((i) => i.projectId === p.id && !i.cancelled);
  const linkedQuotes = s.quotes.filter((q) => q.projectId === p.id);
  const quotes = linkedQuotes.filter((q) => !linkedQuotes.some((o) => o.ref === q.ref && o.version > q.version));
  const prog = p.phases.length ? Math.round(p.phases.reduce((a, ph) => a + ph.progress, 0) / p.phases.length) : 0;
  const allDone = p.phases.length > 0 && p.phases.every((ph) => ph.progress >= 100);
  const hasInvoices = s.invoices.some((i) => i.projectId === p.id);
  const totalDays = Math.max(1, daysBetween(p.startDate, p.dueDate));
  const elapsed = Math.min(100, Math.max(0, Math.round((daysBetween(p.startDate, new Date().toISOString().slice(0, 10)) / totalDays) * 100)));
  const due = daysFromToday(p.dueDate);
  const inv = invoices.reduce((a, i) => { const t = invoiceTotals(i); return { total: a.total + t.subtotal, paid: a.paid + t.paid, gross: a.gross + t.total }; }, { total: 0, paid: 0, gross: 0 });
  const spentPct = p.budget ? Math.round((p.spent / p.budget) * 100) : 0;
  const margin = p.value - p.budget;

  const setPhase = (phId: string, progress: number) => s.updateProject(p.id, { phases: p.phases.map((ph) => (ph.id === phId ? { ...ph, progress } : ph)) });
  const setPhases = (phases: typeof p.phases) => s.updateProject(p.id, { phases });
  const movePhase = (i: number, d: -1 | 1) => {
    const next = [...p.phases];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setPhases(next);
  };
  const changeStatus = (status: typeof p.status) => {
    if (status === "completed" && !allDone)
      return confirm("Mark project completed?", "Some phases are below 100%. They will all be set to 100%.", () => {
        s.updateProject(p.id, { status, phases: p.phases.map((ph) => ({ ...ph, progress: 100 })) });
        toast("Project completed");
      });
    s.updateProject(p.id, { status });
  };
  const remove = () =>
    confirm(
      "Delete project?",
      `${p.name} will be permanently removed.${tasks.length ? ` Its ${tasks.length} task${tasks.length === 1 ? "" : "s"} will be kept without a project.` : ""}`,
      () => { if (s.deleteProject(p.id)) { toast("Project deleted"); router.push("/projects"); } },
    );

  return (
    <div>
      <Link href="/projects" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Projects</Link>

      <div className="relative mb-6 overflow-hidden rounded-3xl" style={{ background: COVERS[p.cover] }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        <div className="relative flex flex-col gap-6 px-7 py-8 md:flex-row md:items-end md:justify-between md:px-10">
          <div>
            <div className="flex items-center gap-2">
              <select
                value={p.status}
                disabled={!canEdit}
                onChange={(e) => changeStatus(e.target.value as typeof p.status)}
                className={cn("cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium outline-none", projectStatusMeta(p.status).tone)}
              >
                {PROJECT_STATUS.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
              </select>
              <span className="text-[12.5px] text-white/80">{p.ref} · {p.type}</span>
            </div>
            <h1 className="font-display mt-3 text-[34px] leading-tight font-medium text-white md:text-[40px]">{p.name}</h1>
            <p className="mt-1 text-[14px] text-white/80">
              {client ? <Link href={`/clients/${client.id}`} className="underline-offset-2 hover:underline">{client.name}</Link> : "No client"}{p.location ? ` · ${p.location}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && <Button variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:border-white/50" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</Button>}
            {invP.canEdit && <Button className="bg-cream text-espresso hover:bg-[#f5f5dc]" onClick={() => router.push(`/invoices?new=1&client=${p.clientId}&project=${p.id}`)}><Receipt size={15} /> Invoice</Button>}
          </div>
        </div>
      </div>

      {p.status === "on_hold" && <p className="mb-5 rounded-xl bg-danger-soft px-4 py-2.5 text-[13px] text-danger">This project is on hold. It is left out of live totals and late counts until it resumes.</p>}
      {canEdit && allDone && !["handover", "completed"].includes(p.status) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-soft px-4 py-2.5 text-[13px] text-success">
          <span>All phases are at 100%. Ready to move this project on?</span>
          <span className="flex gap-2">
            <button onClick={() => changeStatus("handover")} className="rounded-lg bg-surface px-3 py-1 font-medium text-ink hover:bg-cream/50">Mark as Handover</button>
            <button onClick={() => changeStatus("completed")} className="rounded-lg bg-success px-3 py-1 font-medium text-white">Mark Completed</button>
          </span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[12px] text-ink-3">Overall progress</p>
          <p className="font-display mt-1 text-[26px] font-medium text-ink">{prog}%</p>
          <Progress value={prog} className="mt-3" />
          <p className={cn("mt-2 text-[11.5px]", p.status !== "completed" && elapsed - prog > 20 ? "font-medium text-warning" : "text-ink-3")}>{elapsed}% of schedule elapsed{p.status !== "completed" && elapsed - prog > 20 ? " · behind" : ""}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12px] text-ink-3">Handover</p>
          <p className={cn("font-display mt-1 text-[26px] font-medium", due < 0 && p.status !== "completed" ? "text-danger" : "text-ink")}>{fmtDate(p.dueDate, { day: "numeric", month: "short" })}<span className="ml-1.5 text-[15px] text-ink-3">{p.dueDate.slice(0, 4)}</span></p>
          <p className={cn("mt-2 text-[12px]", due < 0 && p.status !== "completed" ? "font-medium text-danger" : "text-ink-3")}>
            {p.status === "completed" ? "Completed" : due < 0 ? `${-due} day${due === -1 ? "" : "s"} overdue` : due === 0 ? "Due today" : `${due} day${due === 1 ? "" : "s"} remaining`}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[12px] text-ink-3">Cost vs budget</p>
          <p className="font-display tabular mt-1 text-[26px] font-medium text-ink">{spentPct}%</p>
          <Progress value={Math.min(100, spentPct)} className="mt-3" tone={spentPct > 100 ? "bg-danger" : spentPct > 85 ? "bg-warning" : "bg-success"} />
          <p className={cn("tabular mt-2 text-[11.5px]", spentPct > 100 ? "font-medium text-danger" : "text-ink-3")}>{p.budget ? (spentPct > 100 ? `Over by ${money(p.spent - p.budget)}` : `${money(p.spent)} of ${money(p.budget)}`) : "No cost budget set"}</p>
        </Card>
        <Card className={cn("p-5", !invP.canView && "hidden")}>
          <p className="text-[12px] text-ink-3">Billed of contract</p>
          <p className="font-display tabular mt-1 text-[26px] font-medium text-ink">{p.value ? Math.round((inv.total / p.value) * 100) : 0}%</p>
          <Progress value={p.value ? Math.min(100, (inv.total / p.value) * 100) : 0} className="mt-3" tone="bg-sand" />
          <p className="tabular mt-2 text-[11.5px] text-ink-3">{money(inv.paid)} received of {money(inv.gross)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Phases"
              subtitle={editPhases ? "Rename, reorder, add or remove phases" : canEdit ? "Drag a slider to update progress" : "Progress by phase"}
              action={canEdit ? <Button size="sm" variant={editPhases ? "primary" : "outline"} onClick={() => setEditPhases((v) => !v)}>{editPhases ? <><Check size={14} /> Done</> : <><Pencil size={14} /> Edit phases</>}</Button> : undefined}
            />
            {editPhases ? (
              <div className="space-y-2 px-5 pb-5">
                {p.phases.map((ph, i) => (
                  <div key={ph.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5">
                    <span className="w-6 shrink-0 text-center text-[12px] text-ink-3">{i + 1}</span>
                    <input
                      value={ph.name}
                      onChange={(e) => setPhases(p.phases.map((x) => (x.id === ph.id ? { ...x, name: e.target.value } : x)))}
                      onBlur={(e) => !e.target.value.trim() && setPhases(p.phases.map((x) => (x.id === ph.id ? { ...x, name: `Phase ${i + 1}` } : x)))}
                      className="h-9 min-w-0 flex-1 rounded-lg px-2 text-[13.5px] text-ink outline-none focus:bg-surface-2/60"
                      aria-label={`Phase ${i + 1} name`}
                    />
                    <span className="tabular w-10 text-right text-[12px] text-ink-3">{ph.progress}%</span>
                    <button disabled={i === 0} onClick={() => movePhase(i, -1)} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30" aria-label="Move up"><ArrowUp size={14} /></button>
                    <button disabled={i === p.phases.length - 1} onClick={() => movePhase(i, 1)} className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30" aria-label="Move down"><ArrowDown size={14} /></button>
                    <button
                      disabled={p.phases.length <= 1}
                      onClick={() => {
                        const go = () => setPhases(p.phases.filter((x) => x.id !== ph.id));
                        if (ph.progress > 0) confirm("Remove phase?", `“${ph.name}” is ${ph.progress}% done. Removing it changes overall progress.`, go);
                        else go();
                      }}
                      className="rounded-md p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                      aria-label="Remove phase"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => setPhases([...p.phases, { id: uid(), name: `Phase ${p.phases.length + 1}`, progress: 0 }])} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-bronze hover:bg-cream/40">
                  <Plus size={14} /> Add phase
                </button>
              </div>
            ) : (
            <div className="space-y-1 px-5 pb-5">
              {p.phases.length === 0 && <p className="py-3 text-[13px] text-ink-3">No phases yet.</p>}
              {p.phases.map((ph, i) => {
                const done = ph.progress >= 100;
                return (
                  <div key={ph.id} className="flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-surface-2/50">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", done ? "bg-bronze text-white" : ph.progress > 0 ? "bg-cream text-bronze" : "bg-surface-2 text-ink-3")}>
                      {done ? <Check size={14} /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-[13.5px] font-medium", done ? "text-ink-2" : "text-ink")}>{ph.name}</p>
                        <span className="tabular text-[12.5px] text-ink-2">{ph.progress}%</span>
                      </div>
                      <input
                        type="range"
                        disabled={!canEdit}
                        min={0}
                        max={100}
                        step={5}
                        value={ph.progress}
                        onChange={(e) => setPhase(ph.id, Number(e.target.value))}
                        aria-label={`${ph.name} progress`}
                        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-[#674F2D]"
                        style={{ background: `linear-gradient(to right, #674F2D ${ph.progress}%, #f1ebe2 ${ph.progress}%)` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Tasks" subtitle={`${tasks.filter((t) => t.status !== "done").length} open`} action={tasksP.canEdit ? <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}><Plus size={14} /> Task</Button> : undefined} />
            <div className="px-2 pb-3">
              {tasks.length === 0 && <p className="px-3 py-4 text-[13px] text-ink-3">No tasks yet.</p>}
              {tasks.map((t) => {
                const st = TASK_STATUS.find((x) => x.id === t.status)!;
                const late = t.status !== "done" && daysFromToday(t.dueDate) < 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                    <input type="checkbox" disabled={!tasksP.canEdit} checked={t.status === "done"} onChange={(e) => s.updateTask(t.id, { status: e.target.checked ? "done" : "todo" })} className="h-4 w-4 accent-[#674F2D]" aria-label="Done" />
                    <Link href={`/tasks?task=${t.id}`} className={cn("min-w-0 flex-1 truncate text-[13.5px]", t.status === "done" ? "text-ink-3 line-through" : "text-ink")}>{t.title}</Link>
                    <Badge className={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Badge>
                    <span className="hidden items-center gap-1.5 text-[12px] text-ink-3 sm:flex"><span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />{st.label}</span>
                    <span className={cn("w-20 text-right text-[12px]", late ? "font-medium text-danger" : "text-ink-3")}>{relative(t.dueDate)}</span>
                    <Avatar member={s.members.find((m) => m.id === t.assigneeId)} size={24} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className={invP.canView || quoteP.canView ? "" : "hidden"}>
            <CardHeader title="Billing" subtitle={`Contract ${money(p.value)} excl. VAT`} />
            <div className="px-2 pb-3">
              {invoices.length === 0 && quotes.length === 0 && <p className="px-3 py-4 text-[13px] text-ink-3">No quotations or invoices linked.</p>}
              {quotes.map((q) => (
                <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-ink">{q.title}</p>
                    <p className="text-[12px] text-ink-3">Quotation {q.ref}{q.version > 1 ? ` · v${q.version}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular hidden text-[13px] font-medium sm:inline">{money(quoteTotals(q).total)}</span>
                    <Badge className={quoteStatusMeta(q.status).tone}>{quoteStatusMeta(q.status).label}</Badge>
                  </div>
                </Link>
              ))}
              {invoices.map((i) => {
                const st = INVOICE_STATUS_TONE[invoiceStatus(i)]!;
                return (
                  <Link key={i.id} href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">{i.title}</p>
                      <p className="text-[12px] text-ink-3">{i.ref} · due {fmtDate(i.dueDate)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular hidden text-[13px] font-medium sm:inline">{money(invoiceTotals(i).total)}</span>
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
            <p className="mb-4 text-[13px] font-semibold text-ink">Team</p>
            {[["Project manager", pm], ["Lead designer", designer]].map(([label, m]) => (
              <div key={label as string} className="flex items-center gap-3 py-2">
                <Avatar member={m as typeof pm} size={38} />
                <div className="text-[13px]">
                  <p className="font-semibold text-ink">{(m as typeof pm)?.name ?? "Unassigned"}</p>
                  <p className="text-ink-3">{label as string}</p>
                </div>
              </div>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[12.5px]">
              <div><p className="text-ink-3">Start</p><p className="font-medium text-ink">{fmtDate(p.startDate)}</p></div>
              <div><p className="text-ink-3">Handover</p><p className="font-medium text-ink">{fmtDate(p.dueDate)}</p></div>
              <div><p className="text-ink-3">Contract value</p><p className="tabular font-medium text-ink">{money(p.value)}</p></div>
              <div><p className="text-ink-3">Planned margin</p><p className={cn("tabular font-medium", margin < 0 ? "text-danger" : "text-ink")}>{money(margin)}</p></div>
            </div>
            {canEdit && (
              hasInvoices ? (
                <p className="mt-4 text-[11.5px] text-ink-3">Projects with invoices can’t be deleted.</p>
              ) : (
                <button onClick={remove} className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-danger"><Trash2 size={13} /> Delete project</button>
              )
            )}
          </Card>
          <PhotosCard entity="project" entityId={p.id} canUpload={canEdit} />
          <ActivityFeed entity="project" entityId={p.id} title="Site log & updates" canPost={canEdit} />
        </div>
      </div>

      {node}
      <ProjectModal open={edit} onClose={() => setEdit(false)} project={p} />
      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} preset={{ projectId: p.id, assigneeId: p.managerId }} />
    </div>
  );
}
