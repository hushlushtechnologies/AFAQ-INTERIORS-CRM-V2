"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { animate, motion, useInView } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarClock, FileText, Flag, Phone, Receipt, CheckSquare } from "lucide-react";
import { cn, compact, daysFromToday, fmtDate, money, relative } from "@/lib/utils";
import { PROJECT_STATUS } from "@/lib/constants";
import { Avatar, Card } from "@/components/ui";
import { CAT, SEQ, pct } from "./data";
import type { Member } from "@/lib/types";

/* ───────── shared ───────── */

export function Panel({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </Card>
  );
}

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 text-[12.5px] font-medium text-bronze hover:underline">
      {children}
    </Link>
  );
}

/** floating tooltip that follows the pointer (for custom SVG charts) */
export function useTip() {
  const [tip, setTip] = React.useState<{ x: number; y: number; node: React.ReactNode } | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const show = (e: React.MouseEvent, node: React.ReactNode) => setTip({ x: e.clientX, y: e.clientY, node });
  const hide = () => setTip(null);
  const el =
    mounted && tip
      ? createPortal(
          <div className="pointer-events-none fixed z-[80] rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px] shadow-[var(--shadow-float)]" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            {tip.node}
          </div>,
          document.body,
        )
      : null;
  return { show, hide, el };
}

export function ChartTooltip({ active, payload, label, fmt = money }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[]; label?: string; fmt?: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px] shadow-[var(--shadow-card)]">
      <p className="mb-1 font-semibold text-ink">{(payload[0]?.payload?.full as string) ?? label}</p>
      {payload.map((p) => (
        <p key={p.name} className="tabular flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{fmt(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{format(v)}</span>;
}

export function Delta({ now, prev, invert }: { now: number; prev: number; invert?: boolean }) {
  const d = pct(now, prev);
  if (!now && !prev) return <span className="text-[11.5px] text-ink-3">no change</span>;
  const up = d >= 0;
  const good = invert ? !up : up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold", good ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(d)}%
    </span>
  );
}

/* ───────── sparkline ───────── */

export function Sparkline({ data, color = CAT[0], height = 44, format = money }: { data: number[]; color?: string; height?: number; format?: (n: number) => string }) {
  const w = 160;
  const max = Math.max(1, ...data);
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 4 - (v / max) * (height - 10)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const id = React.useId().replace(/:/g, "");
  const [hover, setHover] = React.useState<number | null>(null);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-11 w-full overflow-visible" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))));
        }}>
        <defs>
          <linearGradient id={`sg${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.path d={`${line} L${w},${height} L0,${height} Z`} fill={`url(#sg${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <clipPath id={`sc${id}`}>
          <motion.rect x={0} y={-4} height={height + 8} initial={{ width: 0 }} animate={{ width: w }} transition={{ duration: 1.1, ease: "easeOut" }} />
        </clipPath>
        <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#sc${id})`} />
        {hover !== null && <line x1={pts[hover]![0]} x2={pts[hover]![0]} y1={0} y2={height} stroke="#d6c9b8" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover !== null && (
        <>
          <span className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface" style={{ left: `${(pts[hover]![0] / w) * 100}%`, top: `${(pts[hover]![1] / height) * 100}%`, background: color }} />
          <span className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-espresso px-1.5 py-0.5 text-[11px] whitespace-nowrap text-cream" style={{ left: `${(pts[hover]![0] / w) * 100}%` }}>
            {hover === data.length - 1 ? "This week" : `${data.length - 1 - hover}w ago`}: {format(data[hover]!)}
          </span>
        </>
      )}
    </div>
  );
}

export function KpiCard({ label, value, format, now, prev, spark, color, href, foot, invert }: { label: string; value: number; format: (n: number) => string; now: number; prev: number; spark: number[]; color: string; href: string; foot: React.ReactNode; invert?: boolean }) {
  return (
    <Card className="group relative flex h-full flex-col overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-float)]">
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />
      <Link href={href} className="absolute inset-0 z-10" aria-label={label} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-ink-3">{label}</p>
        <Delta now={now} prev={prev} invert={invert} />
      </div>
      <p className="tabular mt-2 text-[26px] font-semibold tracking-tight text-ink">
        <CountUp value={value} format={format} />
      </p>
      <div className="relative z-20 mt-2">
        <Sparkline data={spark} color={color} format={format} />
      </div>
      <p className="mt-auto pt-2 text-[12px] text-ink-3">{foot}</p>
    </Card>
  );
}

