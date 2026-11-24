"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Briefcase, Eye, EyeOff, FileText, Loader2, Lock, Mail, ShieldCheck, Sparkles, Target } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const FEATURES = [
  { icon: Target, title: "Every enquiry, captured", text: "Meta & Instagram leads land in the pipeline instantly" },
  { icon: FileText, title: "Quotations in minutes", text: "Room-by-room pricing, VAT and branded PDFs" },
  { icon: Sparkles, title: "AI design studio", text: "Turn a client’s room photo into concepts" },
  { icon: Briefcase, title: "Projects on track", text: "Phases, budgets, site logs and handovers" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const shake = useAnimationControls();

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      router.replace("/");
      return;
    }
    supabase()
      .auth.getSession()
      .then(({ data }) => data.session && router.replace("/"));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setErr(error.message === "Invalid login credentials" ? "Email or password is incorrect." : /banned/i.test(error.message) ? "This account has been deactivated. Contact a Director." : error.message);
      void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }
    router.replace("/");
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_1fr]">
      {/* ── brand side ── */}
      <div className="relative hidden overflow-hidden bg-[#17120d] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_15%_10%,rgba(210,180,140,0.22),transparent_60%),radial-gradient(80%_80%_at_100%_100%,rgba(103,79,45,0.55),transparent_60%)]" />
        <Arches />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sand/25 bg-gradient-to-br from-[#8a6a3d] to-[#4a371f] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
              <span className="text-[21px] font-bold text-[#f5ecd9]">A</span>
            </div>
            <div className="leading-tight">
              <p className="text-[17px] font-semibold text-white">Afaq Al Manzel</p>
              <p className="text-[10.5px] tracking-[0.28em] text-sand uppercase">Interiors · Dubai</p>
            </div>
          </motion.div>

          <div className="max-w-xl">
            <motion.p className="text-[11.5px] font-semibold tracking-[0.3em] text-sand/80 uppercase" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              Client relationship platform
            </motion.p>
            <motion.h1
              className="mt-4 text-[46px] leading-[1.05] font-semibold tracking-tight text-white xl:text-[54px]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              From first enquiry
              <br />
              to <span className="bg-gradient-to-r from-[#e9cf9f] to-[#b98a4c] bg-clip-text text-transparent">final handover.</span>
            </motion.h1>
            <motion.p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-sand/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
              Leads, quotations, design, projects and payments for the whole studio, in one beautifully simple place.
            </motion.p>
            <div className="mt-10 grid grid-cols-2 gap-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand/15 text-[#e9cf9f]">
                    <f.icon size={17} />
                  </span>
                  <p className="mt-3 text-[14px] font-semibold text-white">{f.title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-sand/75">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[12px] text-sand/60">
            <span>© {new Date().getFullYear()} Afaq Al Manzel Interiors L.L.C</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Private & encrypted</span>
          </div>
        </div>
      </div>

      {/* ── form side ── */}
      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(210,180,140,0.18),transparent_70%)]" />
        <motion.form
          onSubmit={submit}
          animate={shake}
          className="relative w-full max-w-[400px]"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8a6a3d] to-[#4a371f]">
              <span className="text-[19px] font-bold text-white">A</span>
            </div>
            <div className="leading-tight">
              <p className="text-[16px] font-semibold text-ink">Afaq Al Manzel</p>
              <p className="text-[10px] tracking-[0.25em] text-bronze-2 uppercase">Interiors CRM</p>
            </div>
          </div>

          <p className="text-[12px] font-semibold tracking-[0.22em] text-bronze-2 uppercase">Welcome back</p>
          <h2 className="mt-2 text-[32px] leading-tight font-semibold tracking-tight text-ink">Sign in to your workspace</h2>
          <p className="mt-2 text-[14px] text-ink-3">Use the email and password your Director set up for you.</p>

          <div className="mt-9 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Email</span>
              <span className="group relative block">
                <Mail size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3 transition group-focus-within:text-bronze" />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@afaqalmanzel.ae"
                  className="h-12 w-full rounded-2xl border border-line-strong bg-surface pr-4 pl-11 text-[14.5px] text-ink shadow-[0_1px_2px_rgba(42,33,25,0.04)] outline-none transition placeholder:text-ink-3 focus:border-bronze-2 focus:ring-4 focus:ring-sand/25"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Password</span>
              <span className="group relative block">
                <Lock size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3 transition group-focus-within:text-bronze" />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-2xl border border-line-strong bg-surface pr-12 pl-11 text-[14.5px] text-ink shadow-[0_1px_2px_rgba(42,33,25,0.04)] outline-none transition placeholder:text-ink-3 focus:border-bronze-2 focus:ring-4 focus:ring-sand/25"
                />
                <button type="button" onClick={() => setShow((x) => !x)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
          </div>

          {err && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger" role="alert">
              {err}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="group mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6f5530] to-[#4d3a20] text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(103,79,45,0.8)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-[12.5px] text-ink-3">
            <ShieldCheck size={16} className="shrink-0 text-bronze-2" />
            <span>Forgot your password? Ask a Director to reset it from the Team page.</span>
          </div>
        </motion.form>
      </div>
    </div>
  );
}

/** layered arches — an architectural motif drawn in SVG */
function Arches() {
  const arch = (x: number, w: number, h: number) => `M${x},900 L${x},${900 - h + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w},${900 - h + w / 2} L${x + w},900`;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 900" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="archfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d2b48c" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#d2b48c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[
        { x: 470, w: 250, h: 640, d: 0.1 },
        { x: 520, w: 150, h: 470, d: 0.25 },
        { x: 360, w: 120, h: 360, d: 0.4 },
        { x: 690, w: 170, h: 420, d: 0.35 },
      ].map((a, i) => (
        <g key={i}>
          <motion.path d={arch(a.x, a.w, a.h)} fill="url(#archfill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: a.d + 0.4, duration: 1.2 }} />
          <motion.path
            d={arch(a.x, a.w, a.h)}
            fill="none"
            stroke="#d2b48c"
            strokeOpacity={0.28}
            strokeWidth={1.2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: a.d, duration: 2, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
      ))}
      <motion.line x1="0" x2="800" y1="899" y2="899" stroke="#d2b48c" strokeOpacity={0.25} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6 }} />
    </svg>
  );
}
