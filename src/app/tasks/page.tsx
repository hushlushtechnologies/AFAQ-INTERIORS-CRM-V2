"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { AlignLeft, Briefcase, CalendarClock, Check, Plus, Target } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Task, TaskStatus } from "@/lib/types";
import { PRIORITY, TASK_STATUS } from "@/lib/constants";
import { cn, daysFromToday, relative } from "@/lib/utils";
import { Avatar, Badge, Button, PageHeader, SearchInput, Segmented, Select } from "@/components/ui";
import { TaskModal } from "@/components/tasks";
import { toast } from "@/components/layout/app-shell";
import { usePerm } from "@/lib/perms";

const PRI_RANK = { high: 0, medium: 1, low: 2 } as const;
const DONE_PREVIEW = 8;

export default function TasksPage() {
  return (
    <React.Suspense>
      <TasksInner />
    </React.Suspense>
  );
}

function TasksInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { tasks, members, projects, settings, updateTask } = useStore();
  const [scope, setScope] = React.useState<"mine" | "all">("all");
  const [assignee, setAssignee] = React.useState("all");
  const [project, setProject] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(params.get("new") === "1");
  const [editingId, setEditingId] = React.useState<string | undefined>();
  const [dragging, setDragging] = React.useState<Task | null>(null);
  const justDragged = React.useRef(false);
  // mouse drags after a small move; touch needs a short press so the page can still scroll
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }));
  const { canEdit, ownOnly } = usePerm("tasks");
  const editing = tasks.find((t) => t.id === editingId);

  React.useEffect(() => {
    const tid = params.get("task");
    if (tid && useStore.getState().tasks.some((x) => x.id === tid)) setEditingId(tid);
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  const t = q.trim().toLowerCase();
  const list = tasks
    .filter((x) => (scope === "mine" ? x.assigneeId === settings.currentUserId : assignee === "all" || (assignee === "none" ? !x.assigneeId : x.assigneeId === assignee)))
    .filter((x) => project === "all" || (project === "none" ? !x.projectId : x.projectId === project))
    .filter((x) => !t || x.title.toLowerCase().includes(t) || x.description?.toLowerCase().includes(t));

  const sorted = (st: TaskStatus) =>
    list
      .filter((x) => x.status === st)
      .sort((a, b) =>
        st === "done"
          ? b.dueDate.localeCompare(a.dueDate) || b.createdAt.localeCompare(a.createdAt)
          : a.dueDate.localeCompare(b.dueDate) || PRI_RANK[a.priority] - PRI_RANK[b.priority],
      );

  const openCount = list.filter((x) => x.status !== "done").length;
  const overdue = list.filter((x) => x.status !== "done" && daysFromToday(x.dueDate) < 0).length;
  const dueToday = list.filter((x) => x.status !== "done" && daysFromToday(x.dueDate) === 0).length;
  const filtered = scope === "mine" || assignee !== "all" || project !== "all" || !!t;

  const setStatus = (id: string, status: TaskStatus) => {
    const task = tasks.find((x) => x.id === id);
    if (!task || task.status === status) return;
    updateTask(id, { status });
    if (status === "done") toast("Task done ✓");
  };
  const openTask = (task: Task) => {
    if (justDragged.current) return;
    setEditingId(task.id);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Tasks"
        description={`${openCount} open · ${overdue} overdue · ${dueToday} due today`}
        actions={
          canEdit ? (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> New task
            </Button>
          ) : (
            <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        {!ownOnly && <Segmented value={scope} onChange={setScope} options={[{ value: "all", label: "Everyone" }, { value: "mine", label: "My tasks" }]} />}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:justify-end">
          <SearchInput value={q} onChange={setQ} placeholder="Search tasks…" className="lg:w-60" />
          {scope === "all" && !ownOnly && (
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="lg:w-48" aria-label="Filter by assignee">
              <option value="all">All assignees</option>
              <option value="none">Unassigned</option>
              {members.filter((m) => m.active || tasks.some((x) => x.assigneeId === m.id)).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          )}
          <Select value={project} onChange={(e) => setProject(e.target.value)} className="lg:w-56" aria-label="Filter by project">
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
      </div>
      {filtered && (
        <p className="-mt-2 mb-4 text-[12.5px] text-ink-3">
          Showing {list.length} of {tasks.length} tasks ·{" "}
          <button onClick={() => { setScope("all"); setAssignee("all"); setProject("all"); setQ(""); }} className="font-medium text-bronze hover:underline">Clear filters</button>
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(e) => { justDragged.current = true; setDragging(tasks.find((x) => x.id === e.active.id) ?? null); }}
        onDragCancel={() => { setDragging(null); setTimeout(() => (justDragged.current = false), 0); }}
        onDragEnd={(e) => {
          setDragging(null);
          if (e.over) setStatus(String(e.active.id), e.over.id as TaskStatus);
          setTimeout(() => (justDragged.current = false), 0);
        }}
      >
        <div className="scroll-thin -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4">
          {TASK_STATUS.map((st) => (
            <TaskColumn key={st.id} id={st.id} label={st.label} dot={st.dot} tasks={sorted(st.id)} onOpen={openTask} onDone={(id) => setStatus(id, "done")} onReopen={(id) => setStatus(id, "todo")} locked={!canEdit} dragging={!!dragging} />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 160 }}>{dragging ? <TaskCard task={dragging} overlay /> : null}</DragOverlay>
      </DndContext>
      <p className="mt-3 hidden text-[12px] text-ink-3 md:block">Tip: drag a card to another column, or tick the circle to mark it done. Each column scrolls on its own.</p>
      <p className="mt-3 text-[12px] text-ink-3 md:hidden">Swipe sideways for other columns. Press and hold a card to drag it.</p>

      <TaskModal open={open && canEdit} onClose={() => { setOpen(false); if (params.get("new")) router.replace("/tasks"); }} />
      <TaskModal open={!!editing} task={editing} onClose={() => { setEditingId(undefined); if (params.get("task")) router.replace("/tasks"); }} />
    </div>
  );
}

function TaskColumn({
  id, label, dot, tasks, onOpen, onDone, onReopen, locked, dragging,
}: { id: TaskStatus; label: string; dot: string; tasks: Task[]; onOpen: (t: Task) => void; onDone: (id: string) => void; onReopen: (id: string) => void; locked?: boolean; dragging?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showAll, setShowAll] = React.useState(false);
  const shown = id === "done" && !showAll ? tasks.slice(0, DONE_PREVIEW) : tasks;
  const late = id !== "done" ? tasks.filter((t) => daysFromToday(t.dueDate) < 0).length : 0;
  return (
    <div className="flex w-[86vw] shrink-0 snap-start flex-col sm:w-[320px] md:w-auto">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span data-col-count className="rounded-full bg-surface-2 px-2 text-[11.5px] font-medium text-ink-2">{tasks.length}</span>
        {late > 0 && <span className="ml-auto text-[11.5px] font-medium text-danger">{late} overdue</span>}
      </div>
      <div
        ref={setNodeRef}
        data-col-body
        className={cn(
          "scroll-thin max-h-[62vh] min-h-[160px] flex-1 space-y-2.5 overflow-y-auto overscroll-contain rounded-2xl border border-dashed p-2 transition-colors md:min-h-[260px] xl:max-h-[calc(100vh-395px)] xl:min-h-[420px]",
          isOver ? "border-bronze-2 bg-cream/30" : dragging ? "border-line-strong bg-surface-2/50" : "border-transparent bg-surface-2/50",
        )}
      >
        {tasks.length === 0 && <p className="px-2 py-6 text-center text-[12.5px] text-ink-3">{dragging ? "Drop here" : "Nothing here"}</p>}
        {shown.map((t) => (
          <Draggable key={t.id} task={t} onOpen={onOpen} onDone={onDone} onReopen={onReopen} locked={locked} />
        ))}
        {id === "done" && tasks.length > DONE_PREVIEW && (
          <button onClick={() => setShowAll((v) => !v)} className="w-full rounded-lg py-2 text-[12.5px] font-medium text-bronze hover:bg-cream/40">
            {showAll ? "Show fewer" : `Show all ${tasks.length} done`}
          </button>
        )}
      </div>
    </div>
  );
}

function Draggable({ task, onOpen, onDone, onReopen, locked }: { task: Task; onOpen: (t: Task) => void; onDone: (id: string) => void; onReopen: (id: string) => void; locked?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: locked });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(task); }}
      className={cn("select-none rounded-xl focus-visible:ring-2 focus-visible:ring-bronze-2 focus-visible:outline-none", isDragging && "opacity-30")}
    >
      <TaskCard task={task} onDone={locked ? undefined : onDone} onReopen={locked ? undefined : onReopen} />
    </div>
  );
}

function TaskCard({ task, overlay, onDone, onReopen }: { task: Task; overlay?: boolean; onDone?: (id: string) => void; onReopen?: (id: string) => void }) {
  const s = useStore();
  const who = s.members.find((m) => m.id === task.assigneeId);
  const project = s.projects.find((p) => p.id === task.projectId);
  const lead = s.leads.find((l) => l.id === task.leadId);
  const due = daysFromToday(task.dueDate);
  const done = task.status === "done";
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className={cn("cursor-grab rounded-xl border bg-surface p-3.5 shadow-[var(--shadow-card)] transition hover:border-line-strong", !done && due < 0 ? "border-danger/30" : "border-line", overlay && "rotate-[1.5deg] shadow-[var(--shadow-float)]")}>
      <div className="flex items-start gap-2.5">
        {(onDone || onReopen) && (
          <button
            onClick={(e) => { stop(e); if (done) onReopen?.(task.id); else onDone?.(task.id); }}
            onPointerDown={stop}
            onMouseDown={stop}
            onTouchStart={stop}
            aria-label={done ? "Mark not done" : "Mark done"}
            title={done ? "Mark not done" : "Mark done"}
            className={cn("mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition", done ? "border-success bg-success text-white" : "border-line-strong text-transparent hover:border-success hover:text-success")}
          >
            <Check size={11} strokeWidth={3} />
          </button>
        )}
        <p className={cn("min-w-0 flex-1 text-[13.5px] leading-snug font-medium break-words", done ? "text-ink-3 line-through" : "text-ink")}>{task.title}</p>
      </div>
      {(project || lead) && (
        <Link
          href={project ? `/projects/${project.id}` : `/leads/${lead!.id}`}
          onClick={stop}
          onPointerDown={stop}
          onMouseDown={stop}
          onTouchStart={stop}
          className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-bronze"
        >
          {project ? <Briefcase size={12} className="shrink-0" /> : <Target size={12} className="shrink-0" />}
          <span className="truncate">{project?.name ?? lead?.name}</span>
        </Link>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge className={PRIORITY[task.priority].tone}>{PRIORITY[task.priority].label}</Badge>
          <span className={cn("flex items-center gap-1 text-[11.5px] whitespace-nowrap", !done && due < 0 ? "font-medium text-danger" : !done && due === 0 ? "font-medium text-warning" : "text-ink-3")}>
            <CalendarClock size={12} /> {relative(task.dueDate)}
          </span>
          {task.description?.trim() && <AlignLeft size={12} className="shrink-0 text-ink-3" aria-label="Has details" />}
        </div>
        {who ? <Avatar member={who} size={24} /> : <span className="text-[11px] text-ink-3">Unassigned</span>}
      </div>
    </div>
  );
}
