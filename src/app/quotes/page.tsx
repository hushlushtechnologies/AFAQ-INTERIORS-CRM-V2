"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { quoteRecipient, useStore } from "@/lib/store";
import { QUOTE_STATUS, quoteStatusMeta } from "@/lib/constants";
import type { QuoteStatus } from "@/lib/types";
import { cn, daysFromToday, fmtDate, money, quoteTotals } from "@/lib/utils";
import { Avatar, Badge, Card, Empty, PageHeader, SearchInput, Segmented, buttonClass } from "@/components/ui";
import { usePerm } from "@/lib/perms";

export default function QuotesPage() {
  const s = useStore();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | QuoteStatus>("all");
  const [latestOnly, setLatestOnly] = React.useState(true);
  const { canEdit } = usePerm("quotes");

  const latest = new Map<string, number>();
  s.quotes.forEach((x) => latest.set(x.ref, Math.max(latest.get(x.ref) ?? 0, x.version)));

  const rows = s.quotes
    .filter((x) => !latestOnly || latest.get(x.ref) === x.version)
    .filter((x) => status === "all" || effStatus(x) === status)
    .filter((x) => {
      const t = q.toLowerCase();
      return !t || [x.ref, x.title, quoteRecipient(x, s).name].some((v) => v.toLowerCase().includes(t));
    })
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.version - a.version);

  // a sent quote past its validity date counts as expired
  const effStatus = (x: (typeof s.quotes)[number]): QuoteStatus => (x.status === "sent" && daysFromToday(x.validUntil) < 0 ? "expired" : x.status);
  const pick = (sts: QuoteStatus[]) => s.quotes.filter((x) => sts.includes(effStatus(x)) && latest.get(x.ref) === x.version);
  const plural = (n: number) => `${n} quotation${n === 1 ? "" : "s"}`;

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Quotations"
        description="Room-by-room proposals with versions, VAT and payment milestones."
        actions={canEdit ? <Link href="/quotes/new" className={buttonClass()}><Plus size={16} /> New quotation</Link> : <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          ["Drafts", ["draft"]],
          ["Awaiting client", ["sent"]],
          ["Accepted", ["accepted"]],
          ["Rejected / expired", ["rejected", "expired"]],
        ] as [string, QuoteStatus[]][]).map(([label, sts]) => {
          const list = pick(sts);
          return (
            <Card key={label} className="p-5">
              <p className="text-[12px] text-ink-3">{label}</p>
              <p className="font-display tabular mt-1 text-[22px] font-medium text-ink">{money(list.reduce((a, x) => a + quoteTotals(x).total, 0))}</p>
              <p className="mt-1 text-[11.5px] text-ink-3">{plural(list.length)}</p>
            </Card>
          );
        })}
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, ...QUOTE_STATUS.map((x) => ({ value: x.id, label: x.label }))]} />
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={latestOnly} onChange={(e) => setLatestOnly(e.target.checked)} className="h-4 w-4 accent-[#674F2D]" /> Latest versions only
          </label>
          <SearchInput value={q} onChange={setQ} placeholder="Search quotations…" className="w-72" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon={<FileText size={20} />} title="No quotations" action={canEdit ? <Link href="/quotes/new" className={buttonClass()}>Create one</Link> : undefined} />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13.5px]">
              <thead className="border-b border-line bg-surface-2/50 text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Quotation</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Issued</th>
                  <th className="px-4 py-3 text-left">Valid until</th>
                  <th className="px-4 py-3 text-left">By</th>
                  <th className="px-5 py-3 text-right">Total incl. VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((x) => {
                  const m = quoteStatusMeta(effStatus(x));
                  const r = quoteRecipient(x, s);
                  const exp = x.status === "sent" && daysFromToday(x.validUntil) < 0;
                  return (
                    <tr key={x.id} className="transition hover:bg-surface-2/40">
                      <td className="px-5 py-3.5">
                        <Link href={`/quotes/${x.id}`} className="font-semibold text-ink hover:text-bronze">{x.title}</Link>
                        <p className="text-[12px] text-ink-3">{x.ref} · v{x.version}</p>
                      </td>
                      <td className="px-4 py-3.5 text-ink-2">{r.name}{!x.clientId && <span className="ml-1.5 text-[11px] text-ink-3">(lead)</span>}</td>
                      <td className="px-4 py-3.5"><Badge className={m.tone}>{m.label}</Badge></td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-ink-2">{fmtDate(x.issueDate)}</td>
                      <td className={cn("px-4 py-3.5 whitespace-nowrap", exp ? "font-medium text-danger" : "text-ink-2")}>{fmtDate(x.validUntil)}</td>
                      <td className="px-4 py-3.5">{s.members.find((mm) => mm.id === x.preparedById) ? <Avatar member={s.members.find((mm) => mm.id === x.preparedById)} size={24} /> : <span className="text-ink-3">—</span>}</td>
                      <td className="tabular px-5 py-3.5 text-right font-semibold whitespace-nowrap text-ink">{money(quoteTotals(x).total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
