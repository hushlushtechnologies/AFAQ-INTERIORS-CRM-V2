"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmtDate, invoiceTotals } from "@/lib/utils";
import { PrintDocument } from "@/components/print-doc";
import { DEFAULT_INVOICE_NOTES } from "@/lib/constants";

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const inv = s.invoices.find((x) => x.id === id);
  if (!inv) return <p className="p-10">Invoice not found.</p>;
  const c = s.clients.find((x) => x.id === inv.clientId);
  const p = s.projects.find((x) => x.id === inv.projectId);
  const t = invoiceTotals(inv);
  return (
    <PrintDocument
      kind="Tax Invoice"
      number={inv.ref + (inv.cancelled ? " (CANCELLED)" : "")}
      meta={[
        ["Invoice date", fmtDate(inv.issueDate)],
        ["Due date", fmtDate(inv.dueDate)],
        ...(p ? ([["Project", p.ref]] as [string, string][]) : []),
      ]}
      to={{ name: c?.name ?? "—", company: c?.company, address: [c?.address, c?.city].filter(Boolean).join(", "), email: c?.email, phone: c?.phone }}
      sections={[{ room: inv.title, items: inv.items }]}
      totals={[
        ["Subtotal", t.subtotal],
        [`VAT (${inv.vatPct}%)`, t.vat],
        ["Total (AED)", t.total],
        ...(t.paid ? ([["Less: received", -t.paid]] as [string, number][]) : []),
        ["Balance due (AED)", t.balance, true],
      ]}
      payments={inv.payments.map((x) => ({ date: x.date, method: x.method, amount: x.amount }))}
      terms={s.settings.invoiceNotes?.trim() || DEFAULT_INVOICE_NOTES}
    />
  );
}
