"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Briefcase,
  CheckSquare,
  ChevronsLeft,
  FileText,
  Home,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Target,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { create } from "zustand";
import { useStore } from "@/lib/store";
import { cn, daysFromToday } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { CommandPalette } from "./command-palette";
import { AccountMenu, AuthGate, SyncIndicator } from "./auth-gate";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { moduleForPath, permFor } from "@/lib/perms";
import { ShieldOff } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!isSupabaseConfigured) return <Shell>{children}</Shell>;
  if (pathname === "/login") return <>{children}</>;
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}

const NAV = [
  { group: "Overview", items: [{ href: "/", label: "Dashboard", icon: Home }] },
  {
    group: "Sales",
    items: [
      { href: "/leads", label: "Leads & Pipeline", icon: Target },
      { href: "/quotes", label: "Quotations", icon: FileText },
    ],
  },
  {
    group: "Delivery",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/projects", label: "Projects", icon: Briefcase },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    group: "Design",
    items: [{ href: "/studio", label: "AI Studio", icon: Sparkles }],
  },
  {
    group: "Finance",
    items: [{ href: "/invoices", label: "Invoices & Payments", icon: Receipt }],
  },
  {
    group: "Company",
    items: [
      { href: "/team", label: "Team", icon: UsersRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/* ── tiny toast store ── */
type Toast = { id: number; text: string };
export const useToasts = create<{ toasts: Toast[]; push: (t: string) => void; drop: (id: number) => void }>((set) => ({
  toasts: [],
  push: (text) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2800);
  },
  drop: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const toast = (t: string) => useToasts.getState().push(t);

function useHydrated() {
  const [h, setH] = React.useState(false);
  React.useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setH(true));
    if (useStore.persist.hasHydrated()) setH(true);
    return unsub;
  }, []);
  return h;
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  const settings = useStore((s) => s.settings);
  const me = useStore((s) => s.members.find((m) => m.id === s.settings.currentUserId));
  const leads = useStore((s) => s.leads);
  const tasks = useStore((s) => s.tasks);
  const toasts = useToasts((s) => s.toasts);

  React.useEffect(() => setMobile(false), [pathname]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  const newLeads = leads.filter((l) => l.stage === "new").length;
  const myOverdue = tasks.filter((t) => t.status !== "done" && t.assigneeId === settings.currentUserId && daysFromToday(t.dueDate) < 0).length;
  const followUpsDue = leads.filter((l) => l.nextFollowUp && !["won", "lost"].includes(l.stage) && daysFromToday(l.nextFollowUp) <= 0).length;
  const badges: Record<string, number> = { "/leads": newLeads, "/tasks": myOverdue };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const perms = useStore((s) => s.permissions);
  const members = useStore((s) => s.members);
  const can = (href: string, level: "view" | "edit" = "view") => {
    const mod = moduleForPath(href.split("?")[0]!);
    if (!mod) return true;
    const p = permFor({ members, settings, permissions: perms }, mod);
    return level === "view" ? p.access !== "none" : p.access === "edit";
  };
  const routeMod = moduleForPath(pathname);
  const blocked = !!routeMod && !can(pathname);
  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((it) => can(it.href)) })).filter((g) => g.items.length);

  if (pathname.endsWith("/print")) return <>{hydrated && !blocked ? children : null}</>;

  const sidebar = (
    <aside
      className={cn(
        "sidebar-flat flex h-full flex-col border-r border-espresso-line text-cream transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className={cn("flex h-[72px] items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sand/30 bg-bronze">
          <span className="text-[18px] font-bold text-white">A</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold text-white">Afaq Al Manzel</p>
            <p className="text-[10.5px] tracking-[0.22em] text-sand uppercase">Interiors CRM</p>
          </div>
        )}
      </div>

      <nav className="scroll-thin mt-2 flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {nav.map((g) => (
          <div key={g.group}>
            {!collapsed && <p className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.18em] text-sand/80 uppercase">{g.group}</p>}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                      active ? "text-white" : "text-[#e9dfcf] hover:bg-white/[0.06] hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-bronze"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <Icon size={18} strokeWidth={1.8} className="relative shrink-0" />
                    {!collapsed && <span className="relative flex-1 truncate">{it.label}</span>}
                    {!collapsed && badges[it.href] ? (
                      <span className="relative rounded-full bg-sand/90 px-1.5 text-[11px] font-semibold text-espresso">{badges[it.href]}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn("hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] text-[#e9dfcf] transition hover:bg-white/[0.06] hover:text-cream lg:flex", collapsed && "justify-center px-0")}
        >
          <ChevronsLeft size={16} className={cn("transition", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="no-print hidden h-full shrink-0 lg:block">{sidebar}</div>

      <AnimatePresence>
        {mobile && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-espresso/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <motion.div className="absolute inset-y-0 left-0" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 380, damping: 36 }}>
              {sidebar}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print relative z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-background/80 px-4 backdrop-blur md:px-8">
          <button className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button
            onClick={() => setPalette(true)}
            className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-left text-[13.5px] text-ink-3 transition hover:border-line-strong"
          >
            <Search size={16} />
            <span className="flex-1 truncate">Search leads, clients, projects, quotes…</span>
            <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] text-ink-3 sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {isSupabaseConfigured && <SyncIndicator />}
            {!isSupabaseConfigured && me && me.role !== "Director" && (
              <button
                onClick={() => {
                  const d = members.find((m) => m.role === "Director" && m.active);
                  if (d) useStore.getState().updateSettings({ currentUserId: d.id });
                }}
                className="hidden items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[12.5px] font-medium text-warning md:flex"
              >
                Viewing as {me.name.split(" ")[0]} ({me.role}) · Back to Director
              </button>
            )}
            {can("/leads", "edit") && <Link
              href="/leads?new=1"
              className="hidden h-10 items-center gap-2 rounded-xl bg-bronze px-4 text-[13.5px] font-medium text-white shadow-[0_6px_16px_-6px_rgba(103,79,45,0.6)] transition hover:bg-[#5a4427] sm:flex"
            >
              <Plus size={16} /> New lead
            </Link>}
            {can("/leads") && <button
              onClick={() => router.push("/leads?view=followups")}
              className="relative rounded-xl p-2.5 text-ink-2 transition hover:bg-surface-2"
              aria-label={`${followUpsDue} follow-ups due`}
              title={`${followUpsDue} follow-ups due today or overdue`}
            >
              <Bell size={19} />
              {followUpsDue > 0 && <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{followUpsDue}</span>}
            </button>}
            {isSupabaseConfigured ? (
              <div className="ml-1">
                <AccountMenu>
                  <Avatar member={me} size={36} />
                  <div className="hidden text-left leading-tight xl:block">
                    <p className="text-[13px] font-semibold text-ink">{me?.name}</p>
                    <p className="text-[11.5px] text-ink-3">{me?.role}</p>
                  </div>
                </AccountMenu>
              </div>
            ) : (
              <div className="ml-1 flex items-center gap-2.5 rounded-xl py-1 pr-1 pl-1">
                <Avatar member={me} size={36} />
                <div className="hidden leading-tight xl:block">
                  <p className="text-[13px] font-semibold text-ink">{me?.name}</p>
                  <p className="text-[11.5px] text-ink-3">{me?.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="scroll-thin flex-1 overflow-y-auto">
          <div className="w-full px-4 py-8 md:px-8 2xl:px-10">
            {!hydrated ? (
              <ShellSkeleton />
            ) : blocked ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-3"><ShieldOff size={24} /></span>
                <h1 className="mt-5 text-[22px] font-semibold text-ink">You don’t have access to this page</h1>
                <p className="mt-1.5 max-w-sm text-[14px] text-ink-3">Your role ({me?.role}) can’t open this section. Ask a Director to change your permissions on Team → Roles & permissions.</p>
                <Link href="/" className="mt-6 rounded-xl bg-bronze px-4 py-2.5 text-[13.5px] font-medium text-white">Back to dashboard</Link>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />

      <div className="pointer-events-none fixed right-6 bottom-6 z-[60] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-espresso px-4 py-3 text-[13.5px] text-cream shadow-[var(--shadow-float)]"
            >
              <span className="h-2 w-2 rounded-full bg-sand" />
              {t.text}
              <button onClick={() => useToasts.getState().drop(t.id)} className="text-sand/60 hover:text-cream" aria-label="Dismiss">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-72 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-surface-2" />
    </div>
  );
}
