"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { LEAD_PRIORITY, LOCATIONS, LOST_REASONS, PROPERTY_TYPES, SOURCES } from "@/lib/constants";
import { dayOffset, money } from "@/lib/utils";
import { Badge, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";
import { usePerm } from "@/lib/perms";

type Draft = Omit<Lead, "id" | "ref" | "createdAt">;

const blank = (ownerId: string): Draft => ({
  name: "",
  company: "",
  phone: "",
  altPhone: "",
  email: "",
  source: "Manual entry",
  propertyType: "",
  location: "",
  areaSqft: 0,
  budget: 0,
  style: "",
  stage: "new",
  priority: "normal",
  ownerId,
  inquiryDate: dayOffset(0),
  expectedStart: "",
  nextFollowUp: "",
  notes: "",
});

const PHONE_RE = /^\+\d{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadFormModal({ open, onClose, lead, onSaved }: { open: boolean; onClose: () => void; lead?: Lead; onSaved?: (id: string) => void }) {
  const { members, settings, addLead, updateLead, logActivity } = useStore();
  const { ownOnly } = usePerm("leads");
  const me = settings.currentUserId;
  const [d, setD] = React.useState<Draft>(() => lead ?? blank(ownOnly ? me : ""));
  const [internalNote, setInternalNote] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [dupOk, setDupOk] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setD(lead ? { ...blank(""), ...lead } : blank(ownOnly ? me : ""));
      setInternalNote("");
      setErr(null);
      setDupOk(false);
    }
  }, [open, lead, me, ownOnly]);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setErr(null);
  };
  const assignable = members.filter((m) => m.active && (ownOnly ? m.id === me : ["Sales Executive", "Director"].includes(m.role) || m.id === me || m.id === lead?.ownerId));

  const save = () => {
    const clean = (p?: string) => (p ?? "").replace(/[\s-]/g, "");
    const phone = clean(d.phone);
    const alt = clean(d.altPhone);
    if (!d.name.trim()) return setErr("Customer name is required.");
    if (phone && !PHONE_RE.test(phone)) return setErr("Primary phone: include + and the country code, e.g. +971501234567.");
    if (alt && !PHONE_RE.test(alt)) return setErr("Alternate phone: include + and the country code, e.g. +971501234567.");
    if (d.email && !EMAIL_RE.test(d.email.trim())) return setErr("Enter a valid email address.");
    if (!d.inquiryDate) return setErr("Inquiry date is required.");
    if (!d.source) return setErr("Lead source is required.");
    const dup = useStore
      .getState()
      .leads.find((l) => l.id !== lead?.id && ((phone && [l.phone, l.altPhone].some((p) => clean(p) === phone)) || (d.email && l.email.toLowerCase() === d.email.trim().toLowerCase())));
    if (dup && !dupOk) {
      setDupOk(true);
      return setErr(`Possible duplicate of ${dup.ref} · ${dup.name}. Click “${lead ? "Save changes" : "Create lead"}” again to continue anyway.`);
    }
    const data: Draft = { ...d, name: d.name.trim(), phone, altPhone: alt || undefined, email: d.email.trim(), expectedStart: d.expectedStart || undefined, nextFollowUp: d.nextFollowUp || undefined };
    if (lead) {
      updateLead(lead.id, data);
      toast("Lead updated");
      onSaved?.(lead.id);
    } else {
      const id = addLead(data);
      if (internalNote.trim()) logActivity("lead", id, "note", internalNote.trim());
      toast("Lead created");
      onSaved?.(id);
    }
    onClose();
  };

  const phoneHint = "Optional. Include + and country code, without spaces.";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? "Edit lead" : "Create lead"}
      subtitle={lead ? lead.ref : "Only the customer name, inquiry date and source are required. Anything unknown can stay blank."}
      width={720}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{lead ? "Save changes" : "Create lead"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Customer name *">
          <Input autoFocus value={d.name} onChange={(e) => up("name", e.target.value)} placeholder="e.g. Ahmed Al Zarooni" />
        </Field>
        <Field label="Email">
          <Input type="email" value={d.email} onChange={(e) => up("email", e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="Primary phone" hint={phoneHint}>
          <Input type="tel" inputMode="tel" value={d.phone} onChange={(e) => up("phone", e.target.value)} placeholder="+971501234567" />
        </Field>
        <Field label="Alternate phone" hint={phoneHint}>
          <Input type="tel" inputMode="tel" value={d.altPhone ?? ""} onChange={(e) => up("altPhone", e.target.value)} placeholder="+971501234567" />
        </Field>
        <Field label="Property / project type">
          <Input list="ptype-list" value={d.propertyType} onChange={(e) => up("propertyType", e.target.value)} placeholder="e.g. Villa, Office fit-out" />
          <datalist id="ptype-list">
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Project location">
          <Input list="loc-list" value={d.location} onChange={(e) => up("location", e.target.value)} placeholder="e.g. Dubai Hills Estate" />
          <datalist id="loc-list">
            {LOCATIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Field label="Estimated budget (AED)" hint={d.budget ? money(d.budget) : undefined}>
          <Input type="number" min={0} step={1000} value={d.budget || ""} onChange={(e) => up("budget", Number(e.target.value))} />
        </Field>
        <Field label="Expected start date">
          <Input type="date" value={d.expectedStart ?? ""} onChange={(e) => up("expectedStart", e.target.value)} />
        </Field>
        <Field label="Inquiry date *">
          <Input type="date" value={d.inquiryDate ?? ""} max={dayOffset(0)} onChange={(e) => up("inquiryDate", e.target.value)} />
        </Field>
        <Field label="Next follow-up date">
          <Input type="date" value={d.nextFollowUp ?? ""} onChange={(e) => up("nextFollowUp", e.target.value)} />
        </Field>
        <Field label="Lead source *">
          <Select value={d.source} onChange={(e) => up("source", e.target.value as Draft["source"])}>
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={d.priority ?? "normal"} onChange={(e) => up("priority", e.target.value as Draft["priority"])}>
            {(Object.keys(LEAD_PRIORITY) as (keyof typeof LEAD_PRIORITY)[]).map((p) => (
              <option key={p} value={p}>
                {LEAD_PRIORITY[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Assigned employee" hint={ownOnly ? "You can only create leads assigned to yourself." : undefined}>
          <Select value={d.ownerId} onChange={(e) => up("ownerId", e.target.value)} disabled={ownOnly}>
            {!ownOnly && <option value="">Unassigned</option>}
            {assignable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Company (optional)">
          <Input value={d.company ?? ""} onChange={(e) => up("company", e.target.value)} />
        </Field>
        <Field label="Inquiry description" className="sm:col-span-2">
          <Textarea value={d.notes ?? ""} onChange={(e) => up("notes", e.target.value)} placeholder="What the customer is asking for: scope, rooms, timeline, anything they mentioned…" className="min-h-[110px]" />
        </Field>
        {!lead && (
          <Field label="Initial internal note" hint="Saved to the lead’s timeline for the team. Nothing is sent to the customer." className="sm:col-span-2">
            <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} className="min-h-[90px]" />
          </Field>
        )}
      </div>
      {err && <p className={`mt-5 rounded-xl px-3 py-2 text-[13px] ${err.startsWith("Possible") ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}`}>{err}</p>}
    </Modal>
  );
}

export function LostModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const moveLead = useStore((s) => s.moveLead);
  const [reason, setReason] = React.useState(LOST_REASONS[0]!);
  const [other, setOther] = React.useState("");
  React.useEffect(() => {
    setReason(LOST_REASONS[0]!);
    setOther("");
  }, [lead]);
  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Mark as lost"
      subtitle={lead ? `${lead.name} · ${lead.ref}` : ""}
      width={460}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={reason === "Other" && !other.trim()}
            onClick={() => {
              moveLead(lead!.id, "lost", reason === "Other" ? `Other: ${other.trim()}` : reason);
              toast("Lead marked as lost");
              onClose();
            }}
          >
            Mark lost
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {LOST_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        {reason === "Other" && (
          <Field label="Explain">
            <Textarea value={other} onChange={(e) => setOther(e.target.value)} />
          </Field>
        )}
        <p className="text-[12.5px] text-ink-3">The lead keeps its full history and can be reopened later.</p>
      </div>
    </Modal>
  );
}

export function WonModal({ lead, onClose, onDone }: { lead: Lead | null; onClose: () => void; onDone?: (r: { clientId: string; projectId?: string }) => void }) {
  const convertLead = useStore((s) => s.convertLead);
  const { canView: canSeeProjects } = usePerm("projects");
  const quotes = useStore((s) => s.quotes);
  const [createProject, setCreateProject] = React.useState(true);
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState(0);
  const [due, setDue] = React.useState(dayOffset(120));
  React.useEffect(() => {
    if (!lead) return;
    const accepted = quotes.filter((q) => q.leadId === lead.id).sort((a, b) => b.version - a.version)[0];
    setName(`${lead.location} ${lead.propertyType}${lead.company ? ` — ${lead.company}` : ` — ${lead.name.split(" ").slice(-1)[0]}`}`);
    setValue(
      accepted
        ? Math.round(accepted.sections.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty * i.rate, 0), 0) * (1 - accepted.discountPct / 100))
        : lead.budget,
    );
    setDue(dayOffset(120));
    setCreateProject(canSeeProjects);
  }, [lead, quotes, canSeeProjects]);
  return (
    <Modal
      open={!!lead}
      onClose={onClose}
      title="Mark as won 🎉"
      subtitle={lead ? `${lead.name} becomes a client${lead.clientId ? " (already linked)" : ""}.` : ""}
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const r = convertLead(lead!.id, createProject ? { name, value, dueDate: due } : undefined);
              toast(createProject ? "Client & project created" : "Lead converted to client");
              onDone?.(r);
              onClose();
            }}
          >
            Convert
          </Button>
        </>
      }
    >
      {canSeeProjects && <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-4 py-3">
        <input type="checkbox" checked={createProject} onChange={(e) => setCreateProject(e.target.checked)} className="h-4 w-4 accent-[#674F2D]" />
        <span className="text-[13.5px] text-ink">Also create a project</span>
      </label>}
      {createProject && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project name" className="sm:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Contract value (AED, excl. VAT)">
            <Input type="number" value={value || ""} onChange={(e) => setValue(Number(e.target.value))} />
          </Field>
          <Field label="Target handover">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

const SOURCE_TONE: Record<string, string> = {
  "Meta Ads": "bg-[#e7eefc] text-[#1d4fb8]",
  Instagram: "bg-[#fbe7f1] text-[#a3245f]",
  Website: "bg-cream/70 text-bronze",
  WhatsApp: "bg-success-soft text-success",
  Google: "bg-warning-soft text-warning",
};

export function SourceBadge({ source, viaAd }: { source: string; viaAd?: boolean }) {
  const label = source === "Meta Ads" ? "Meta ad" : source === "Instagram" && viaAd ? "Instagram ad" : source;
  return (
    <Badge className={SOURCE_TONE[source] ?? "bg-surface-2 text-ink-3"}>
      {viaAd && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </Badge>
  );
}
