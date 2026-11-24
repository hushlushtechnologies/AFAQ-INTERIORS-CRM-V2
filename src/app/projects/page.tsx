"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { COVERS, PROJECT_STATUS, projectStatusMeta } from "@/lib/constants";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn, daysFromToday, fmtDate, money } from "@/lib/utils";
import { AvatarStack, Badge, Button, Card, Empty, PageHeader, Progress, Reveal, SearchInput, Select } from "@/components/ui";
import { ProjectModal } from "@/components/delivery";
import { usePerm } from "@/lib/perms";


const progressOf = (p: Project) => (p.phases.length ? Math.round(p.phases.reduce((a, ph) => a + ph.progress, 0) / p.phases.length) : 0);
const isLateP = (p: Project) => daysFromToday(p.dueDate) < 0 && !["completed", "handover", "on_hold"].includes(p.status);

export default function ProjectsPage() {
  const s = useStore();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "all" | ProjectStatus>("active");
  const [open, setOpen] = React.useState(false);
  const [sort, setSort] = React.useState<"due" | "progress" | "value" | "newest">("due");
  const { canEdit, ownOnly } = usePerm("projects");

  const list = s.projects
    .filter((p) => (status === "all" ? true : status === "active" ? !["completed"].includes(p.status) : p.status === status))
    .filter((p) => {
      const t = q.trim().toLowerCase();
      const client = s.clients.find((c) => c.id === p.clientId);
      return !t || [p.name, p.ref, p.location, client?.name].some((x) => x?.toLowerCase().includes(t));
    })
    .sort((a, b) =>
      sort === "progress" ? progressOf(b) - progressOf(a) : sort === "value" ? b.value - a.value : sort === "newest" ? b.startDate.localeCompare(a.startDate) : a.dueDate.localeCompare(b.dueDate),
    );

  const live = s.projects.filter((p) => !["completed", "on_hold"].includes(p.status));
  const late = live.filter(isLateP).length;

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Projects"
        description={`${live.length} live projects worth ${money(live.reduce((a, p) => a + p.value, 0))}${late ? ` · ${late} past handover date` : ""}`}
        actions={canEdit && !ownOnly ? <Button onClick={() => setOpen(true)}><Plus size={16} /> New project</Button> : !canEdit ? <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span> : undefined}
      />

      <div className="mb-6 grid grid-cols-3 gap-3 md:grid-cols-6">
        {PROJECT_STATUS.map((st) => {
          const n = s.projects.filter((p) => p.status === st.id).length;
          const on = status === st.id;
          return (
            <button key={st.id} aria-pressed={on} onClick={() => setStatus(on ? "active" : st.id)} className={cn("rounded-2xl border px-3 py-3 text-left transition sm:px-4", on ? "border-bronze bg-cream/40" : "border-line bg-surface hover:border-line-strong")}>
              <p className="text-[12px] text-ink-3">{st.label}</p>
              <p className="font-display mt-0.5 text-[22px] font-medium text-ink">{n}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-52" aria-label="Filter by status">
            <option value="active">Active (not completed)</option>
            <option value="all">All projects</option>
            {PROJECT_STATUS.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="sm:w-52" aria-label="Sort projects">
            <option value="due">Handover soonest</option>
            <option value="progress">Most progressed</option>
            <option value="value">Highest value</option>
            <option value="newest">Newest first</option>
          </Select>
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search projects or clients…" className="sm:w-80" />
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty
            title={s.projects.length ? "No projects match" : "No projects yet"}
            text={s.projects.length ? "Try another status or search." : "Projects are created when a lead is won, or add one here."}
            action={s.projects.length ? <Button variant="outline" onClick={() => { setQ(""); setStatus("all"); }}>Show all projects</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => {
            const client = s.clients.find((c) => c.id === p.clientId);
            const prog = progressOf(p);
            const due = daysFromToday(p.dueDate);
            const isLate = isLateP(p);
            const dueText = p.status === "completed" ? `Done · ${fmtDate(p.dueDate)}` : isLate ? `${-due}d late` : due === 0 ? "Due today" : fmtDate(p.dueDate);
            const spentPct = p.budget ? Math.round((p.spent / p.budget) * 100) : 0;
            const curPhase = p.phases.find((ph) => ph.progress < 100)?.name ?? "Complete";
            return (
              <Reveal key={p.id} delay={Math.min(i, 6) * 0.04}>
                <Link href={`/projects/${p.id}`}>
                  <Card className="group h-full overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                    <div className="relative h-32" style={{ background: COVERS[p.cover] }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      <div className="absolute top-3 left-3"><Badge className={cn(projectStatusMeta(p.status).tone, "shadow-sm")}>{projectStatusMeta(p.status).label}</Badge></div>
                      <p className="absolute right-4 bottom-3 left-4 truncate font-display text-[20px] text-white">{p.name}</p>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between text-[12.5px] text-ink-3">
                        <span className="truncate">{client?.name ?? "—"}</span>
                        <span className="shrink-0">{p.ref}</span>
                      </div>
                      <div className="mt-4 flex items-baseline justify-between">
                        <span className="text-[12px] text-ink-3">Current: <span className="font-medium text-ink-2">{curPhase}</span></span>
                        <span className="tabular text-[13px] font-semibold text-ink">{prog}%</span>
                      </div>
                      <Progress value={prog} className="mt-2" />
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[12.5px]">
                        <span className="flex min-w-0 items-center gap-1.5 text-ink-2"><MapPin size={13} className="shrink-0 text-ink-3" /> <span className="truncate">{p.location || "—"}</span></span>
                        <span className={cn("flex items-center justify-end gap-1.5 whitespace-nowrap", isLate ? "font-medium text-danger" : "text-ink-2")}><CalendarDays size={13} /> {dueText}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                        <AvatarStack members={[s.members.find((m) => m.id === p.managerId), s.members.find((m) => m.id === p.designerId)]} size={26} />
                        <div className="text-right">
                          <p className="tabular text-[14px] font-semibold text-ink">{money(p.value)}</p>
                          <p className={cn("text-[11.5px]", spentPct > 100 ? "font-medium text-danger" : spentPct > 90 ? "text-warning" : "text-ink-3")}>{p.budget ? `${spentPct}% of cost budget used` : "No cost budget set"}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
      <ProjectModal open={open} onClose={() => setOpen(false)} onSaved={(id) => router.push(`/projects/${id}`)} />
    </div>
  );
}
