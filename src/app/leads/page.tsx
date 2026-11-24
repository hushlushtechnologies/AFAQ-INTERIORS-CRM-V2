"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { BellRing, ChevronLeft, ChevronRight, Columns3, List, MapPin, Plus, Ruler } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Lead, LeadStage } from "@/lib/types";
import { LEAD_PRIORITY, OPEN_STAGES, SOURCES, STAGES, stageMeta } from "@/lib/constants";
import { cn, compact, daysFromToday, fmtDate, money, relative } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Empty, PageHeader, SearchInput, Segmented, Select } from "@/components/ui";
import { LeadFormModal, LostModal, SourceBadge, WonModal } from "@/components/leads";
import { usePerm } from "@/lib/perms";

type View = "board" | "table" | "followups";

export default function LeadsPage() {
  return (
    <React.Suspense>
      <LeadsInner />
    </React.Suspense>
  );
}

function LeadsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { leads, members, moveLead } = useStore();
  const [view, setView] = React.useState<View>((params.get("view") as View) ?? "board");
  const [q, setQ] = React.useState("");
  const [owner, setOwner] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(params.get("new") === "1");
  const [lostLead, setLostLead] = React.useState<Lead | null>(null);
  const [wonLead, setWonLead] = React.useState<Lead | null>(null);
  const [dragging, setDragging] = React.useState<Lead | null>(null);
  const { canEdit } = usePerm("leads");

  React.useEffect(() => {
    if (params.get("new") === "1") setFormOpen(true);
    const v = params.get("view") as View | null;
    if (v) setView(v);
  }, [params]);

  // mouse: drag after moving 6px · touch: press and hold briefly, so swiping still scrolls
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }));

  const filtered = leads.filter((l) => {
    const t = q.trim().toLowerCase();
    if (t && ![l.name, l.company, l.phone, l.email, l.ref, l.location].some((x) => x?.toLowerCase().includes(t))) return false;
    if (owner === "none" ? !!l.ownerId : owner !== "all" && l.ownerId !== owner) return false;
    if (source !== "all" && l.source !== source) return false;
    if (view === "followups" && !(l.nextFollowUp && OPEN_STAGES.includes(l.stage) && daysFromToday(l.nextFollowUp) <= 0)) return false;
    return true;
  });

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const lead = leads.find((l) => l.id === e.active.id);
    const to = e.over?.id as LeadStage | undefined;
    if (!lead || !to || lead.stage === to) return;
    if (to === "lost") return setLostLead(lead);
    if (to === "won") return setWonLead(lead);
    moveLead(lead.id, to);
  };

  const openValue = filtered.filter((l) => OPEN_STAGES.includes(l.stage)).reduce((a, l) => a + l.budget, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Leads & Pipeline"
        description={`${filtered.filter((l) => OPEN_STAGES.includes(l.stage)).length} open leads worth ${money(openValue)}.${canEdit ? " Drag cards between stages." : ""}`}
        actions={
          canEdit ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={16} /> New lead
            </Button>
          ) : (
            <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          value={view}
          onChange={(v) => {
            setView(v);
            router.replace(v === "board" ? "/leads" : `/leads?view=${v}`);
          }}
          options={[
            { value: "board", label: <><Columns3 size={14} /> Board</> },
            { value: "table", label: <><List size={14} /> Table</> },
            { value: "followups", label: <><BellRing size={14} /> Follow-ups due</> },
          ]}
        />
        <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:justify-end">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, ref…" className="sm:w-72" />
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="sm:w-48">
            <option value="all">All owners</option>
            <option value="none">Unassigned</option>
            {members
              .filter((m) => ["Sales Executive", "Director"].includes(m.role))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </Select>
          <Select value={source} onChange={(e) => setSource(e.target.value)} className="sm:w-40">
            <option value="all">All sources</option>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
      </div>

      {view === "board" ? (
        <DndContext sensors={sensors} onDragStart={(e) => setDragging(leads.find((l) => l.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <Board leads={filtered} locked={!canEdit} dragging={!!dragging} />
          <DragOverlay dropAnimation={{ duration: 180 }}>{dragging ? <LeadCard lead={dragging} overlay /> : null}</DragOverlay>
        </DndContext>
      ) : (
        <LeadTable leads={filtered} />
      )}

      <LeadFormModal open={formOpen && canEdit} onClose={() => { setFormOpen(false); if (params.get("new")) router.replace("/leads"); }} />
      <LostModal lead={lostLead} onClose={() => setLostLead(null)} />
      <WonModal lead={wonLead} onClose={() => setWonLead(null)} />
    </div>
  );
}

/* ───────── board: fits the screen, columns scroll on their own ───────── */

function Board({ leads, locked, dragging }: { leads: Lead[]; locked: boolean; dragging: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [closedOpen, setClosedOpen] = React.useState<Record<string, boolean>>({});
  const [edges, setEdges] = React.useState({ left: false, right: true });
  const [active, setActive] = React.useState<LeadStage | null>(null);
  const pan = React.useRef<{ x: number; left: number } | null>(null);

  const updateEdges = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  React.useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges, leads.length]);

  // board height = exactly the space left on screen, so its scrollbar is always visible
  const [height, setHeight] = React.useState<number>();
  React.useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const main = el.closest("main");
      const top = el.getBoundingClientRect().top + (main?.scrollTop ?? 0) - (main?.getBoundingClientRect().top ?? 0);
      const mainH = main?.clientHeight ?? window.innerHeight;
      setHeight(Math.max(420, Math.floor(mainH - top - 58)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // vertical wheel moves the board sideways, unless the column under the pointer can scroll
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const body = (e.target as HTMLElement).closest<HTMLElement>("[data-col-body]");
      if (body) {
        const canDown = body.scrollTop + body.clientHeight < body.scrollHeight - 1;
        const canUp = body.scrollTop > 0;
        if ((e.deltaY > 0 && canDown) || (e.deltaY < 0 && canUp)) return;
      }
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const go = (stage: LeadStage) => {
    if ((stage === "won" || stage === "lost") && !closedOpen[stage]) setClosedOpen((x) => ({ ...x, [stage]: true }));
    setActive(stage);
    setTimeout(() => {
      document.getElementById(`col-${stage}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 30);
    setTimeout(() => setActive(null), 1400);
  };
  const step = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });

  return (
    <div>
      {/* stage navigator */}
      <div className="scroll-thin mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {STAGES.map((st) => {
          const ls = leads.filter((l) => l.stage === st.id);
          return (
            <button
              key={st.id}
              onClick={() => go(st.id)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-left transition hover:border-bronze-2 hover:shadow-sm"
            >
              <span className={cn("h-2 w-2 rounded-full", st.dot)} />
              <span className="text-[12.5px] font-medium text-ink">{st.label}</span>
              <span className="tabular rounded-md bg-surface-2 px-1.5 text-[11.5px] font-semibold text-ink-2">{ls.length}</span>
              {ls.length > 0 && st.id !== "lost" && <span className="tabular hidden text-[11.5px] text-ink-3 xl:inline">AED {compact(ls.reduce((a, l) => a + l.budget, 0))}</span>}
            </button>
          );
        })}
        <div className="ml-auto hidden shrink-0 gap-1 md:flex">
          <button onClick={() => step(-1)} disabled={!edges.left} aria-label="Scroll left" className="rounded-lg border border-line bg-surface p-1.5 text-ink-2 transition hover:border-bronze-2 disabled:opacity-35">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => step(1)} disabled={!edges.right} aria-label="Scroll right" className="rounded-lg border border-line bg-surface p-1.5 text-ink-2 transition hover:border-bronze-2 disabled:opacity-35">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={ref}
          onScroll={updateEdges}
          onPointerDown={(e) => {
            if (dragging || e.button !== 0 || (e.target as HTMLElement).closest("[data-card],button,a,input,select")) return;
            pan.current = { x: e.clientX, left: ref.current!.scrollLeft };
          }}
          onPointerMove={(e) => {
            if (!pan.current || !ref.current) return;
            ref.current.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
          }}
          onPointerUp={() => (pan.current = null)}
          onPointerLeave={() => (pan.current = null)}
          style={{ height }}
          className="board-scroll flex h-[calc(100vh-340px)] min-h-[420px] snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-3 md:snap-none"
        >
          {STAGES.map((st) => {
            const ls = leads.filter((l) => l.stage === st.id);
            const closed = st.id === "won" || st.id === "lost";
            return (
              <Column
                key={st.id}
                stage={st.id}
                leads={ls}
                locked={locked}
                collapsed={closed && !closedOpen[st.id]}
                highlight={active === st.id}
                onToggle={closed ? () => setClosedOpen((x) => ({ ...x, [st.id]: !x[st.id] })) : undefined}
              />
            );
          })}
        </div>
        {/* edge fades show there is more to scroll */}
        <div className={cn("pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity", edges.left ? "opacity-100" : "opacity-0")} />
        <div className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity", edges.right ? "opacity-100" : "opacity-0")} />
      </div>
      <p className="mt-1 hidden text-[11.5px] text-ink-3 md:block">Tip: scroll with the mouse wheel or drag empty space to move sideways. Each column scrolls on its own.</p>
    </div>
  );
}

function Column({ stage, leads, locked, collapsed, highlight, onToggle }: { stage: LeadStage; leads: Lead[]; locked?: boolean; collapsed?: boolean; highlight?: boolean; onToggle?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = stageMeta(stage);
  const total = leads.reduce((a, l) => a + l.budget, 0);

  if (collapsed) {
    return (
      <button
        id={`col-${stage}`}
        ref={setNodeRef as unknown as React.Ref<HTMLButtonElement>}
        onClick={onToggle}
        title={`Show ${meta.label}`}
        className={cn(
          "flex w-[56px] shrink-0 snap-start flex-col items-center gap-3 rounded-2xl border border-dashed py-4 transition-colors",
          isOver ? "border-bronze-2 bg-cream/40" : "border-line bg-surface-2/50 hover:border-line-strong",
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        <span className="rounded-full bg-surface px-1.5 text-[11.5px] font-semibold text-ink-2">{leads.length}</span>
        <span className="text-[12.5px] font-semibold text-ink [writing-mode:vertical-rl]">{meta.label}</span>
        <ChevronRight size={14} className="mt-auto text-ink-3" />
      </button>
    );
  }

  return (
    <div id={`col-${stage}`} className={cn("flex h-full w-[86vw] shrink-0 snap-start flex-col rounded-2xl transition-shadow sm:w-[280px]", highlight && "ring-2 ring-bronze-2 ring-offset-2 ring-offset-background")}>
      <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
          <span className="truncate text-[13px] font-semibold text-ink">{meta.label}</span>
          <span className="rounded-full bg-surface-2 px-2 text-[11.5px] font-medium text-ink-2">{leads.length}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {stage !== "lost" && <span className="tabular text-[12px] text-ink-3">AED {compact(total)}</span>}
          {onToggle && (
            <button onClick={onToggle} title="Collapse" className="rounded-md p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
              <ChevronLeft size={14} />
            </button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        data-col-body
        className={cn(
          "scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain rounded-2xl border border-dashed p-2 transition-colors",
          isOver ? "border-bronze-2 bg-cream/30" : "border-transparent bg-surface-2/50",
        )}
      >
        {leads.map((l) => (
          <DraggableCard key={l.id} lead={l} locked={locked} />
        ))}
        {leads.length === 0 && <p className="py-8 text-center text-[12px] text-ink-3">{locked ? "No leads" : "Drop a lead here"}</p>}
      </div>
    </div>
  );
}

function DraggableCard({ lead, locked }: { lead: Lead; locked?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, disabled: locked });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} data-card className={cn("select-none", isDragging && "opacity-30")}>
      <LeadCard lead={lead} />
    </div>
  );
}

function LeadCard({ lead, overlay }: { lead: Lead; overlay?: boolean }) {
  const owner = useStore((s) => s.members.find((m) => m.id === lead.ownerId));
  const due = lead.nextFollowUp ? daysFromToday(lead.nextFollowUp) : null;
  const isFresh = lead.stage === "new" && Date.now() - new Date(lead.createdAt).getTime() < 86_400_000;
  const open = OPEN_STAGES.includes(lead.stage);
  return (
    <Link
      href={`/leads/${lead.id}`}
      draggable={false}
      className={cn(
        "block cursor-grab rounded-xl border border-line bg-surface p-3.5 shadow-[var(--shadow-card)] transition hover:border-line-strong active:cursor-grabbing",
        overlay && "rotate-[1.5deg] cursor-grabbing shadow-[var(--shadow-float)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{lead.name}</p>
          {lead.company && <p className="truncate text-[12px] text-ink-3">{lead.company}</p>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {isFresh && <Badge className="bg-success-soft text-success" dot="bg-success">New</Badge>}
        <SourceBadge source={lead.source} viaAd={!!lead.externalId} />
        {(lead.priority === "high" || lead.priority === "urgent") && <Badge className={LEAD_PRIORITY[lead.priority].tone}>{LEAD_PRIORITY[lead.priority].label}</Badge>}
        {owner ? (
          <Badge className="bg-surface-2 text-ink-2">{owner.name.split(" ")[0]}</Badge>
        ) : (
          <Badge className="bg-info-soft text-info">Unassigned</Badge>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
        {lead.location && <span className="flex items-center gap-1"><MapPin size={12} className="text-ink-3" />{lead.location}</span>}
        {lead.areaSqft > 0 && <span className="flex items-center gap-1"><Ruler size={12} className="text-ink-3" />{lead.areaSqft.toLocaleString()} sqft</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-display tabular text-[15px] font-medium text-bronze">{lead.budget ? money(lead.budget) : <span className="text-[12.5px] font-normal text-ink-3">No budget yet</span>}</span>
        {lead.stage === "lost" ? (
          <span className="max-w-[120px] truncate text-[11.5px] text-danger">{lead.lostReason}</span>
        ) : open && due !== null ? (
          <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", due < 0 ? "bg-danger-soft text-danger" : due === 0 ? "bg-warning-soft text-warning" : "text-ink-3")}>
            {relative(lead.nextFollowUp!)}
          </span>
        ) : (
          lead.propertyType ? <Badge className="bg-surface-2 text-ink-3">{lead.propertyType}</Badge> : null
        )}
      </div>
    </Link>
  );
}

function LeadTable({ leads }: { leads: Lead[] }) {
  const members = useStore((s) => s.members);
  const [sort, setSort] = React.useState<{ k: keyof Lead; dir: 1 | -1 }>({ k: "createdAt", dir: -1 });
  const sorted = [...leads].sort((a, b) => {
    const av = a[sort.k] ?? "";
    const bv = b[sort.k] ?? "";
    return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
  });
  const Th = ({ k, children, className }: { k: keyof Lead; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 text-left text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase", className)}>
      <button className="hover:text-ink" onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : 1 }))}>
        {children} {sort.k === k ? (sort.dir === 1 ? "↑" : "↓") : ""}
      </button>
    </th>
  );
  if (leads.length === 0) return <Card><Empty title="No leads match" text="Try clearing the filters." /></Card>;
  return (
    <Card className="overflow-hidden">
      <div className="scroll-thin max-h-[calc(100vh-290px)] min-h-[320px] overflow-auto">
        <table className="w-full min-w-[1120px] text-[13.5px]">
          <thead className="sticky top-0 z-10 border-b border-line bg-[#f5f0e8] shadow-[0_1px_0_var(--line)]">
            <tr>
              <Th k="name">Lead</Th>
              <Th k="stage">Stage</Th>
              <Th k="propertyType">Property</Th>
              <Th k="budget" className="text-right">Budget</Th>
              <Th k="source">Source</Th>
              <Th k="ownerId">Owner</Th>
              <Th k="nextFollowUp">Follow-up</Th>
              <Th k="createdAt">Created</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((l) => {
              const m = stageMeta(l.stage);
              const owner = members.find((x) => x.id === l.ownerId);
              const due = l.nextFollowUp ? daysFromToday(l.nextFollowUp) : null;
              return (
                <tr key={l.id} className="transition hover:bg-surface-2/40">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.id}`} className="font-semibold text-ink hover:text-bronze">{l.name}</Link>
                    <p className="text-[12px] whitespace-nowrap text-ink-3">{l.ref}{l.phone ? ` · ${l.phone}` : ""}</p>
                  </td>
                  <td className="px-4 py-3"><Badge className={m.tone} dot={m.dot}>{m.label}</Badge></td>
                  <td className="px-4 py-3 text-ink-2">{[l.propertyType, l.location].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="tabular px-4 py-3 text-right font-medium whitespace-nowrap text-ink">{l.budget ? money(l.budget) : "—"}</td>
                  <td className="px-4 py-3"><SourceBadge source={l.source} viaAd={!!l.externalId} /></td>
                  <td className="px-4 py-3">{owner ? <span className="flex items-center gap-2"><Avatar member={owner} size={24} /><span className="text-ink-2">{owner.name.split(" ")[0]}</span></span> : <Badge className="bg-info-soft text-info">Unassigned</Badge>}</td>
                  <td className={cn("px-4 py-3", due !== null && due < 0 && OPEN_STAGES.includes(l.stage) ? "font-medium text-danger" : "text-ink-2")}>
                    {l.nextFollowUp && OPEN_STAGES.includes(l.stage) ? relative(l.nextFollowUp) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-3">{fmtDate(l.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

