"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { TASK_STATUS } from "@/lib/constants";
import { dayOffset, fmtDate } from "@/lib/utils";
import { Button, Field, Input, Modal, Select, Textarea, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";
import { usePerm } from "@/lib/perms";


type Draft = Omit<Task, "id" | "createdAt">;

export function TaskModal({ open, onClose, task, preset }: { open: boolean; onClose: () => void; task?: Task; preset?: Partial<Draft> }) {
  const { members, projects, leads, settings, addTask, updateTask, deleteTask } = useStore();
  const make = React.useCallback(
    (): Draft =>
      task ?? {
        title: "",
        description: "",
        assigneeId: settings.currentUserId,
        dueDate: dayOffset(2),
        priority: "medium",
        status: "todo",
        ...preset,
      },
    [task, preset, settings.currentUserId],
  );
  const [d, setD] = React.useState<Draft>(make);
  React.useEffect(() => {
    if (open) setD(make());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const { canEdit, ownOnly } = usePerm("tasks");
  const { confirm, node } = useConfirm();
  const ro = !canEdit;
  const valid = !!d.title.trim() && !!d.dueDate;
  const assignees = members.filter((m) => (m.active && (!ownOnly || m.id === settings.currentUserId)) || m.id === d.assigneeId);
  const projectOpts = projects.filter((p) => p.status !== "completed" || p.id === d.projectId);
  const leadOpts = leads.filter((l) => !["won", "lost"].includes(l.stage) || l.id === d.leadId);

  const save = () => {
    if (!valid || ro) return;
    const clean = { ...d, title: d.title.trim(), description: d.description?.trim() || undefined };
    if (task) updateTask(task.id, clean);
    else addTask(clean);
    toast(task ? "Task updated" : "Task added");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ro ? "Task" : task ? "Edit task" : "New task"}
      width={560}
      footer={
        <>
          {task && !ro && (
            <Button
              variant="ghost"
              className="mr-auto text-danger"
              onClick={() =>
                confirm("Delete task?", `“${task.title}” will be permanently removed.`, () => {
                  deleteTask(task.id);
                  toast("Task deleted");
                  onClose();
                })
              }
            >
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {!ro && (
            <Button onClick={save} disabled={!valid}>
              {task ? "Save" : "Add task"}
            </Button>
          )}
        </>
      }
    >
      <fieldset disabled={ro} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Task *" className="sm:col-span-2">
          <Input autoFocus value={d.title} onChange={(e) => up("title", e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="What needs to be done?" />
        </Field>
        <Field label="Assignee">
          <Select value={d.assigneeId} onChange={(e) => up("assigneeId", e.target.value)}>
            {!assignees.some((m) => m.id === d.assigneeId) && <option value={d.assigneeId}>— Unassigned —</option>}
            {assignees.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.role}{m.active ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due date *" hint={!d.dueDate ? "Pick a due date" : undefined}>
          <Input type="date" value={d.dueDate} onChange={(e) => up("dueDate", e.target.value)} />
        </Field>
        <Field label="Priority">
          <Select value={d.priority} onChange={(e) => up("priority", e.target.value as Draft["priority"])}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={d.status} onChange={(e) => up("status", e.target.value as Draft["status"])}>
            {TASK_STATUS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Project">
          <Select value={d.projectId ?? ""} onChange={(e) => up("projectId", e.target.value || undefined)}>
            <option value="">— None —</option>
            {projectOpts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lead">
          <Select value={d.leadId ?? ""} onChange={(e) => up("leadId", e.target.value || undefined)}>
            <option value="">— None —</option>
            {leadOpts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Details" className="sm:col-span-2">
          <Textarea value={d.description ?? ""} onChange={(e) => up("description", e.target.value)} onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && save()} placeholder="Notes, measurements, links… (Ctrl + Enter to save)" />
        </Field>
        {task && <p className="text-[11.5px] text-ink-3 sm:col-span-2">Created {fmtDate(task.createdAt)}</p>}
      </fieldset>
      {node}
    </Modal>
  );
}
