"use client";

import * as React from "react";
import { Eye, EyeOff, Lock, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Access, Member, Module, Permissions, Role } from "@/lib/types";
import { MODULES, ROLES } from "@/lib/constants";
import { permFor } from "@/lib/perms";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";

const ACCESS: { id: Access; label: string; icon: React.ElementType; on: string }[] = [
  { id: "none", label: "None", icon: EyeOff, on: "bg-surface-2 text-ink-2 ring-1 ring-line-strong" },
  { id: "view", label: "View", icon: Eye, on: "bg-info-soft text-info ring-1 ring-info/30" },
  { id: "edit", label: "Edit", icon: Pencil, on: "bg-success-soft text-success ring-1 ring-success/30" },
];

type EditableRole = keyof Permissions;
const EDITABLE: EditableRole[] = ROLES.filter((r) => r !== "Director") as EditableRole[];

export function PermissionsMatrix() {
  const s = useStore();
  const me = s.members.find((m) => m.id === s.settings.currentUserId);
  const isDirector = me?.role === "Director";
  const { confirm, node } = useConfirm();
  const countBy = (role: Role) => s.members.filter((m) => m.role === role && m.active).length;

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream/60 text-bronze"><ShieldCheck size={20} /></span>
          <div className="text-[13.5px] leading-relaxed text-ink-2">
            <p className="font-semibold text-ink">What each role can see and do</p>
            <p>
              <b>None</b> hides the section, <b>View</b> is read-only, <b>Edit</b> can create and change records. <b>Own only</b> limits leads, projects and tasks to the
              person’s own records. Directors always have full access.
              {isDirector ? " Changes save straight away; other people see them after refreshing." : " Only a Director can change these."}
            </p>
          </div>
        </div>
        {isDirector && (
          <Button
            variant="outline"
            onClick={() =>
              confirm("Reset permissions?", "Every role goes back to the default access levels.", () => {
                s.resetPermissions();
                toast("Permissions reset to defaults");
              })
            }
          >
            <RotateCcw size={15} /> Reset to defaults
          </Button>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface-2/50">
                <th className="sticky left-0 z-10 w-[230px] bg-[#f6f1ea] px-5 py-3.5 text-left text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">Section</th>
                <th className="w-[110px] px-3 py-3.5 text-center">
                  <p className="text-[12.5px] font-semibold text-ink">Director</p>
                  <p className="text-[11px] font-normal text-ink-3">{countBy("Director")} people</p>
                </th>
                {EDITABLE.map((r) => (
                  <th key={r} className="px-3 py-3.5 text-center">
                    <p className="text-[12.5px] font-semibold text-ink">{r}</p>
                    <p className="text-[11px] font-normal text-ink-3">{countBy(r)} {countBy(r) === 1 ? "person" : "people"}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODULES.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="sticky left-0 z-10 bg-surface px-5 py-4">
                    <p className="font-semibold text-ink">{m.label}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">{m.description}</p>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-success-soft px-2 py-1 text-[11.5px] font-medium text-success"><Lock size={11} /> Full</span>
                  </td>
                  {EDITABLE.map((r) => (
                    <Cell key={r} role={r} module={m.id} scopeLabel={m.scope} readOnly={!isDirector} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {node}
    </div>
  );
}

function Cell({ role, module, scopeLabel, readOnly }: { role: EditableRole; module: Module; scopeLabel?: string; readOnly: boolean }) {
  const p = useStore((s) => s.permissions[role][module]);
  const setPermission = useStore((s) => s.setPermission);
  return (
    <td className="px-2 py-4">
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="radiogroup" aria-label={`${role} – ${module}`}>
          {ACCESS.map((a) => {
            const on = p.access === a.id;
            return (
              <button
                key={a.id}
                role="radio"
                aria-checked={on}
                disabled={readOnly}
                title={a.label}
                onClick={() => setPermission(role, module, { access: a.id })}
                className={cn(
                  "rounded-md px-2 py-1 text-[11.5px] font-medium transition disabled:cursor-default",
                  on ? a.on : "text-ink-3 hover:text-ink-2 disabled:hover:text-ink-3",
                )}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        {scopeLabel && p.access !== "none" && (
          <label className={cn("flex items-center gap-1.5 text-[11.5px]", readOnly ? "text-ink-3" : "cursor-pointer text-ink-2")} title={scopeLabel}>
            <input
              type="checkbox"
              disabled={readOnly}
              checked={p.scope === "own"}
              onChange={(e) => setPermission(role, module, { scope: e.target.checked ? "own" : "all" })}
              className="h-3.5 w-3.5 accent-[#674F2D]"
            />
            Own only
          </label>
        )}
      </div>
    </td>
  );
}

/** compact "can access" summary for a member card */
export function AccessSummary({ member }: { member: Member }) {
  const s = useStore();
  if (member.role === "Director") return <Badge className="bg-success-soft text-success">Full access</Badge>;
  const view = { members: [member], settings: { ...s.settings, currentUserId: member.id }, permissions: s.permissions };
  const items = MODULES.map((m) => ({ m, p: permFor(view, m.id) })).filter((x) => x.p.access !== "none");
  if (!items.length) return <span className="text-[12px] text-ink-3">No access</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(({ m, p }) => (
        <span
          key={m.id}
          title={`${m.label}: ${p.access === "edit" ? "can edit" : "view only"}${p.scope === "own" && m.scope ? " · own records" : ""}`}
          className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", p.access === "edit" ? "bg-success-soft text-success" : "bg-info-soft text-info")}
        >
          {m.label.split(" ")[0]}
          {p.scope === "own" && m.scope ? " · own" : ""}
        </span>
      ))}
    </div>
  );
}
