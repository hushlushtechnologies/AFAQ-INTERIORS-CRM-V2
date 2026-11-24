"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { OPEN_STAGES, STAGE_PROBABILITY, STAGES } from "@/lib/constants";
import { daysFromToday, invoiceStatus, invoiceTotals, quoteTotals } from "@/lib/utils";
import type { LeadStage } from "@/lib/types";

/** validated categorical palette (dataviz validator: all checks pass on #fffdf9) — fixed order, never cycled */
export const CAT = ["#9b6b25", "#2e76c2", "#d06a2e", "#1d9a73", "#7a5ccd", "#c75289"] as const;
export const OTHER = "#a39a8e";
/** sequential bronze ramp, light → dark */
export const SEQ = ["#f1e9dc", "#e4d2ae", "#cfaa6c", "#a77a35", "#6e5126"];

const DAY = 86_400_000;
const ts = (d: string) => new Date(d).getTime();
const now = () => Date.now();
const within = (d: string | undefined, fromDaysAgo: number, toDaysAgo = 0) => {
  if (!d) return false;
  const t = ts(d);
  return t >= now() - fromDaysAgo * DAY && t < now() - toDaysAgo * DAY;
};
export const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : 0);

export function useDashboard() {
  const s = useStore();
  return useMemo(() => {
    const live = s.invoices.filter((i) => !i.cancelled);
    const open = s.leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const payments = live.flatMap((i) => i.payments);

    /* ── headline KPIs (30 days vs previous 30) ── */
    const pipeline = open.reduce((a, l) => a + l.budget, 0);
    const weighted = open.reduce((a, l) => a + l.budget * STAGE_PROBABILITY[l.stage], 0);
    const newLeads = s.leads.filter((l) => within(l.createdAt, 30)).length;
    const newValue = s.leads.filter((l) => within(l.createdAt, 30)).reduce((a, l) => a + l.budget, 0);
    const newValuePrev = s.leads.filter((l) => within(l.createdAt, 60, 30)).reduce((a, l) => a + l.budget, 0);
    const newLeadsPrev = s.leads.filter((l) => within(l.createdAt, 60, 30)).length;
    const signed = s.projects.filter((p) => within(p.startDate, 30)).reduce((a, p) => a + p.value, 0);
    const signedPrev = s.projects.filter((p) => within(p.startDate, 60, 30)).reduce((a, p) => a + p.value, 0);
    const collected = payments.filter((p) => within(p.date, 30)).reduce((a, p) => a + p.amount, 0);
    const collectedPrev = payments.filter((p) => within(p.date, 60, 30)).reduce((a, p) => a + p.amount, 0);
    const closed = s.leads.filter((l) => l.stage === "won" || l.stage === "lost");
    const won = s.leads.filter((l) => l.stage === "won");
    const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
    const avgDeal = s.projects.length ? s.projects.reduce((a, p) => a + p.value, 0) / s.projects.length : 0;

    /* ── receivables aging ── */
    const aging = [
      { key: "Not yet due", value: 0 },
      { key: "1–30 days", value: 0 },
      { key: "31–60 days", value: 0 },
      { key: "60+ days", value: 0 },
    ];
    let invoicedAll = 0;
    let paidAll = 0;
    for (const inv of live) {
      const t = invoiceTotals(inv);
      invoicedAll += t.total;
      paidAll += t.paid;
      if (t.balance <= 0) continue;
      const late = -daysFromToday(inv.dueDate);
      aging[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3]!.value += t.balance;
    }
    const receivable = aging.reduce((a, b) => a + b.value, 0);
    const topDue = live
      .map((i) => ({ inv: i, bal: invoiceTotals(i).balance, late: -daysFromToday(i.dueDate), client: s.clients.find((c) => c.id === i.clientId)?.name ?? "" }))
      .filter((x) => x.bal > 0)
      .sort((a, b) => b.late - a.late || b.bal - a.bal)
      .slice(0, 4);
    const overdue = receivable - aging[0]!.value;
    const collectionRate = invoicedAll ? Math.round((paidAll / invoicedAll) * 100) : 0;

    /* ── monthly series, last 12 months ── */
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - (11 - i));
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-GB", { month: "short" }), full: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), invoiced: 0, collected: 0, signed: 0, leads: 0 };
    });
    const mk = (d: string) => {
      const x = new Date(d);
      return months.find((m) => m.key === `${x.getFullYear()}-${x.getMonth()}`);
    };
    for (const inv of live) {
      const m = mk(inv.issueDate);
      if (m) m.invoiced += invoiceTotals(inv).total;
    }
    for (const p of payments) {
      const m = mk(p.date);
      if (m) m.collected += p.amount;
    }
    for (const p of s.projects) {
      const m = mk(p.startDate);
      if (m) m.signed += p.value;
    }
    for (const l of s.leads) {
      const m = mk(l.createdAt);
      if (m) m.leads += 1;
    }

    /* ── weekly sparklines (12 weeks) ── */
    const weeks = (fn: (from: number, to: number) => number) =>
      Array.from({ length: 12 }, (_, i) => {
        const to = now() - (11 - i) * 7 * DAY;
        return fn(to - 7 * DAY, to);
      });
    const inWin = (d: string | undefined, a: number, b: number) => !!d && ts(d) >= a && ts(d) < b;
    const sparkLeads = weeks((a, b) => s.leads.filter((l) => inWin(l.createdAt, a, b)).length);
    const sparkPipeline = weeks((a, b) => s.leads.filter((l) => inWin(l.createdAt, a, b)).reduce((x, l) => x + l.budget, 0));
    const sparkCollected = weeks((a, b) => payments.filter((p) => inWin(p.date, a, b)).reduce((x, p) => x + p.amount, 0));
    const sparkSigned = weeks((a, b) => s.projects.filter((p) => inWin(p.startDate, a, b)).reduce((x, p) => x + p.value, 0));

    /* ── funnel: how many leads reached each stage ── */
    const order: LeadStage[] = ["new", "contacted", "requirements", "site_visit", "quotation", "negotiation", "won"];
    const reach = (l: { stage: LeadStage }) => (l.stage === "lost" ? 0 : order.indexOf(l.stage));
    const funnel = order.map((st, i) => {
      const n = s.leads.filter((l) => reach(l) >= i).length;
      return { stage: st, label: STAGES.find((x) => x.id === st)!.label, count: n, value: s.leads.filter((l) => reach(l) >= i).reduce((a, l) => a + l.budget, 0) };
    });

    /* ── lead sources (top 5 + Other) ── */
    const bySource = new Map<string, { count: number; won: number; value: number }>();
    for (const l of s.leads) {
      const k = l.source;
      const x = bySource.get(k) ?? { count: 0, won: 0, value: 0 };
      x.count++;
      if (l.stage === "won") x.won++;
      x.value += l.budget;
      bySource.set(k, x);
    }
    const srcSorted = [...bySource.entries()].sort((a, b) => b[1].count - a[1].count);
    const top = srcSorted.slice(0, 5);
    const rest = srcSorted.slice(5);
    const sources = [
      ...top.map(([name, v], i) => ({ name, ...v, color: CAT[i]! })),
      ...(rest.length ? [{ name: "Other", count: rest.reduce((a, [, v]) => a + v.count, 0), won: rest.reduce((a, [, v]) => a + v.won, 0), value: rest.reduce((a, [, v]) => a + v.value, 0), color: OTHER }] : []),
    ];

    /* ── activity heatmap: 12 weeks × 7 days ── */
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() - 7 * 11); // Sunday, 12 weeks ago
    const heat: { date: Date; count: number }[] = Array.from({ length: 84 }, (_, i) => ({ date: new Date(start.getTime() + i * DAY), count: 0 }));
    for (const a of s.activities) {
      const idx = Math.floor((ts(a.at) - start.getTime()) / DAY);
      if (idx >= 0 && idx < 84) heat[idx]!.count++;
    }
    for (const t of s.tasks) {
      if (t.status !== "done") continue;
      const idx = Math.floor((ts(t.dueDate) - start.getTime()) / DAY);
      if (idx >= 0 && idx < 84) heat[idx]!.count++;
    }

    /* ── projects timeline ── */
    const activeProjects = s.projects
      .filter((p) => !["completed"].includes(p.status))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((p) => ({ ...p, progress: Math.round(p.phases.reduce((a, ph) => a + ph.progress, 0) / Math.max(1, p.phases.length)), client: s.clients.find((c) => c.id === p.clientId)?.name ?? "" }));
    const contracted = s.projects.filter((p) => !["completed", "on_hold"].includes(p.status)).reduce((a, p) => a + p.value, 0);

    /* ── team leaderboard ── */
    const team = s.members
      .filter((m) => m.active && (m.role === "Sales Executive" || m.role === "Director"))
      .map((m) => {
        const mine = s.leads.filter((l) => l.ownerId === m.id);
        const mineOpen = mine.filter((l) => OPEN_STAGES.includes(l.stage));
        const mineWon = mine.filter((l) => l.stage === "won");
        const mineClosed = mine.filter((l) => l.stage === "won" || l.stage === "lost");
        const wonValue = mineWon.reduce((a, l) => a + (s.projects.filter((p) => p.clientId === l.clientId).reduce((x, p) => x + p.value, 0) || l.budget), 0);
        const touches = s.activities.filter((a) => a.byId === m.id && within(a.at, 30)).length;
        return { member: m, open: mineOpen.length, pipeline: mineOpen.reduce((a, l) => a + l.budget, 0), won: mineWon.length, wonValue, conversion: mineClosed.length ? Math.round((mineWon.length / mineClosed.length) * 100) : 0, touches };
      })
      .sort((a, b) => b.wonValue + b.pipeline * 0.3 - (a.wonValue + a.pipeline * 0.3));

    /* ── next 7 days agenda ── */
    type Ev = { date: string; kind: "follow-up" | "task" | "handover" | "invoice" | "quote"; title: string; sub: string; href: string };
    const ev: Ev[] = [];
    const soon = (d?: string) => !!d && daysFromToday(d) >= -7 && daysFromToday(d) <= 7;
    for (const l of open) if (soon(l.nextFollowUp)) ev.push({ date: l.nextFollowUp!, kind: "follow-up", title: l.name, sub: `Follow-up · ${STAGES.find((x) => x.id === l.stage)!.label}`, href: `/leads/${l.id}` });
    for (const t of s.tasks) if (t.status !== "done" && soon(t.dueDate) && t.assigneeId === s.settings.currentUserId) ev.push({ date: t.dueDate, kind: "task", title: t.title, sub: "Your task", href: `/tasks?task=${t.id}` });
    for (const p of activeProjects) if (daysFromToday(p.dueDate) >= 0 && daysFromToday(p.dueDate) <= 7) ev.push({ date: p.dueDate, kind: "handover", title: p.name, sub: "Handover due", href: `/projects/${p.id}` });
    for (const i of live) {
      const st = invoiceStatus(i);
      if ((st === "unpaid" || st === "partial") && daysFromToday(i.dueDate) >= 0 && daysFromToday(i.dueDate) <= 7) ev.push({ date: i.dueDate, kind: "invoice", title: i.ref, sub: "Invoice due", href: `/invoices/${i.id}` });
    }
    for (const q of s.quotes) if (q.status === "sent" && daysFromToday(q.validUntil) >= 0 && daysFromToday(q.validUntil) <= 7) ev.push({ date: q.validUntil, kind: "quote", title: `${q.ref} v${q.version}`, sub: "Quotation expires", href: `/quotes/${q.id}` });
    const agenda = ev.filter((e) => daysFromToday(e.date) >= 0 || e.kind === "follow-up").sort((a, b) => a.date.localeCompare(b.date));

    /* ── quotations ── */
    const quotesOpen = s.quotes.filter((q) => q.status === "sent");
    const quotesOpenValue = quotesOpen.reduce((a, q) => a + quoteTotals(q).total, 0);

    return {
      pipeline, weighted, newLeads, newValue, newValuePrev, topDue, newLeadsPrev, signed, signedPrev, collected, collectedPrev, winRate, avgDeal, won: won.length, closed: closed.length,
      aging, receivable, overdue, collectionRate, invoicedAll, paidAll,
      months, sparkLeads, sparkPipeline, sparkCollected, sparkSigned,
      funnel, sources, heat, activeProjects, contracted, team, agenda, quotesOpen, quotesOpenValue, open,
    };
  }, [s]);
}