/* ───────── cash flow (one axis, AED) ───────── */

type Month = { label: string; full: string; invoiced: number; collected: number; signed: number; leads: number };
export function MonthlyChart({ months, show }: { months: Month[]; show: { cash: boolean; signed: boolean; leads: boolean } }) {
  const tabs = ([show.cash && ["cash", "Cash flow"], show.signed && ["signed", "New contracts"], show.leads && ["leads", "Lead volume"]].filter(Boolean) as [string, string][]);
  const [tab, setTab] = React.useState(tabs[0]?.[0] ?? "cash");
  const hasOld = (k: string) => months.slice(0, 6).some((m) => (k === "cash" ? m.invoiced || m.collected : k === "signed" ? m.signed : m.leads));
  const [range, setRange] = React.useState<6 | 12>(hasOld(tabs[0]?.[0] ?? "cash") ? 12 : 6);
  const pickTab = (k: string) => {
    setTab(k);
    setRange(hasOld(k) ? 12 : 6);
  };
  const data = months.slice(-range);
  const total = (k: keyof Month) => data.reduce((a, m) => a + (m[k] as number), 0);
  const isCount = tab === "leads";
  return (
    <Panel
      className="h-full"
      title={tab === "cash" ? "Cash flow" : tab === "signed" ? "New contracts signed" : "New leads"}
      subtitle={
        tab === "cash"
          ? `${money(total("invoiced"))} invoiced · ${money(total("collected"))} collected, incl. VAT`
          : tab === "signed"
            ? `${money(total("signed"))} contract value excl. VAT`
            : `${total("leads")} enquiries received`
      }
      action={
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-surface-2/70 p-0.5">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => pickTab(k)} className={cn("rounded-md px-2.5 py-1 text-[12px] font-medium transition", tab === k ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2")}>{l}</button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-line bg-surface-2/70 p-0.5">
            {([6, 12] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("rounded-md px-2 py-1 text-[12px] font-medium transition", range === r ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2")}>{r}M</button>
            ))}
          </div>
        </div>
      }
    >
      <div className="min-h-[290px] flex-1 px-2 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 6, right: 12, top: 8 }} barGap={2} barCategoryGap={range === 6 ? "28%" : "22%"}>
            <CartesianGrid vertical={false} stroke="#eee6da" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#8a7d70", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8a7d70", fontSize: 12 }} tickFormatter={(v) => (isCount ? String(v) : compact(v))} width={44} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#f4eee5" }} content={<ChartTooltip fmt={isCount ? (n) => `${n} leads` : money} />} />
            {tab === "cash" && <Bar dataKey="invoiced" name="Invoiced" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={900} />}
            {tab === "cash" && <Bar dataKey="collected" name="Collected" fill={CAT[1]} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={900} />}
            {tab === "signed" && <Bar dataKey="signed" name="Contract value" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={34} animationDuration={900} />}
            {tab === "leads" && <Bar dataKey="leads" name="Leads" fill={CAT[0]} radius={[4, 4, 0, 0]} maxBarSize={34} animationDuration={900} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {tab === "cash" && (
        <div className="flex gap-5 px-5 pt-1 pb-5 text-[12.5px] text-ink-2">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT[0] }} /> Invoiced</span>
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT[1] }} /> Collected</span>
        </div>
      )}
      {tab !== "cash" && <div className="pb-4" />}
    </Panel>
  );
}

/* ───────── rings ───────── */

export function Ring({ value, label, sub, color = CAT[0], size = 112 }: { value: number; label: string; sub: string; color?: string; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" role="img" aria-label={`${label} ${v}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efe7db" strokeWidth={10} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v / 100) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        <text x="50%" y="50%" transform={`rotate(90 ${size / 2} ${size / 2})`} textAnchor="middle" dominantBaseline="central" className="fill-ink" style={{ fontSize: size * 0.22, fontWeight: 700 }}>
          {v}%
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{sub}</p>
      </div>
    </div>
  );
}

/* ───────── funnel ───────── */

