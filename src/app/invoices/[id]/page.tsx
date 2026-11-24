"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, Banknote, MessageCircle, Plus, Printer, RotateCcw, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { LineItem, Payment } from "@/lib/types";
import { INVOICE_STATUS_TONE, UNITS } from "@/lib/constants";
import { cn, dayOffset, daysFromToday, fmtDate, invoiceStatus, invoiceTotals, lineTotal, money, uid, waNumber } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, Modal, Progress, Select, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";
import { usePerm } from "@/lib/perms";


export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore();
  const inv = s.invoices.find((x) => x.id === id);
  const [payOpen, setPayOpen] = React.useState(false);
  const { confirm, node } = useConfirm();
  const { canEdit } = usePerm("invoices");
  if (!inv) return <Card><Empty title="Invoice not found" action={<Link href="/invoices" className="text-bronze underline">Back</Link>} /></Card>;

  const t = invoiceTotals(inv);
  const st = invoiceStatus(inv);
  const meta = INVOICE_STATUS_TONE[st]!;
  const readOnly = !canEdit || !!inv.cancelled;
  const locked = readOnly || inv.payments.length > 0;
  const save = (patch: Partial<typeof inv>) => s.saveInvoice({ ...inv, ...patch });
  const setItem = (iid: string, patch: Partial<LineItem>) => save({ items: inv.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) });
  const cell = "h-9 rounded-lg border border-transparent bg-transparent px-2 text-[13.5px] text-ink outline-none transition hover:border-line focus:border-bronze-2 focus:bg-surface";
  const client = s.clients.find((c) => c.id === inv.clientId);
  const datesBad = inv.dueDate < inv.issueDate;
  const canPay = !readOnly && !!client && t.total > 0 && t.balance > 0.009;
  const late = st === "overdue" ? -daysFromToday(inv.dueDate) : 0;
  const wa = waNumber(client?.phone);
  const reminder = client
    ? `Dear ${client.name}, this is a gentle reminder from ${s.settings.companyName || "Afaq Al Manzel Interiors"} that invoice ${inv.ref} (${money(t.balance, { decimals: true })}) ${late ? `was due on ${fmtDate(inv.dueDate)}` : `is due on ${fmtDate(inv.dueDate)}`}. Please quote ${inv.ref} with your payment. Thank you.`
    : "";

  return (
    <div>
      <Link href="/invoices" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Invoices</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.tone}>{meta.label}</Badge>
            <span className="text-[12.5px] text-ink-3">{inv.ref}</span>
            {!canEdit && <span className="text-[12px] text-ink-3">· view only</span>}
            {canEdit && locked && !inv.cancelled && <span className="text-[12px] text-ink-3">· line items locked once a payment is recorded</span>}
          </div>
          <textarea rows={1} value={inv.title} disabled={readOnly} placeholder="Invoice title" onChange={(e) => save({ title: e.target.value.replace(/\n/g, " ") })} className="font-display mt-2 w-full resize-none bg-transparent text-[24px] leading-tight font-medium text-ink outline-none [field-sizing:content] disabled:opacity-100 sm:text-[30px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/invoices/${inv.id}/print`} target="_blank" className="flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink hover:border-bronze-2"><Printer size={15} /> PDF</Link>
          {canEdit && !inv.cancelled && wa && t.balance > 0.009 && t.total > 0 && (
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink hover:border-bronze-2">
              <MessageCircle size={15} /> Reminder
            </a>
          )}
          {canPay && <Button onClick={() => setPayOpen(true)}><Banknote size={15} /> Record payment</Button>}
        </div>
      </div>

      {inv.cancelled && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-2.5 text-[13px] text-ink-2">
          <span>This invoice is cancelled and left out of all totals.</span>
          {canEdit && <button onClick={() => { save({ cancelled: false }); toast("Invoice restored"); }} className="flex items-center gap-1.5 font-medium text-bronze hover:underline"><RotateCcw size={13} /> Restore invoice</button>}
        </div>
      )}
      {!inv.cancelled && !client && canEdit && <p className="mb-5 rounded-xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning">Choose the client below — the invoice is saved once it has one.</p>}
      {!inv.cancelled && t.total <= 0 && client && canEdit && <p className="mb-5 rounded-xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning">Add line items with an amount before recording payments.</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Client" className="md:col-span-2">
                <Select disabled={locked} value={inv.clientId} onChange={(e) => save({ clientId: e.target.value, projectId: undefined })}>
                  {!client && <option value="">— Select client —</option>}
                  {s.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Issue date"><Input type="date" disabled={locked} value={inv.issueDate} onChange={(e) => e.target.value && save({ issueDate: e.target.value })} /></Field>
              <Field label="Due date" hint={datesBad ? "Due date is before the issue date" : undefined}><Input type="date" disabled={readOnly} min={inv.issueDate} value={inv.dueDate} onChange={(e) => e.target.value && save({ dueDate: e.target.value })} className={datesBad ? "border-danger" : undefined} /></Field>
              <Field label="Project" className="md:col-span-2">
                <Select disabled={locked} value={inv.projectId ?? ""} onChange={(e) => save({ projectId: e.target.value || undefined })}>
                  <option value="">— None —</option>
                  {s.projects.filter((p) => p.clientId === inv.clientId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="VAT %"><Input type="number" min={0} max={100} step={0.5} disabled={locked} value={inv.vatPct} onChange={(e) => save({ vatPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} /></Field>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Line items" />
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                  <tr>
                    <th className="px-4 pb-1 text-left">Description</th>
                    <th className="w-20 px-2 pb-1 text-right">Qty</th>
                    <th className="w-24 px-2 pb-1 text-left">Unit</th>
                    <th className="w-36 px-2 pb-1 text-right">Rate</th>
                    <th className="w-36 px-4 pb-1 text-right">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((it) => (
                    <tr key={it.id} className="group">
                      <td className="px-3 py-1"><input disabled={locked} value={it.description} placeholder="Description" onChange={(e) => setItem(it.id, { description: e.target.value })} className={cn(cell, "w-full")} /></td>
                      <td className="px-1 py-1"><input disabled={locked} type="number" min={0} step="any" value={it.qty} onChange={(e) => setItem(it.id, { qty: Math.max(0, Number(e.target.value) || 0) })} className={cn(cell, "tabular w-full text-right")} /></td>
                      <td className="px-1 py-1"><select disabled={locked} value={it.unit} onChange={(e) => setItem(it.id, { unit: e.target.value })} className={cn(cell, "w-full")}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></td>
                      <td className="px-1 py-1"><input disabled={locked} type="number" step="any" title="Use a negative rate for a discount line" value={it.rate} onChange={(e) => setItem(it.id, { rate: Number(e.target.value) || 0 })} className={cn(cell, "tabular w-full text-right")} /></td>
                      <td className="tabular px-4 py-1 text-right text-[13.5px] font-medium whitespace-nowrap">{money(lineTotal(it), { decimals: true })}</td>
                      <td>{!locked && inv.items.length > 1 && <button onClick={() => save({ items: inv.items.filter((x) => x.id !== it.id) })} className="rounded-md p-1 text-ink-3 group-hover:opacity-100 hover:text-danger focus:opacity-100 [@media(hover:hover)]:opacity-0" aria-label="Remove line"><X size={14} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!locked && <button onClick={() => save({ items: [...inv.items, { id: uid("li"), description: "", qty: 1, unit: "lot", rate: 0 }] })} className="mx-4 my-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-bronze hover:bg-cream/40"><Plus size={14} /> Add line</button>}
          </Card>

          <Card>
            <CardHeader title="Payments" subtitle={inv.payments.length ? `${inv.payments.length} recorded · ${money(t.paid)}` : "None recorded"} action={canPay ? <Button size="sm" variant="outline" onClick={() => setPayOpen(true)}><Plus size={14} /> Payment</Button> : undefined} />
            <div className="px-2 pb-3">
              {inv.payments.length === 0 && <p className="px-3 py-3 text-[13px] text-ink-3">No payments yet.</p>}
              {inv.payments.map((p) => (
                <div key={p.id} className="group flex items-center gap-4 rounded-xl px-3 py-2.5 hover:bg-surface-2/60">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success"><Banknote size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{p.method}{p.reference ? ` · ${p.reference}` : ""}</p>
                    <p className="text-[12px] text-ink-3">{fmtDate(p.date)}</p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] font-semibold whitespace-nowrap text-success">{money(p.amount, { decimals: true })}</span>
                  {!readOnly && <button onClick={() => confirm("Remove payment?", `${money(p.amount)} on ${fmtDate(p.date)} will be removed.`, () => s.removePayment(inv.id, p.id))} className="rounded-md p-1 text-ink-3 group-hover:opacity-100 hover:text-danger focus:opacity-100 [@media(hover:hover)]:opacity-0" aria-label="Remove payment"><Trash2 size={14} /></button>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-0 xl:self-start">
          <Card className="overflow-hidden">
            <div className="sheen px-5 py-5">
              <p className="text-[12px] text-sand/75">Balance due</p>
              <p className="font-display tabular mt-1 text-[32px] font-medium text-[#fbf7ef]">{money(Math.max(0, t.balance), { decimals: true })}</p>
              <Progress value={t.total ? (t.paid / t.total) * 100 : 0} className="mt-3 bg-white/10" tone="bg-sand" />
              <p className="mt-2 text-[12px] text-sand/70">{t.total ? Math.round((t.paid / t.total) * 100) : 0}% paid · {late ? <span className="font-medium text-[#f0a79a]">{late} day{late === 1 ? "" : "s"} overdue</span> : `due ${fmtDate(inv.dueDate)}`}</p>
            </div>
            <dl className="space-y-2.5 px-5 py-5 text-[13.5px]">
              <div className="flex justify-between"><dt className="text-ink-3">Subtotal</dt><dd className="tabular">{money(t.subtotal, { decimals: true })}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-3">VAT ({inv.vatPct}%)</dt><dd className="tabular">{money(t.vat, { decimals: true })}</dd></div>
              <div className="flex justify-between border-t border-line pt-2.5 font-semibold"><dt>Total</dt><dd className="tabular">{money(t.total, { decimals: true })}</dd></div>
              <div className="flex justify-between text-success"><dt>Received</dt><dd className="tabular">− {money(t.paid, { decimals: true })}</dd></div>
            </dl>
          </Card>
          <Card className="space-y-2 p-5 text-[13px]">
            {client && <Link href={`/clients/${client.id}`} className="block font-medium text-bronze hover:underline">{client.name} →</Link>}
            {inv.projectId && <Link href={`/projects/${inv.projectId}`} className="block font-medium text-bronze hover:underline">Open project →</Link>}
            {inv.quoteId && <Link href={`/quotes/${inv.quoteId}`} className="block font-medium text-bronze hover:underline">Source quotation →</Link>}
            <div className="flex flex-wrap gap-4 pt-3">
              {!readOnly && inv.payments.length > 0 && <p className="w-full text-[11.5px] text-ink-3">To cancel, remove its payments first.</p>}
              {!readOnly && inv.payments.length === 0 && (
                <button onClick={() => confirm("Cancel invoice?", "The invoice stays on record as cancelled and is excluded from totals.", () => { save({ cancelled: true }); toast("Invoice cancelled"); })} className="flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-danger"><Ban size={13} /> Cancel invoice</button>
              )}
              {canEdit && inv.payments.length === 0 && (
                <button onClick={() => confirm("Delete invoice?", "This invoice will be permanently removed.", () => { s.deleteInvoice(inv.id); router.push("/invoices"); })} className="flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-danger"><Trash2 size={13} /> Delete</button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} balance={t.balance} onSave={(p) => { s.addPayment(inv.id, p); toast("Payment recorded"); }} />
      {node}
    </div>
  );
}

function PaymentModal({ open, onClose, balance, onSave }: { open: boolean; onClose: () => void; balance: number; onSave: (p: Omit<Payment, "id">) => void }) {
  const [p, setP] = React.useState<Omit<Payment, "id">>({ date: dayOffset(0), amount: balance, method: "Bank Transfer", reference: "" });
  React.useEffect(() => {
    if (open) setP({ date: dayOffset(0), amount: Math.round(balance * 100) / 100, method: "Bank Transfer", reference: "" });
  }, [open, balance]);
  const over = p.amount > balance + 0.01;
  const future = p.date > dayOffset(0);
  const valid = p.amount > 0 && !over && !!p.date;
  const submit = () => { if (!valid) return; onSave({ ...p, amount: Math.round(p.amount * 100) / 100, reference: p.reference?.trim() || undefined }); onClose(); };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      subtitle={`Balance ${money(balance, { decimals: true })}`}
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={submit}>Save payment</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (AED)" className="col-span-2">
          <Input autoFocus type="number" min={0} step="0.01" inputMode="decimal" value={p.amount || ""} onChange={(e) => setP({ ...p, amount: Math.max(0, Number(e.target.value) || 0) })} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <span className="mt-1.5 flex gap-2">
            {[["Full balance", balance], ["50%", balance / 2]].map(([l, v]) => (
              <button key={l as string} type="button" onClick={() => setP({ ...p, amount: Math.round((v as number) * 100) / 100 })} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-ink-2 hover:bg-cream/60">{l as string}</button>
            ))}
          </span>
        </Field>
        <Field label="Date"><Input type="date" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} /></Field>
        <Field label="Method">
          <Select value={p.method} onChange={(e) => setP({ ...p, method: e.target.value as Payment["method"] })}>
            <option>Bank Transfer</option><option>Cheque</option><option>Card</option><option>Cash</option>
          </Select>
        </Field>
        <Field label="Reference" className="col-span-2"><Input value={p.reference} onChange={(e) => setP({ ...p, reference: e.target.value })} placeholder="Transfer ref / cheque no." /></Field>
      </div>
      {over && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger">Amount is more than the balance due.</p>}
      {future && <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-[12.5px] text-warning">This date is in the future — fine for a post-dated cheque.</p>}
    </Modal>
  );
}
