"use client";

import * as React from "react";
import { Mail, Phone, Plus, UserCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Member, Role } from "@/lib/types";
import { OPEN_STAGES, ROLES } from "@/lib/constants";
import { cn, compact, daysFromToday, money } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Reveal, SearchInput, Segmented, Select, buttonClass } from "@/components/ui";
import { PhotoPicker } from "@/components/photo-picker";
import { toast } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createStaffLogin, generatePassword, passwordProblem, setMyPhoto, setStaffActive, setStaffPassword } from "@/lib/team-api";
import { usePerm } from "@/lib/perms";
import { AccessSummary, PermissionsMatrix } from "@/components/permissions";
import { Camera, Check, Copy, Eye, EyeOff, KeyRound, MessageCircle, ShieldCheck, Users, Wand2 } from "lucide-react";

const TONES = ["#674F2D", "#9D825D", "#7A4B2E", "#A7AE8F", "#B9805A", "#3A2F25", "#6E655B", "#5F6650", "#BFA37A"];
/** suggestions for the free-text job title — the Director can type any title */
const TITLE_SUGGESTIONS = ["Managing Director", "General Manager", "Sales Manager", "Sales Executive", "Business Development Manager", "Senior Interior Designer", "Interior Designer", "Junior Designer", "3D Visualiser", "Draftsman", "Project Manager", "Site Engineer", "Site Supervisor", "Foreman", "Joinery Supervisor", "Procurement Officer", "Store Keeper", "Accountant", "Finance Officer", "Office Administrator", "HR Officer", "Receptionist", "Driver"];