export function Funnel({ steps }: { steps: { label: string; count: number; value: number }[] }) {
  const max = Math.max(1, steps[0]?.count ?? 1);
  const tip = useTip();
  return (
    <div className="space-y-1.5 px-5 pt-2 pb-5">
      {steps.map((s, i) => {
        const w = Math.max(8, (s.count / max) * 100);
        const conv = i > 0 && steps[i - 1]!.count ? Math.round((s.count / steps[i - 1]!.count) * 100) : null;
        const shade = SEQ[Math.min(SEQ.length - 1, Math.round((i / (steps.length - 1)) * (SEQ.length - 1)))]!;
        const dark = i / (steps.length - 1) > 0.45;
        return (
          <div key={s.label}>
            {conv !== null && (
              <div className="flex justify-center py-0.5">
                <span className="text-[11px] font-medium text-ink-3">↓ {conv}% moved on</span>
              </div>
            )}
            <div className="flex justify-center">
              <motion.div
                className="flex h-10 cursor-default items-center justify-between rounded-lg px-3.5"
                style={{ background: shade }}
                initial={{ width: "8%", opacity: 0 }}
                animate={{ width: `${w}%`, opacity: 1 }}
                transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                onMouseMove={(e) => tip.show(e, <><p className="font-semibold text-ink">{s.label}</p><p className="tabular text-ink-2">{s.count} leads · {money(s.value)}</p></>)}
                onMouseLeave={tip.hide}
              >
                <span className={cn("truncate text-[12.5px] font-medium", dark ? "text-white" : "text-ink")}>{s.label}</span>
                <span className={cn("tabular pl-2 text-[13px] font-semibold", dark ? "text-white" : "text-ink")}>{s.count}</span>
              </motion.div>
            </div>
          </div>
        );
      })}
      {tip.el}
    </div>
  );
}

/* ───────── sources donut ───────── */

