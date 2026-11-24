"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CloudUpload, KeyRound, LogOut } from "lucide-react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { changeOwnPassword, passwordProblem } from "@/lib/team-api";
import { supabase } from "@/lib/supabase/client";
import { flushNow, loadAll, onSyncStatus, startLiveLeads, startSync } from "@/lib/db";
import { toast } from "./app-shell";
import { BrandLoader } from "./brand-loader";
import { cn } from "@/lib/utils";

type Phase = "checking" | "loading" | "ready" | "no-member" | "error";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("checking");
  const [msg, setMsg] = React.useState<string>();
  const [email, setEmail] = React.useState<string>();
  const loadedFor = React.useRef<string | null>(null);

  const boot = React.useCallback(
    async (userId: string) => {
      if (loadedFor.current === userId) return;
      loadedFor.current = userId;
      setPhase("loading");
      const r = await loadAll(userId);
      if (r.ok) {
        startSync();
        startLiveLeads((l) => toast(`New lead: ${l.name}${l.source === "Meta Ads" || l.source === "Instagram" ? ` (${l.source})` : ""}`));
        setPhase("ready");
      } else {
        loadedFor.current = null;
        setMsg(r.ok ? undefined : r.message);
        setPhase(r.reason === "no-member" ? "no-member" : "error");
      }
    },
    [],
  );

  React.useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else {
        setEmail(data.session.user.email);
        void boot(data.session.user.id);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        loadedFor.current = null;
        router.replace("/login");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [boot, router]);

  if (phase === "ready") return <>{children}</>;
  if (phase === "checking" || phase === "loading") return <BrandLoader />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-espresso">
          <span className="text-[22px] font-bold text-white">A</span>
        </div>
        {phase === "no-member" && (
          <>
            <h1 className="font-display text-[22px] text-ink">Account not set up yet</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              You’re signed in as <b>{email}</b>, but this login isn’t on the team yet. Ask a Director to add you on the Team page.
              If you’re the first user, run <code className="rounded bg-surface-2 px-1">supabase/002_connect_app.sql</code> in the Supabase SQL Editor.
            </p>
            <SignOutButton labelled />
          </>
        )}
        {phase === "error" && (
          <>
            <h1 className="font-display text-[22px] text-ink">Couldn’t load the CRM</h1>
            <p className="mt-2 rounded-xl bg-danger-soft px-4 py-3 text-left text-[13px] break-words text-danger">{msg}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => location.reload()} className="rounded-xl bg-bronze px-4 py-2.5 text-[13.5px] font-medium text-white">
                Try again
              </button>
              <SignOutButton labelled />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SignOutButton({ labelled }: { labelled?: boolean }) {
  const router = useRouter();
  const out = async () => {
    await flushNow();
    await supabase().auth.signOut();
    router.replace("/login");
  };
  if (labelled)
    return (
      <button onClick={out} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line-strong px-4 py-2.5 text-[13.5px] text-ink hover:border-bronze-2">
        <LogOut size={15} /> Sign out
      </button>
    );
  return (
    <button onClick={out} title="Sign out" aria-label="Sign out" className="rounded-xl p-2 text-ink-3 transition hover:bg-surface-2 hover:text-ink">
      <LogOut size={17} />
    </button>
  );
}

export function SyncIndicator() {
  const [state, setState] = React.useState<{ s: "idle" | "saving" | "error"; msg?: string }>({ s: "idle" });
  React.useEffect(() => onSyncStatus((s, msg) => setState({ s, msg })), []);
  return (
    <span
      title={state.msg ?? (state.s === "saving" ? "Saving changes…" : "All changes saved")}
      className={cn(
        "hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium md:flex",
        state.s === "error" ? "bg-danger-soft text-danger" : "text-ink-3",
      )}
    >
      {state.s === "saving" && <CloudUpload size={14} className="animate-pulse" />}
      {state.s === "idle" && <Check size={14} className="text-success" />}
      {state.s === "error" && <AlertTriangle size={14} />}
      {state.s === "saving" ? "Saving…" : state.s === "error" ? "Not saved — hover for details" : "Saved"}
    </span>
  );
}

/* ───────── account menu: change password + sign out ───────── */

export function AccountMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [pwOpen, setPwOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((x) => !x)} className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 transition hover:bg-surface-2" aria-haspopup="menu" aria-expanded={open}>
        {children}
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-40 mt-2 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-float)]">
          <button role="menuitem" onClick={() => { setOpen(false); setPwOpen(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-ink hover:bg-surface-2">
            <KeyRound size={15} className="text-ink-3" /> Change my password
          </button>
          <button
            role="menuitem"
            onClick={async () => {
              await flushNow();
              await supabase().auth.signOut();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-ink hover:bg-surface-2"
          >
            <LogOut size={15} className="text-ink-3" /> Sign out
          </button>
        </div>
      )}
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  const [again, setAgain] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setCur("");
      setNext("");
      setAgain("");
      setErr(null);
      setDone(false);
    }
  }, [open]);
  const save = async () => {
    const p = passwordProblem(next);
    if (p) return setErr(p);
    if (next !== again) return setErr("The two new passwords don’t match.");
    setBusy(true);
    setErr(null);
    try {
      await changeOwnPassword(cur, next);
      setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change my password"
      width={440}
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={busy || !cur || !next} onClick={save}>{busy ? "Saving…" : "Change password"}</Button>
          </>
        )
      }
    >
      {done ? (
        <p className="rounded-xl bg-success-soft px-4 py-3 text-[13.5px] text-success">Password changed. Use the new one next time you sign in.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Current password"><Input type="password" autoFocus autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
          <Field label="New password" hint="At least 8 characters with a letter and a number."><Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <Field label="Repeat new password"><Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} /></Field>
          {err && <p className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
        </div>
      )}
    </Modal>
  );
}