export default function TeamPage() {
  const s = useStore();
  const [role, setRole] = React.useState<"all" | Role>("all");
  const [tab, setTab] = React.useState<"members" | "roles">("members");
  const [resetFor, setResetFor] = React.useState<Member | undefined>();
  const [creds, setCreds] = React.useState<Credentials | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Member | undefined>();
  const [photoFor, setPhotoFor] = React.useState<Member | undefined>();
  const [q, setQ] = React.useState("");

  const t = q.trim().toLowerCase();
  const list = s.members
    .filter((m) => role === "all" || m.role === role)
    .filter((m) => !t || [m.name, m.email, m.phone, m.title, m.role].some((x) => x?.toLowerCase().includes(t)))
    .sort((a, b) => Number(b.active) - Number(a.active) || (a.role === "Director" ? -1 : 0) - (b.role === "Director" ? -1 : 0) || a.name.localeCompare(b.name));
  const roleCount = (r: "all" | Role) => (r === "all" ? s.members.length : s.members.filter((m) => m.role === r).length);
  const canManage = usePerm("team").canEdit;

  const stats = (m: Member) => {
    const leads = s.leads.filter((l) => l.ownerId === m.id && OPEN_STAGES.includes(l.stage));
    const won = s.leads.filter((l) => l.ownerId === m.id && l.stage === "won");
    const projects = s.projects.filter((p) => (p.managerId === m.id || p.designerId === m.id) && !["completed"].includes(p.status));
    const tasks = s.tasks.filter((t) => t.assigneeId === m.id && t.status !== "done");
    const overdue = tasks.filter((t) => daysFromToday(t.dueDate) < 0).length;
    return { leads, won, projects, tasks, overdue };
  };

  return (
    <div>
      <PageHeader
        eyebrow="Company"
        title="Team"
        description={`${s.members.filter((m) => m.active).length} active members across sales, design, delivery and finance.`}
        actions={canManage && tab === "members" ? <Button onClick={() => setOpen(true)}><Plus size={16} /> Add member</Button> : undefined}
      />
      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "members", label: <><Users size={14} /> Members</> },
            { value: "roles", label: <><ShieldCheck size={14} /> Roles & permissions</> },
          ]}
        />
      </div>

      {tab === "roles" ? <PermissionsMatrix /> : <>
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="scroll-thin -mx-1 overflow-x-auto px-1">
          <Segmented
            value={role}
            onChange={setRole}
            options={[{ value: "all" as const, label: "Everyone" }, ...ROLES.filter((r) => roleCount(r) > 0 || role === r).map((r) => ({ value: r, label: r }))].map((o) => ({
              value: o.value,
              label: <>{o.label}<span className="rounded-md bg-surface-2 px-1.5 text-[11px] text-ink-3 tabular-nums">{roleCount(o.value)}</span></>,
            }))}
          />
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, title, phone…" className="xl:w-72" />
      </div>
      {list.length === 0 && <Card><Empty icon={<Users size={20} />} title="No one matches" action={<Button variant="outline" onClick={() => { setQ(""); setRole("all"); }}>Show everyone</Button>} /></Card>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m, i) => {
          const st = stats(m);
          const isMe = m.id === s.settings.currentUserId;
          const isSales = ["Sales Executive", "Director"].includes(m.role);
          return (
            <Reveal key={m.id} delay={Math.min(i, 8) * 0.03}>
              <Card className={cn("h-full p-5", !m.active && "opacity-60")}>
                <div className="flex items-start gap-4">
                  <Avatar member={m} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">{m.name}</p>
                      {isMe && <Badge className="bg-cream/70 text-bronze">You</Badge>}
                      {!m.active && <Badge className="bg-surface-2 text-ink-3">Inactive</Badge>}
                    </div>
                    <p className="truncate text-[13px] text-ink-2">{m.title || m.role}</p>
                    {m.title && m.title !== m.role && <p className="truncate text-[11.5px] text-ink-3">Access: {m.role}</p>}
                  </div>
                  {canManage ? (
                    <button onClick={() => setEditing(m)} className="shrink-0 text-[12.5px] font-medium text-bronze hover:underline">Edit</button>
                  ) : isMe ? (
                    <button onClick={() => setPhotoFor(m)} className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-bronze hover:underline"><Camera size={13} /> Photo</button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-1.5 text-[12.5px] text-ink-2">
                  <p className="flex min-w-0 items-center gap-2"><Mail size={13} className="shrink-0 text-ink-3" /> {m.email ? <a href={`mailto:${m.email}`} className="truncate hover:text-bronze">{m.email}</a> : "—"}</p>
                  <p className="flex items-center gap-2"><Phone size={13} className="shrink-0 text-ink-3" /> {m.phone ? <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="hover:text-bronze">{m.phone}</a> : "—"}</p>
                </div>
                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Can access</p>
                  <AccessSummary member={m} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                  {isSales ? (
                    <>
                      <Stat label="Open leads" value={st.leads.length} />
                      <Stat label="Pipeline" value={compact(st.leads.reduce((a, l) => a + (l.budget || 0), 0))} />
                      <Stat label="Won" value={st.won.length} />
                    </>
                  ) : (
                    <>
                      <Stat label="Projects" value={st.projects.length} />
                      <Stat label="Open tasks" value={st.tasks.length} />
                      <Stat label="Overdue" value={st.overdue} alert={st.overdue > 0} />
                    </>
                  )}
                </div>
                {isSupabaseConfigured && canManage && !isMe && m.active && (m.role !== "Director" || s.members.find((x) => x.id === s.settings.currentUserId)?.role === "Director") && (
                  <button
                    onClick={() => setResetFor(m)}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[12.5px] text-ink-2 transition hover:border-bronze-2 hover:text-bronze"
                  >
                    <KeyRound size={14} /> Reset password
                  </button>
                )}
                {!isSupabaseConfigured && !isMe && m.active && (
                  <button
                    onClick={() => { s.updateSettings({ currentUserId: m.id }); toast(`Now viewing as ${m.name}`); }}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[12.5px] text-ink-2 transition hover:border-bronze-2 hover:text-bronze"
                  >
                    <UserCheck size={14} /> View as {m.name.split(" ")[0]}
                  </button>
                )}
              </Card>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-6 text-center text-[12px] text-ink-3">
        {isSupabaseConfigured
          ? "“Add member” creates their login. Untick Active on a member to block their login."
          : "“View as” shows the CRM exactly as that person would see it, with their permissions."}
      </p>
      </>}

      <MyPhotoModal member={photoFor} onClose={() => setPhotoFor(undefined)} />
      <MemberModal open={open || !!editing} member={editing} onClose={() => { setOpen(false); setEditing(undefined); }} onCreated={setCreds} />
      <ResetPasswordModal member={resetFor} onClose={() => setResetFor(undefined)} onDone={setCreds} />
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: React.ReactNode; alert?: boolean }) {
  return (
    <div>
      <p className={cn("font-display text-[20px] font-medium", alert ? "text-danger" : "text-ink")}>{value}</p>
      <p className="text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

function MemberModal({ open, onClose, member, onCreated }: { open: boolean; onClose: () => void; member?: Member; onCreated?: (c: Credentials) => void }) {
  const { addMember, updateMember, members, settings } = useStore();
  const me = members.find((m) => m.id === settings.currentUserId);
  const blank: Omit<Member, "id"> = { name: "", role: "Sales Executive", email: "", phone: "", tone: TONES[members.length % TONES.length]!, active: true };
  const [d, setD] = React.useState<Omit<Member, "id">>(member ?? blank);
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const live = isSupabaseConfigured;
  React.useEffect(() => {
    if (open) {
      setD(member ?? blank);
      setPassword(live && !member ? generatePassword() : "");
      setErr(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member]);

  const emailBad = !!d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim());
  const emailTaken = !!d.email.trim() && members.some((m) => m.id !== member?.id && m.email.toLowerCase() === d.email.trim().toLowerCase());
  const needsEmail = live && !member && !d.email.trim();
  const valid = !!d.name.trim() && !emailBad && !emailTaken && !needsEmail;
  const save = async () => {
    if (!d.name.trim()) return setErr("Name is required.");
    if (!valid) return;
    setErr(null);
    setBusy(true);
    const clean = { ...d, name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), title: d.title?.trim() ?? (member?.title !== undefined ? "" : undefined), photo: d.photo ?? (member?.photo ? "" : undefined) };
    try {
      if (member) {
        if (live && d.active !== member.active) await setStaffActive(member.id, d.active);
        updateMember(member.id, clean);
        toast("Member updated");
      } else if (live) {
        const pw = passwordProblem(password);
        if (pw) throw new Error(`Password: ${pw}`);
        await createStaffLogin(clean, password);
        onCreated?.({ name: clean.name, email: clean.email.toLowerCase(), password });
        toast(`${d.name} can now sign in`);
      } else {
        addMember(clean);
        toast("Member added");
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const roles = ROLES.filter((r) => r !== "Director" || me?.role === "Director");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? "Edit member" : "Add team member"}
      subtitle={!member && live ? "Creates their login. You’ll get the details to send them." : undefined}
      width={540}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : member ? "Save" : live ? "Create login" : "Add"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><PhotoPicker member={{ name: d.name, tone: d.tone }} value={d.photo} onChange={(photo) => setD({ ...d, photo })} /></div>
        <Field label="Full name *" className="sm:col-span-2"><Input autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label="Job title" hint="Any title — e.g. Accountant, Site Supervisor, Draftsman">
          <Input list="job-titles" value={d.title ?? ""} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder={d.role} maxLength={60} />
          <datalist id="job-titles">{[...new Set([...members.map((m) => m.title).filter(Boolean) as string[], ...TITLE_SUGGESTIONS])].map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Access role" hint="Controls what they can see and do">
          <Select value={d.role} disabled={!!member && member.id === settings.currentUserId} onChange={(e) => setD({ ...d, role: e.target.value as Role })}>{roles.map((r) => <option key={r}>{r}</option>)}</Select>
        </Field>
        <Field label="Phone"><Input type="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="+971 5X XXX XXXX" /></Field>
        <Field label={live ? "Email (used to sign in) *" : "Email"} hint={emailBad ? "That email doesn’t look right" : emailTaken ? "Another team member already uses this email" : live && member ? "Sign-in email can’t be changed here" : undefined}>
          <Input type="email" value={d.email} disabled={live && !!member} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="name@afaqalmanzel.ae" className={emailBad || emailTaken ? "border-danger" : undefined} />
        </Field>
        {live && !member && (
          <Field label="Password" className="sm:col-span-2" hint="At least 8 characters with a letter and a number. They can change it after signing in.">
            <PasswordInput value={password} onChange={setPassword} />
          </Field>
        )}
        <Field label={d.photo ? "Colour (used if the photo is removed)" : "Avatar colour"} className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button type="button" key={t} onClick={() => setD({ ...d, tone: t })} className={cn("h-8 w-8 rounded-full ring-offset-2 transition", d.tone === t && "ring-2 ring-bronze")} style={{ background: t }} aria-label={t} />
            ))}
          </div>
        </Field>
        {member && member.id !== settings.currentUserId && (
          <label className="flex cursor-pointer sm:col-span-2 items-start gap-3 rounded-xl border border-line px-4 py-3 text-[13.5px]">
            <input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#674F2D]" />
            <span>
              <span className="font-medium text-ink">Active</span>
              <span className="block text-[12.5px] text-ink-3">{live ? "Untick to block their login. Their history stays." : "Inactive members keep their history but can’t be assigned new work."}</span>
            </span>
          </label>
        )}
      </div>
      {err && <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
    </Modal>
  );
}

/** lets anyone change their own photo, even without Team access */
function MyPhotoModal({ member, onClose }: { member?: Member; onClose: () => void }) {
  const { updateMember } = useStore();
  const [photo, setPhoto] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (member) { setPhoto(member.photo); setErr(null); }
  }, [member]);
  if (!member) return null;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (isSupabaseConfigured) await setMyPhoto(member.id, photo);
      else updateMember(member.id, { photo });
      toast("Photo updated");
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!member} onClose={onClose} title="Your photo" width={440} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={busy || photo === member.photo} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
      <PhotoPicker member={member} value={photo} onChange={setPhoto} />
      {err && <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
    </Modal>
  );
}

type Credentials = { name: string; email: string; password: string };

function PasswordInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const [show, setShow] = React.useState(true);
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input autoFocus={autoFocus} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10 font-mono text-[13.5px]" autoComplete="new-password" />
        <button type="button" onClick={() => setShow((x) => !x)} className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-3 hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <Button variant="outline" onClick={() => onChange(generatePassword())}><Wand2 size={14} /> Generate</Button>
    </div>
  );
}