export function SourcesDonut({ sources }: { sources: { name: string; count: number; won: number; value: number; color: string }[] }) {
  const total = sources.reduce((a, s) => a + s.count, 0);
  const [active, setActive] = React.useState<number | null>(null);
  const a = active !== null ? sources[active] : undefined;
  return (
    <div className="@container flex flex-1 items-center px-5 pb-5">
    <div className="flex w-full flex-col items-center gap-4 @[430px]:flex-row @[430px]:items-center">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sources} dataKey="count" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="#fffdf9" strokeWidth={2} startAngle={90} endAngle={-270}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)} animationDuration={900}>
              {sources.map((s, i) => (
                <Cell key={s.name} fill={s.color} opacity={active === null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="tabular text-[24px] font-semibold text-ink">{a ? a.count : total}</p>
          <p className="max-w-[100px] truncate text-[11.5px] text-ink-3">{a ? a.name : "leads"}</p>
          {a && <p className="text-[11px] text-ink-3">{Math.round((a.count / Math.max(1, total)) * 100)}%</p>}
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1">
        {sources.map((s, i) => (
          <li key={s.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] transition", active === i && "bg-surface-2")}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
            <span className="tabular shrink-0 text-ink-2">{s.count}</span>
            <span className="tabular w-14 shrink-0 text-right text-ink-3">{s.won} won</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

/* ───────── project timeline (gantt) ───────── */

export function ProjectTimeline({ projects }: { projects: { id: string; name: string; client: string; startDate: string; dueDate: string; progress: number; status: string; value: number }[] }) {
  const tip = useTip();
  if (!projects.length) return <p className="px-5 pb-6 text-[13px] text-ink-3">No live projects.</p>;
  const t = (d: string) => new Date(d).getTime();
  const min = Math.min(...projects.map((p) => t(p.startDate)), Date.now() - 14 * 86_400_000);
  const max = Math.max(...projects.map((p) => t(p.dueDate)), Date.now() + 30 * 86_400_000);
  const x = (d: number) => ((d - min) / (max - min)) * 100;
  const todayX = x(Date.now());
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  return (
    <div className="flex flex-1 flex-col px-5 pb-5">
      <div className="relative ml-[34%] h-6 border-b border-line text-[11px] text-ink-3">
        {ticks.map((tk, i) => (
          <span key={i} className={cn("absolute whitespace-nowrap", i === 0 ? "" : i === 4 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${(i / 4) * 100}%` }}>{new Date(tk).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}</span>
        ))}
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[34%]">
          <div className="absolute inset-y-0 w-px bg-danger/60" style={{ left: `${todayX}%` }}>
            <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-danger px-1 text-[9.5px] font-semibold text-white">Today</span>
          </div>
        </div>
        {projects.map((p, i) => {
          const late = daysFromToday(p.dueDate) < 0 && p.status !== "handover";
          const st = PROJECT_STATUS.find((s) => s.id === p.status);
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="group flex items-center gap-3 border-b border-line/70 py-2.5 last:border-0">
              <div className="w-[34%] min-w-0 pr-2">
                <p className="truncate text-[13px] font-medium text-ink group-hover:text-bronze">{p.name}</p>
                <p className="truncate text-[11.5px] text-ink-3">{p.client} · {st?.label}</p>
              </div>
              <div className="relative h-7 flex-1">
                <motion.div
                  className="absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-[4px]"
                  style={{ left: `${x(t(p.startDate))}%`, background: "#efe6d8" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(1.5, x(t(p.dueDate)) - x(t(p.startDate)))}%` }}
                  transition={{ duration: 0.9, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  onMouseMove={(e) => tip.show(e, <><p className="font-semibold text-ink">{p.name}</p><p className="text-ink-2">{fmtDate(p.startDate)} → {fmtDate(p.dueDate)}</p><p className="text-ink-2">{p.progress}% complete · {money(p.value)}</p>{late && <p className="font-medium text-danger">Past handover date</p>}</>)}
                  onMouseLeave={tip.hide}
                >
                  <div className="h-full rounded-[4px]" style={{ width: `${p.progress}%`, background: late ? "#b54a3a" : CAT[0] }} />
                </motion.div>
              </div>
              <span className={cn("tabular w-10 text-right text-[12px] font-semibold", late ? "text-danger" : "text-ink-2")}>{p.progress}%</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto flex flex-wrap gap-4 pt-4 text-[11.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: CAT[0] }} /> Progress</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[#efe6d8]" /> Planned duration</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[#b54a3a]" /> Late</span>
      </div>
      {tip.el}
    </div>
  );
}

/* ───────── receivables aging ───────── */

export function Aging({ aging, total }: { aging: { key: string; value: number }[]; total: number }) {
  const colors = [SEQ[1], SEQ[2], SEQ[3], SEQ[4]] as string[];
  const tip = useTip();
  return (
    <div className="px-5 pb-5">
      <p className="tabular text-[26px] font-semibold tracking-tight text-ink"><CountUp value={total} format={money} /></p>
      <p className="text-[12px] text-ink-3">outstanding incl. VAT</p>
      <div className="mt-4 flex h-3.5 gap-[2px] overflow-hidden rounded-[4px]">
        {total > 0 ? (
          aging.map((a, i) =>
            a.value > 0 ? (
              <motion.div key={a.key} className="h-full first:rounded-l-[4px] last:rounded-r-[4px]" style={{ background: colors[i] }}
                initial={{ flexGrow: 0 }} animate={{ flexGrow: a.value }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                onMouseMove={(e) => tip.show(e, <><p className="font-semibold text-ink">{a.key}</p><p className="tabular text-ink-2">{money(a.value)}</p></>)} onMouseLeave={tip.hide} />
            ) : null,
          )
        ) : (
          <div className="h-full flex-1 rounded-[4px] bg-success-soft" />
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {aging.map((a, i) => (
          <li key={a.key} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[i] }} />
            <span className="flex-1 text-ink-2">{a.key}</span>
            <span className={cn("tabular font-medium", i >= 2 && a.value > 0 ? "text-danger" : "text-ink")}>{money(a.value)}</span>
          </li>
        ))}
      </ul>
      {tip.el}
    </div>
  );
}

/* ───────── activity heatmap ───────── */

export function Heatmap({ cells }: { cells: { date: Date; count: number }[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const level = (n: number) => (n === 0 ? -1 : Math.min(SEQ.length - 1, Math.ceil((n / max) * (SEQ.length - 1))));
  const tip = useTip();
  const weeks = Array.from({ length: 12 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const total = cells.reduce((a, c) => a + c.count, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className="flex flex-1 flex-col justify-center px-5 pb-5">
      <div className="mx-auto w-full max-w-[460px]">
      <div className="flex gap-2">
        <div className="flex flex-col justify-around py-[2px] text-[10.5px] text-ink-3">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="leading-none">{i % 2 ? d : ""}</span>)}
        </div>
        <div className="grid flex-1 grid-cols-12 gap-[3px]">
          {weeks.map((wk, w) => (
            <div key={w} className="grid grid-rows-7 gap-[3px]">
              {wk.map((c) => {
                const l = level(c.count);
                const future = c.date > today;
                return (
                  <motion.div key={c.date.toISOString()} className="aspect-square min-h-[14px] rounded-[3px]"
                    style={{ background: future ? "transparent" : l < 0 ? "#f1ebe2" : SEQ[l], border: future ? "1px dashed #e6ddd1" : undefined }}
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: w * 0.025 }}
                    onMouseMove={(e) => !future && tip.show(e, <><p className="font-semibold text-ink">{c.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p><p className="text-ink-2">{c.count} updates</p></>)}
                    onMouseLeave={tip.hide} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11.5px] text-ink-3">
        <span>{total} calls, meetings, visits & notes in 12 weeks</span>
        <span className="flex items-center gap-1">Less {["#f1ebe2", ...SEQ].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />)} More</span>
      </div>
      </div>
      {tip.el}
    </div>
  );
}

/* ───────── leaderboard ───────── */

export function Leaderboard({ rows }: { rows: { member: Member; open: number; pipeline: number; won: number; wonValue: number; conversion: number; touches: number }[] }) {
  const maxV = Math.max(1, ...rows.map((r) => r.wonValue + r.pipeline));
  if (!rows.length) return <p className="px-5 pb-6 text-[13px] text-ink-3">No sales team yet.</p>;
  return (
    <div className="flex flex-1 flex-col px-2 pb-3">
      <div className="grid grid-cols-[1fr_minmax(120px,1.3fr)_64px_64px] gap-3 px-3 pb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
        <span>Person</span><span>Won + open pipeline</span><span className="text-right">Win rate</span><span className="text-right">Updates</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.member.id} className="grid grid-cols-[1fr_minmax(120px,1.3fr)_64px_64px] items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn("w-4 text-[12px] font-semibold", i === 0 ? "text-bronze" : "text-ink-3")}>{i + 1}</span>
            <Avatar member={r.member} size={30} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{r.member.name}</p>
              <p className="text-[11.5px] text-ink-3">{r.won} won · {r.open} open</p>
            </div>
          </div>
          <div>
            <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full rounded-l-full" style={{ background: CAT[0] }} initial={{ width: 0 }} animate={{ width: `${(r.wonValue / maxV) * 100}%` }} transition={{ duration: 0.9 }} />
              <motion.div className="h-full rounded-r-full" style={{ background: CAT[1], opacity: 0.55 }} initial={{ width: 0 }} animate={{ width: `${(r.pipeline / maxV) * 100}%` }} transition={{ duration: 0.9, delay: 0.1 }} />
            </div>
            <p className="tabular mt-1 text-[11.5px] text-ink-3"><span className="text-ink-2">{money(r.wonValue)}</span> won · {money(r.pipeline)} open</p>
          </div>
          <span className="tabular text-right text-[13px] font-semibold text-ink">{r.conversion}%</span>
          <span className="tabular text-right text-[13px] text-ink-2">{r.touches}</span>
        </div>
      ))}
      <div className="mt-auto flex gap-4 px-3 pt-3 text-[11.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT[0] }} /> Won</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: CAT[1], opacity: 0.55 }} /> Open pipeline</span>
        <span>· updates = last 30 days</span>
      </div>
    </div>
  );
}

/* ───────── agenda ───────── */

const AG = {
  "follow-up": { icon: Phone, tone: "bg-cream/70 text-bronze" },
  task: { icon: CheckSquare, tone: "bg-info-soft text-info" },
  handover: { icon: Flag, tone: "bg-success-soft text-success" },
  invoice: { icon: Receipt, tone: "bg-warning-soft text-warning" },
  quote: { icon: FileText, tone: "bg-surface-2 text-ink-2" },
} as const;

export function Agenda({ items }: { items: { date: string; kind: keyof typeof AG; title: string; sub: string; href: string }[] }) {
  if (!items.length) return <p className="px-5 pb-6 text-[13px] text-ink-3">Nothing scheduled for the next 7 days.</p>;
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const k = daysFromToday(it.date) < 0 ? "Overdue" : relative(it.date) === "Today" ? "Today" : relative(it.date) === "Tomorrow" ? "Tomorrow" : new Date(it.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  return (
    <div className="scroll-thin max-h-[420px] overflow-y-auto px-3 pb-4">
      {[...groups.entries()].map(([day, list]) => (
        <div key={day} className="mb-2">
          <p className={cn("sticky top-0 z-10 bg-surface px-2 py-1.5 text-[11px] font-semibold tracking-wide uppercase", day === "Overdue" ? "text-danger" : "text-ink-3")}>{day} · {list.length}</p>
          {list.map((it, i) => {
            const m = AG[it.kind];
            const Icon = m.icon;
            return (
              <Link key={i} href={it.href} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2/60">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.tone)}><Icon size={14} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{it.title}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{it.sub}</span>
                </span>
                {day === "Overdue" && <span className="text-[11.5px] font-medium text-danger">{relative(it.date)}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export { CalendarClock };
