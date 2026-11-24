"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { useStore } from "@/lib/store";
import { INVOICE_STATUS_TONE } from "@/lib/constants";
import { cn, daysFromToday, fmtDate, invoiceStatus, invoiceTotals, money, type InvoiceStatus } from "@/lib/utils";
import { Badge, Button, Card, Empty, PageHeader, SearchInput, Segmented } from "@/components/ui";
import { permFor, usePerm } from "@/lib/perms";

export default function InvoicesPage() {
  return (
    <React.Suspense>
      <Inner />
    </React.Suspense>
  );
}

function Inner() {
  const s = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | InvoiceStatus>("all");
  const created = React.useRef(false);
  const { canEdit } = usePerm("invoices");

  React.useEffect(() => {
    if (params.get("new") === "1" && !created.current && permFor(s, "invoices").access === "edit") {
      created.current = true;
      const clientId = params.get("client") ?? undefined;
      const projectId = params.get("project") ?? undefined;
      const project = s.projects.find((p) => p.id === projectId);
      // no silent default client: the user picks one on the invoice
      const id = s.newInvoice({ clientId: clientId ?? project?.clientId ?? "", projectId, title: project ? `${project.name} — Progress invoice` : "New invoice" });
      router.replace(`/invoices/${id}`);
    }
  }, [params, router, s]);

  const rows = s.invoices
    .filter((i) => status === "all" || invoiceStatus(i) === status)
    .filter((i) => {
      const t = q.trim().toLowerCase();
      const c = s.clients.find((x) => x.id === i.clientId);
      return !t || [i.ref, i.title, c?.name].some((v) => v?.toLowerCase().includes(t));
    })
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  const live = s.invoices.filter((i) => !i.cancelled);
  const countOf = (k: "all" | InvoiceStatus) => (k === "all" ? s.invoices.length : s.invoices.filter((i) => invoiceStatus(i) === k).length);
  const totals = live.reduce(
    (a, i) => {
      const t = invoiceTotals(i);
      const st = invoiceStatus(i);
      return { invoiced: a.invoiced + t.total, paid: a.paid + t.paid, open: a.open + Math.max(0, t.balance), overdue: a.overdue + (st === "overdue" ? t.balance : 0), vat: a.vat + t.vat };
    },
    { invoiced: 0, paid: 0, open: 0, overdue: 0, vat: 0 },
  );

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Invoices & Payments"
        description="Tax invoices, receipts and receivables in AED."
        actions={canEdit ? <Button onClick={() => router.push("/invoices?new=1")}><Plus size={16} /> New invoice</Button> : <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Total invoiced", totals.invoiced, `incl. ${money(totals.vat)} VAT`],
          ["Received", totals.paid, `${totals.invoiced ? Math.round((totals.paid / totals.invoiced) * 100) : 0}% collected`],
          ["Outstanding", totals.open, `${live.filter((i) => ["unpaid", "partial", "overdue"].includes(invoiceStatus(i))).length} open invoices`],
          ["Overdue", totals.overdue, totals.overdue ? "Needs chasing" : "All on time"],
        ].map(([label, v, sub], i) => (
          <Card key={label as string} className={cn("p-5", i === 3 && (v as number) > 0 && "border-danger/30 bg-danger-soft/40")}>
            <p className="text-[12px] text-ink-3">{label as string}</p>
            <p className={cn("font-display tabular mt-1 text-[22px] font-medium", i === 3 && (v as number) > 0 ? "text-danger" : "text-ink")}>{money(v as number)}</p>
            <p className="mt-1 text-[11.5px] text-ink-3">{sub as string}</p>
          </Card>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scroll-thin -mx-1 overflow-x-auto px-1">
        <Segmented
          value={status}
          onChange={setStatus}
          options={(
            [
              ["all", "All"],
              ["unpaid", "Unpaid"],
              ["partial", "Part-paid"],
              ["overdue", "Overdue"],
              ["paid", "Paid"],
              ["cancelled", "Cancelled"],
            ] as ["all" | InvoiceStatus, string][]
          ).map(([value, label]) => ({
            value,
            label: (
              <>
                {label}
                <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", value === "overdue" && countOf(value) ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-3")}>{countOf(value)}</span>
              </>
            ),
          }))}
        />
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search invoice no., client…" className="lg:w-80" />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty
            icon={<Receipt size={20} />}
            title={s.invoices.length ? "No invoices match" : "No invoices yet"}
            text={s.invoices.length ? "Try another status or search." : "Raise one from an accepted quotation’s milestones, or create one here."}
            action={s.invoices.length ? <Button variant="outline" onClick={() => { setQ(""); setStatus("all"); }}>Show all</Button> : undefined}
          />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13.5px]">
              <thead className="border-b border-line bg-surface-2/50 text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((i) => {
                  const t = invoiceTotals(i);
                  const st = invoiceStatus(i);
                  const meta = INVOICE_STATUS_TONE[st]!;
                  const c = s.clients.find((x) => x.id === i.clientId);
                  const due = daysFromToday(i.dueDate);
                  return (
                    <tr key={i.id} onClick={() => router.push(`/invoices/${i.id}`)} className={cn("cursor-pointer transition hover:bg-surface-2/40", i.cancelled && "opacity-60")}>
                      <td className="px-5 py-3.5">
                        <Link href={`/invoices/${i.id}`} className="font-semibold text-ink hover:text-bronze">{i.ref}</Link>
                        <p className="max-w-[320px] truncate text-[12px] text-ink-3">{i.title}</p>
                      </td>
                      <td className="px-4 py-3.5 text-ink-2">{c?.name ?? <span className="text-warning">No client</span>}</td>
                      <td className="px-4 py-3.5"><Badge className={meta.tone}>{meta.label}</Badge></td>
                      <td className={cn("px-4 py-3.5 whitespace-nowrap", st === "overdue" ? "font-medium text-danger" : "text-ink-2")}>
                        {fmtDate(i.dueDate)}
                        {st === "overdue" && <span className="block text-[11.5px]">{-due} day{due === -1 ? "" : "s"} late</span>}
                      </td>
                      <td className="tabular px-4 py-3.5 text-right whitespace-nowrap text-ink-2">{money(t.total)}</td>
                      <td className="tabular px-4 py-3.5 text-right whitespace-nowrap text-success">{t.paid ? money(t.paid) : "—"}</td>
                      <td className="tabular px-5 py-3.5 text-right font-semibold whitespace-nowrap text-ink">{i.cancelled ? "—" : t.balance > 0 ? money(t.balance) : "—"}</td>
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