function ResetPasswordModal({ member, onClose, onDone }: { member?: Member; onClose: () => void; onDone: (c: Credentials) => void }) {
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (member) {
      setPw(generatePassword());
      setErr(null);
    }
  }, [member]);
  const save = async () => {
    const p = passwordProblem(pw);
    if (p) return setErr(p);
    setBusy(true);
    try {
      await setStaffPassword(member!.id, pw);
      onDone({ name: member!.name, email: member!.email, password: pw });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title="Set a new password"
      subtitle={member ? `For ${member.name} (${member.email}). Their old password stops working.` : ""}
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Set password"}</Button>
        </>
      }
    >
      <Field label="New password" hint="At least 8 characters with a letter and a number.">
        <PasswordInput value={pw} onChange={setPw} autoFocus />
      </Field>
      {err && <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
    </Modal>
  );
}

function CredentialsModal({ creds, onClose }: { creds: Credentials | null; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => setCopied(false), [creds]);
  if (!creds) return null;
  const url = typeof window !== "undefined" ? `${location.origin}/login` : "";
  const text = `Hi ${creds.name.split(" ")[0]}, here is your login for the Afaq Al Manzel CRM:\n\nLink: ${url}\nEmail: ${creds.email}\nPassword: ${creds.password}\n\nYou can change your password after signing in (click your name at the top right).`;
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <Modal
      open={!!creds}
      onClose={onClose}
      title="Login ready ✓"
      subtitle={`Send these details to ${creds.name}. The password isn’t shown again.`}
      width={500}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="space-y-2 rounded-2xl border border-line bg-surface-2/50 p-4 text-[13.5px]">
        <p className="flex justify-between gap-4"><span className="text-ink-3">Link</span><span className="truncate font-medium text-ink">{url}</span></p>
        <p className="flex justify-between gap-4"><span className="text-ink-3">Email</span><span className="font-medium text-ink">{creds.email}</span></p>
        <p className="flex justify-between gap-4"><span className="text-ink-3">Password</span><span className="font-mono font-semibold text-bronze">{creds.password}</span></p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy message</>}
        </Button>
        <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("primary", "md")}>
          <MessageCircle size={15} /> Send on WhatsApp
        </a>
      </div>
    </Modal>
  );
}
