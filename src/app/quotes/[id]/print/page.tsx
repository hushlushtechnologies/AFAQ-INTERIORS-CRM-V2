"use client";

import { useParams } from "next/navigation";
import { quoteRecipient, useStore } from "@/lib/store";
import { fmtDate, quoteTotals } from "@/lib/utils";
import { PrintDocument } from "@/components/print-doc";

export default function QuotePrint() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const q = s.quotes.find((x) => x.id === id);
  if (!q) return <p className="p-10">Quotation not found.</p>;
  const t = quoteTotals(q);
  const by = s.members.find((m) => m.id === q.preparedById);
  return (
    <PrintDocument
      kind="Quotation"
      number={`${q.ref}${q.version > 1 ? ` · Rev ${q.version}` : ""}`}
      meta={[
        ["Date", fmtDate(q.issueDate)],
        ["Valid until", fmtDate(q.validUntil)],
        ["Prepared by", by?.name ?? "—"],
      ]}
      to={quoteRecipient(q, s)}
      sections={q.sections}
      totals={[
        ["Subtotal", t.subtotal],
        ...(t.discount ? ([[`Discount (${q.discountPct}%)`, -t.discount]] as [string, number][]) : []),
        [`VAT (${q.vatPct}%)`, t.vat],
        ["Total (AED)", t.total, true],
      ]}
      milestones={q.milestones.map((m) => ({ label: m.label, pct: m.pct, amount: (t.total * m.pct) / 100 }))}
      notes={q.notes}
      terms={q.terms}
    />
  );
}
