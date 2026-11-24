"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import type { Client, Project } from "@/lib/types";
import { LOCATIONS, PROJECT_STATUS, PROPERTY_TYPES } from "@/lib/constants";
import { dayOffset, digits, money } from "@/lib/utils";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";

type CDraft = Omit<Client, "id" | "ref" | "createdAt">;

export function ClientModal({ open, onClose, client, onSaved }: { open: boolean; onClose: () => void; client?: Client; onSaved?: (id: string) => void }) {
  const { addClient, updateClient, clients } = useStore();
  const blank: CDraft = { name: "", company: "", phone: "", email: "", address: "", city: "Dubai", type: "Residential" };
  const [d, setD] = React.useState<CDraft>(client ?? blank);
  React.useEffect(() => {
    if (open) setD(client ?? blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);
  const up = <K extends keyof CDraft>(k: K, v: CDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const emailBad = !!d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim());
  const phoneBad = !!d.phone.trim() && (digits(d.phone).length < 7 || /[^\d\s+()-]/.test(d.phone));
  const others = clients.filter((c) => c.id !== client?.id);
  const dupPhone = digits(d.phone).length >= 7 ? others.find((c) => digits(c.phone).slice(-9) === digits(d.phone).slice(-9)) : undefined;
  const dupEmail = d.email.trim() ? others.find((c) => c.email && c.email.toLowerCase() === d.email.trim().toLowerCase()) : undefined;
  const dup = dupPhone ?? dupEmail;
  const valid = !!d.name.trim() && !emailBad && !phoneBad;
  const save = () => {
    if (!valid) return;
    const clean = { ...d, name: d.name.trim(), company: d.company?.trim() || undefined, phone: d.phone.trim(), email: d.email.trim(), address: d.address.trim(), city: d.city.trim() };
    if (client) {
      updateClient(client.id, clean);
      onSaved?.(client.id);
    } else onSaved?.(addClient(clean));
    toast(client ? "Client updated" : "Client added");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? "Edit client" : "New client"}
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid}>{client ? "Save" : "Add client"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name *"><Input autoFocus value={d.name} onChange={(e) => up("name", e.target.value)} /></Field>
        <Field label="Company"><Input value={d.company ?? ""} onChange={(e) => up("company", e.target.value)} /></Field>
        <Field label="Phone" hint={phoneBad ? "Enter a valid phone number, e.g. +971 50 123 4567" : undefined}><Input type="tel" inputMode="tel" placeholder="+971 50 123 4567" value={d.phone} onChange={(e) => up("phone", e.target.value)} className={phoneBad ? "border-danger" : undefined} /></Field>
        <Field label="Email" hint={emailBad ? "That email doesn't look right" : undefined}><Input type="email" placeholder="name@example.com" value={d.email} onChange={(e) => up("email", e.target.value)} className={emailBad ? "border-danger" : undefined} /></Field>
        {dup && (
          <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-[12.5px] text-warning sm:col-span-2">
            {dup.name} ({dup.ref}) already has this {dupPhone ? "phone number" : "email"}. Check it isn’t the same client before saving.
          </p>
        )}
        <Field label="Address" className="sm:col-span-2"><Input value={d.address} onChange={(e) => up("address", e.target.value)} placeholder="Villa / unit, building, street" /></Field>
        <Field label="Area / city">
          <Input list="client-loc" value={d.city} onChange={(e) => up("city", e.target.value)} />
          <datalist id="client-loc">{LOCATIONS.map((l) => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Segment">
          <Select value={d.type} onChange={(e) => up("type", e.target.value as CDraft["type"])}>
            <option>Residential</option>
            <option>Commercial</option>
            <option>Hospitality</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export function ProjectModal({ open, onClose, project, clientId, onSaved }: { open: boolean; onClose: () => void; project?: Project; clientId?: string; onSaved?: (id: string) => void }) {
  const { clients, members, addProject, updateProject } = useStore();
  const staff = (roles: string[], keep?: string) => members.filter((m) => (roles.includes(m.role) && m.active !== false) || m.id === keep);
  const make = () => ({
    name: project?.name ?? "",
    clientId: project?.clientId ?? clientId ?? clients[0]?.id ?? "",
    type: project?.type ?? ("Villa" as Project["type"]),
    location: project?.location ?? "",
    value: project?.value ?? 0,
    budget: project?.budget ?? 0,
    spent: project?.spent ?? 0,
    startDate: project?.startDate ?? dayOffset(0),
    dueDate: project?.dueDate ?? dayOffset(120),
    status: project?.status ?? ("planning" as Project["status"]),
    managerId: project?.managerId ?? members.find((m) => m.role === "Project Manager" && m.active !== false)?.id ?? "",
    designerId: project?.designerId ?? members.find((m) => m.role === "Interior Designer" && m.active !== false)?.id ?? "",
  });
  const [d, setD] = React.useState(make);
  React.useEffect(() => {
    if (open) setD(make());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);
  const up = <K extends keyof ReturnType<typeof make>>(k: K, v: ReturnType<typeof make>[K]) => setD((x) => ({ ...x, [k]: v }));
  const datesBad = !!d.startDate && !!d.dueDate && d.dueDate < d.startDate;
  const valid = !!d.name.trim() && !!d.clientId && !!d.startDate && !!d.dueDate && !datesBad;
  const num = (v: string) => Math.max(0, Number(v) || 0);
  const save = () => {
    if (!valid) return;
    d.name = d.name.trim();
    if (project) {
      updateProject(project.id, d);
      onSaved?.(project.id);
    } else {
      const { spent: _s, ...rest } = d;
      void _s;
      onSaved?.(addProject({ ...rest, budget: d.budget || Math.round(d.value * 0.75) }));
    }
    toast(project ? "Project updated" : "Project created");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      width={660}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid}>{project ? "Save" : "Create project"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Project name *" className="sm:col-span-2"><Input autoFocus value={d.name} onChange={(e) => up("name", e.target.value)} /></Field>
        <Field label="Client *" hint={clients.length === 0 ? "Add a client first (Clients → New client)" : undefined}>
          <Select value={d.clientId} onChange={(e) => up("clientId", e.target.value)}>
            {!d.clientId && <option value="">— Select —</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={d.type} onChange={(e) => up("type", e.target.value as Project["type"])}>
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Location"><Input list="proj-loc" value={d.location} onChange={(e) => up("location", e.target.value)} /><datalist id="proj-loc">{LOCATIONS.map((l) => <option key={l} value={l} />)}</datalist></Field>
        <Field label="Status">
          <Select value={d.status} onChange={(e) => up("status", e.target.value as Project["status"])}>
            {PROJECT_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Contract value (AED, excl. VAT)" hint={d.value ? money(d.value) : undefined}><Input type="number" min={0} inputMode="decimal" value={d.value || ""} onChange={(e) => up("value", num(e.target.value))} /></Field>
        <Field label="Cost budget (AED)" hint="Defaults to 75% of contract value"><Input type="number" min={0} inputMode="decimal" value={d.budget || ""} onChange={(e) => up("budget", num(e.target.value))} /></Field>
        {project && <Field label="Spent to date (AED)" hint={d.budget && d.spent > d.budget ? `Over budget by ${money(d.spent - d.budget)}` : undefined}><Input type="number" min={0} inputMode="decimal" value={d.spent || ""} onChange={(e) => up("spent", num(e.target.value))} /></Field>}
        <Field label="Start date"><Input type="date" value={d.startDate} onChange={(e) => up("startDate", e.target.value)} /></Field>
        <Field label="Target handover" hint={datesBad ? "Handover must be after the start date" : undefined}><Input type="date" min={d.startDate} value={d.dueDate} onChange={(e) => up("dueDate", e.target.value)} className={datesBad ? "border-danger" : undefined} /></Field>
        <Field label="Project manager">
          <Select value={d.managerId} onChange={(e) => up("managerId", e.target.value)}>
            <option value="">— Unassigned —</option>
            {staff(["Project Manager", "Director", "Site Engineer"], project?.managerId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="Lead designer">
          <Select value={d.designerId} onChange={(e) => up("designerId", e.target.value)}>
            <option value="">— Unassigned —</option>
            {staff(["Interior Designer", "Director"], project?.designerId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
