"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, CheckSquare, CornerDownLeft, FileText, Plus, Receipt, Search, Target, Users } from "lucide-react";
import { quoteRecipient, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { permFor } from "@/lib/perms";
import type { Module } from "@/lib/types";

type Item = { id: string; group: string; label: string; sub?: string; href: string; icon: React.ElementType };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const s = useStore();
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const items = React.useMemo<Item[]>(() => {
    const term = q.trim().toLowerCase();
    const can = (m: Module, lvl: "view" | "edit" = "view") => {
      const a = permFor(s, m).access;
      return lvl === "view" ? a !== "none" : a === "edit";
    };
    const actions: Item[] = [
      can("leads", "edit") && { id: "na", group: "Quick actions", label: "New lead", href: "/leads?new=1", icon: Plus },
      can("quotes", "edit") && { id: "nq", group: "Quick actions", label: "New quotation", href: "/quotes/new", icon: Plus },
      can("invoices", "edit") && { id: "ni", group: "Quick actions", label: "New invoice", href: "/invoices?new=1", icon: Plus },
      can("tasks", "edit") && { id: "nt", group: "Quick actions", label: "New task", href: "/tasks?new=1", icon: Plus },
    ].filter(Boolean) as Item[];
    if (!term) return actions;
    const m = (...f: (string | undefined)[]) => f.some((x) => x?.toLowerCase().includes(term));
    return [
      ...actions.filter((a) => m(a.label)),
      ...(can("leads") ? s.leads : []).filter((l) => m(l.name, l.company, l.ref, l.phone, l.location)).slice(0, 6).map((l) => ({ id: l.id, group: "Leads", label: l.name, sub: `${l.ref} · ${l.location}`, href: `/leads/${l.id}`, icon: Target })),
      ...(can("clients") ? s.clients : []).filter((c) => m(c.name, c.company, c.ref, c.phone, c.city)).slice(0, 5).map((c) => ({ id: c.id, group: "Clients", label: c.name, sub: `${c.ref} · ${c.city}`, href: `/clients/${c.id}`, icon: Users })),
      ...(can("projects") ? s.projects : []).filter((p) => m(p.name, p.ref, p.location)).slice(0, 5).map((p) => ({ id: p.id, group: "Projects", label: p.name, sub: `${p.ref} · ${p.location}`, href: `/projects/${p.id}`, icon: Briefcase })),
      ...(can("quotes") ? s.quotes : []).filter((x) => m(x.title, x.ref, quoteRecipient(x, s).name)).slice(0, 5).map((x) => ({ id: x.id, group: "Quotations", label: `${x.ref} v${x.version}`, sub: x.title, href: `/quotes/${x.id}`, icon: FileText })),
      ...(can("invoices") ? s.invoices : []).filter((x) => m(x.title, x.ref)).slice(0, 5).map((x) => ({ id: x.id, group: "Invoices", label: x.ref, sub: x.title, href: `/invoices/${x.id}`, icon: Receipt })),
      ...(can("tasks") ? s.tasks : []).filter((t) => m(t.title)).slice(0, 5).map((t) => ({ id: t.id, group: "Tasks", label: t.title, href: `/tasks?task=${t.id}`, icon: CheckSquare })),
    ];
  }, [q, s]);

  const go = (it?: Item) => {
    if (!it) return;
    onClose();
    router.push(it.href);
  };

  if (!mounted) return null;
  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="fixed inset-0 bg-espresso/40 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-float)]"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search size={18} className="text-ink-3" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIdx((i) => Math.min(items.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIdx((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") go(items[idx]);
                  else if (e.key === "Escape") onClose();
                }}
                placeholder="Type a name, phone, reference…"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
            <div className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
              {items.length === 0 && <p className="px-4 py-10 text-center text-[13.5px] text-ink-3">No matches for “{q}”.</p>}
              {items.map((it, i) => {
                const header = it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const Icon = it.icon;
                return (
                  <React.Fragment key={it.group + it.id}>
                    {header && <p className="px-3 pt-3 pb-1 text-[10.5px] font-semibold tracking-[0.16em] text-ink-3 uppercase">{header}</p>}
                    <button
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => go(it)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", i === idx ? "bg-surface-2" : "")}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream/50 text-bronze">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink">{it.label}</span>
                        {it.sub && <span className="block truncate text-[12px] text-ink-3">{it.sub}</span>}
                      </span>
                      {i === idx && <CornerDownLeft size={14} className="text-ink-3" />}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
