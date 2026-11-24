"use client";

import Link from "next/link";
import { CheckCircle2, FilePlus2, Plus, Sparkles, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePerm } from "@/lib/perms";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn, daysFromToday, money, timeAgo } from "@/lib/utils";
import { Avatar, Reveal } from "@/components/ui";
import { CAT, useDashboard } from "@/components/dashboard/data";
import { Agenda, Aging, CountUp, Funnel, Heatmap, KpiCard, Leaderboard, MonthlyChart, Panel, PanelLink, ProjectTimeline, Ring, SourcesDonut } from "@/components/dashboard/widgets";

export default function Dashboard() {
  const s = useStore();
  const d = useDashboard();
  const P = { leads: usePerm("leads"), quotes: usePerm("quotes"), projects: usePerm("projects"), invoices: usePerm("invoices"), tasks: usePerm("tasks"), studio: usePerm("studio") };
  const me = s.members.find((m) => m.id === s.settings.currentUserId);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const followToday = d.open.filter((l) => l.nextFollowUp && daysFromToday(l.nextFollowUp) <= 0).length;
  const fresh = s.leads.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 86_400_000).length;
  const myDue = s.tasks.filter((t) => t.assigneeId === s.settings.currentUserId && t.status !== "done" && daysFromToday(t.dueDate) <= 0).length;
  const handovers = d.activeProjects.filter((p) => daysFromToday(p.dueDate) >= 0 && daysFromToday(p.dueDate) <= 14).length;
  const today = [
    P.leads.canView && { label: "Follow-ups due", value: followToday, href: "/leads?view=followups", alert: followToday > 0 },
    P.leads.canView && { label: "New leads · 24h", value: fresh, href: "/leads" },
    P.tasks.canView && { label: "My tasks due", value: myDue, href: "/tasks", alert: myDue > 0 },
    P.projects.canView && { label: "Handovers · 14 days", value: handovers, href: "/projects" },
  ].filter(Boolean) as { label: string; value: number; href: string; alert?: boolean }[];

  const kpis = [
    P.leads.canView && (
      <KpiCard key="p" label="Open pipeline" value={d.pipeline} format={money} now={d.newValue} prev={d.newValuePrev} spark={d.sparkPipeline} color={CAT[0]} href="/leads"
        foot={<>{d.open.length} open leads · {money(d.weighted)} weighted</>} />
    ),
    P.projects.canView && (
      <KpiCard key="s" label="Contracts signed · 30 days" value={d.signed} format={money} now={d.signed} prev={d.signedPrev} spark={d.sparkSigned} color={CAT[3]} href="/projects"
        foot={<>{money(d.contracted)} in live projects</>} />
    ),
    P.invoices.canView && (
      <KpiCard key="c" label="Collected · 30 days" value={d.collected} format={money} now={d.collected} prev={d.collectedPrev} spark={d.sparkCollected} color={CAT[1]} href="/invoices"
        foot={<>{d.collectionRate}% of everything invoiced is collected</>} />
    ),
    P.leads.canView && (
      <KpiCard key="l" label="New leads · 30 days" value={d.newLeads} format={(n) => Math.round(n).toString()} now={d.newLeads} prev={d.newLeadsPrev} spark={d.sparkLeads} color={CAT[2]} href="/leads"
        foot={<>{d.sources[0] ? <>Top source: {d.sources[0].name}</> : "No leads yet"}</>} />
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* ── hero ── */}
      <Reveal>
        <div className="sheen relative overflow-hidden rounded-3xl px-7 pt-8 pb-7 text-cream md:px-10">
          <div className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(210,180,140,0.25),transparent_65%)]" />
          <div className="pointer-events-none absolute -top-20 right-28 h-56 w-56 rounded-full border border-sand/15" />
          <div className="pointer-events-none absolute top-10 right-6 h-28 w-28 rounded-full border border-sand/10" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-sand/75 uppercase">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h1 className="mt-2 text-[34px] leading-tight font-semibold tracking-tight text-[#fbf7ef] md:text-[40px]">
                {greet}, <span className="text-sand">{me?.name.split(" ")[0]}</span>.
              </h1>
              <p className="mt-2 max-w-xl text-[14.5px] text-sand/85">Here’s what’s happening across sales, projects and cash today.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {P.leads.canEdit && <Link href="/leads?new=1" className="flex items-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-[13.5px] font-semibold text-espresso transition hover:bg-[#f5f5dc]"><UserPlus size={15} /> New lead</Link>}
                {P.quotes.canEdit && <Link href="/quotes/new" className="flex items-center gap-2 rounded-xl border border-sand/30 px-4 py-2.5 text-[13.5px] font-medium text-cream transition hover:bg-white/5"><FilePlus2 size={15} /> Quotation</Link>}
                {P.studio.canEdit && <Link href="/studio" className="flex items-center gap-2 rounded-xl border border-sand/30 px-4 py-2.5 text-[13.5px] font-medium text-cream transition hover:bg-white/5"><Sparkles size={15} /> AI Studio</Link>}
                {P.tasks.canEdit && <Link href="/tasks?new=1" className="flex items-center gap-2 rounded-xl border border-sand/30 px-4 py-2.5 text-[13.5px] font-medium text-cream transition hover:bg-white/5"><Plus size={15} /> Task</Link>}
              </div>
            </div>
            {today.length > 0 && (
              <div className={cn("grid gap-3", today.length >= 4 ? "grid-cols-2 md:grid-cols-4" : today.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                {today.map((t) => (
                  <Link key={t.label} href={t.href} className="group min-w-[130px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm transition hover:border-sand/40 hover:bg-white/10">
                    <p className={cn("tabular text-[28px] leading-none font-semibold", t.alert ? "text-[#f0c9a0]" : "text-[#fbf7ef]")}><CountUp value={t.value} /></p>
                    <p className="mt-1.5 text-[12px] text-sand/80">{t.label}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", kpis.length >= 4 ? "2xl:grid-cols-4 xl:grid-cols-4" : kpis.length === 3 ? "xl:grid-cols-3" : "")}>
          {kpis.map((k, i) => <Reveal key={i} delay={0.04 * i}>{k}</Reveal>)}
        </div>
      )}

      {/* ── trends + performance ── */}
      {(P.invoices.canView || P.projects.canView || P.leads.canView) && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Reveal className="xl:col-span-8" delay={0.05}>
            <MonthlyChart months={d.months} show={{ cash: P.invoices.canView, signed: P.projects.canView, leads: P.leads.canView }} />
          </Reveal>
          <Reveal className="xl:col-span-4" delay={0.1}>
            <Panel title="Performance" subtitle="How well the business converts and collects" className="h-full">
              <div className="space-y-5 px-5 pt-3 pb-5">
                {P.invoices.canView && <Ring value={d.collectionRate} label="Collection rate" sub={`${money(d.paidAll)} received of ${money(d.invoicedAll)} invoiced`} color={CAT[1]} />}
                {P.leads.canView && <Ring value={d.winRate} label="Win rate" sub={`${d.won} won of ${d.closed} closed leads`} color={CAT[3]} />}
                <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                  {P.projects.canView && (
                    <div>
                      <p className="text-[11.5px] text-ink-3">Average project</p>
                      <p className="tabular mt-0.5 text-[17px] font-semibold text-ink">{money(d.avgDeal)}</p>
                    </div>
                  )}
                  {P.quotes.canView && (
                    <Link href="/quotes" className="group">
                      <p className="text-[11.5px] text-ink-3">Quotes with clients</p>
                      <p className="tabular mt-0.5 text-[17px] font-semibold text-ink group-hover:text-bronze">{money(d.quotesOpenValue)}</p>
                      <p className="text-[11px] text-ink-3">{d.quotesOpen.length} awaiting answer</p>
                    </Link>
                  )}
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>
      )}

      {/* ── sales ── */}
      {P.leads.canView && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Reveal className="xl:col-span-7" delay={0.05}>
            <Panel title="Sales funnel" subtitle="How many leads reached each stage, and how many moved on" action={<PanelLink href="/leads">Open pipeline</PanelLink>} className="h-full">
              <Funnel steps={d.funnel} />
            </Panel>
          </Reveal>
          <Reveal className="xl:col-span-5" delay={0.1}>
            <Panel title="Where leads come from" subtitle="All leads by source, with wins" action={<PanelLink href="/leads?view=table">See leads</PanelLink>} className="h-full">
              <SourcesDonut sources={d.sources} />
            </Panel>
          </Reveal>
        </div>
      )}

      {/* ── delivery + money ── */}
      {(P.projects.canView || P.invoices.canView) && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {P.projects.canView && (
            <Reveal className={P.invoices.canView ? "xl:col-span-8" : "xl:col-span-12"} delay={0.05}>
              <Panel title="Project timeline" subtitle="Live projects from start to handover, filled by progress" action={<PanelLink href="/projects">All projects</PanelLink>} className="h-full">
                <ProjectTimeline projects={d.activeProjects} />
              </Panel>
            </Reveal>
          )}
          {P.invoices.canView && (
            <Reveal className={P.projects.canView ? "xl:col-span-4" : "xl:col-span-12"} delay={0.1}>
              <Panel title="Receivables" subtitle="Unpaid balance by how late it is" action={<PanelLink href="/invoices">Invoices</PanelLink>} className="h-full">
                <Aging aging={d.aging} total={d.receivable} />
                {d.topDue.length > 0 && (
                  <div className="border-t border-line px-5 pt-4 pb-5">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Chase first</p>
                    {d.topDue.map((x) => (
                      <Link key={x.inv.id} href={`/invoices/${x.inv.id}`} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-[12.5px] hover:bg-surface-2/60">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{x.client}</span>
                          <span className={cn("block", x.late > 0 ? "text-danger" : "text-ink-3")}>{x.inv.ref} · {x.late > 0 ? `${x.late} days late` : `due in ${-x.late} days`}</span>
                        </span>
                        <span className="tabular shrink-0 font-semibold text-ink">{money(x.bal)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            </Reveal>
          )}
        </div>
      )}

      {/* ── team + rhythm ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {P.leads.canView && (
          <Reveal className="xl:col-span-7" delay={0.05}>
            <Panel title="Sales team" subtitle="Ranked by won value and open pipeline" action={<PanelLink href="/team">Team</PanelLink>} className="h-full">
              <Leaderboard rows={d.team} />
            </Panel>
          </Reveal>
        )}
        <Reveal className={P.leads.canView ? "xl:col-span-5" : "xl:col-span-12"} delay={0.1}>
          <Panel title="Team activity" subtitle="Calls, meetings, site visits, notes and completed tasks" className="h-full">
            <Heatmap cells={d.heat} />
          </Panel>
        </Reveal>
      </div>

      {/* ── agenda + feed ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Reveal className="xl:col-span-5" delay={0.05}>
          <Panel title="Coming up" subtitle="Follow-ups, your tasks, handovers, invoices and quote expiries" className="h-full">
            <Agenda items={d.agenda} />
          </Panel>
        </Reveal>
        <Reveal className="xl:col-span-7" delay={0.1}>
          <Panel title="Latest activity" subtitle="Across leads, clients and projects" className="h-full">
            <div className="scroll-thin max-h-[420px] overflow-y-auto px-5 pb-4">
              {s.activities.length === 0 && <p className="py-6 text-[13px] text-ink-3">No activity yet.</p>}
              {s.activities.slice(0, 14).map((a) => {
                const who = s.members.find((m) => m.id === a.byId);
                const href = a.entity === "lead" ? `/leads/${a.entityId}` : a.entity === "project" ? `/projects/${a.entityId}` : `/clients/${a.entityId}`;
                const name =
                  a.entity === "lead" ? s.leads.find((l) => l.id === a.entityId)?.name : a.entity === "project" ? s.projects.find((p) => p.id === a.entityId)?.name : s.clients.find((c) => c.id === a.entityId)?.name;
                return (
                  <Link key={a.id} href={href} className="flex gap-3 border-b border-line py-3 last:border-0">
                    <Avatar member={who} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink">
                        <span className="font-semibold">{who?.name.split(" ")[0] ?? "System"}</span> <span className="text-ink-3">on</span> <span className="font-medium">{name ?? "—"}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">{a.text}</p>
                    </div>
                    <span className="shrink-0 text-[11.5px] text-ink-3">{timeAgo(a.at)}</span>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </Reveal>
      </div>

      {!isSupabaseConfigured && (
        <p className="flex items-center justify-center gap-1.5 pb-2 text-[11.5px] text-ink-3">
          <CheckCircle2 size={12} /> Demo mode · data is stored in this browser
        </p>
      )}
    </div>
  );
}
