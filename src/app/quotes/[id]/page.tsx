"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, GripVertical, Lock, Plus, Printer, Receipt, Send, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { quoteRecipient, useStore } from "@/lib/store";
import type { LineItem, Quote, QuoteSection } from "@/lib/types";
import { quoteStatusMeta, ROOMS, UNITS } from "@/lib/constants";
import { cn, daysFromToday, fmtDate, lineTotal, money, quoteTotals, sectionTotal, uid } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, Modal, Select, Textarea, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";
import { usePerm } from "@/lib/perms";

export default function QuoteBuilder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useStore();
  const q = s.quotes.find((x) => x.id === id);
  const [invOpen, setInvOpen] = React.useState(false);
  const { confirm, node } = useConfirm();
  const { canEdit } = usePerm("quotes");
  const invP = usePerm("invoices");

  if (!q) return <Card><Empty title="Quotation not found" action={<Link href="/quotes" className="text-bronze underline">Back</Link>} /></Card>;

  const locked = q.status !== "draft" || !canEdit;
  const pastValidity = q.status === "sent" && daysFromToday(q.validUntil) < 0;
  const datesBad = q.validUntil < q.issueDate;
  const emptyItems = q.sections.reduce((a, sec) => a + sec.items.filter((i) => !i.description.trim()).length, 0);
  const lead = q.leadId ? s.leads.find((l) => l.id === q.leadId) : undefined;
  const nonNeg = (v: string) => Math.max(0, Number(v) || 0);

  const markSent = () => {
    if (!q.clientId && !q.leadId) return toast("Choose a client or lead first");
    if (t.subtotal <= 0) return toast("Add at least one priced item before sending");
    if (msTotal !== 100) return toast(`Payment milestones add up to ${msTotal}% — make them 100% first`);
    if (datesBad) return toast("“Valid until” is before the issue date");
    const go = () => { s.setQuoteStatus(q.id, "sent"); toast("Marked as sent"); };
    if (emptyItems) return confirm("Send with blank items?", `${emptyItems} line item${emptyItems === 1 ? " has" : "s have"} no description. They will print as “—”.`, go);
    go();
  };
  const t = quoteTotals(q);
  const recipient = quoteRecipient(q, s);
  const meta = quoteStatusMeta(q.status);
  const versions = s.quotes.filter((x) => x.ref === q.ref).sort((a, b) => b.version - a.version);
  const msTotal = q.milestones.reduce((a, m) => a + (Number(m.pct) || 0), 0);

  const save = (patch: Partial<Quote>) => s.saveQuote({ ...q, ...patch });
  const setSection = (sid: string, patch: Partial<QuoteSection>) => save({ sections: q.sections.map((x) => (x.id === sid ? { ...x, ...patch } : x)) });
  const setItem = (sid: string, iid: string, patch: Partial<LineItem>) =>
    save({ sections: q.sections.map((x) => (x.id === sid ? { ...x, items: x.items.map((i) => (i.id === iid ? { ...i, ...patch } : i)) } : x)) });

  const cell = "h-9 rounded-lg border border-transparent bg-transparent px-2 text-[13.5px] text-ink outline-none transition hover:border-line focus:border-bronze-2 focus:bg-surface disabled:hover:border-transparent";

  return (
    <div>
      <Link href="/quotes" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Quotations</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.tone}>{meta.label}</Badge>
            <span className="text-[12.5px] text-ink-3">{q.ref}</span>
            {versions.length > 1 ? (
              <select value={q.id} onChange={(e) => router.push(`/quotes/${e.target.value}`)} className="cursor-pointer rounded-lg bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-2 outline-none">
                {versions.map((v) => <option key={v.id} value={v.id}>Version {v.version} · {quoteStatusMeta(v.status).label}</option>)}
              </select>
            ) : (
              <span className="text-[12.5px] text-ink-3">· Version {q.version}</span>
            )}
            {locked && <span className="flex items-center gap-1 text-[12px] text-ink-3"><Lock size={12} /> {canEdit ? "Locked — create a revision to change" : "View only"}</span>}
          </div>
          <textarea
            rows={1}
            value={q.title}
            disabled={locked}
            placeholder="Quotation title"
            onChange={(e) => save({ title: e.target.value.replace(/\n/g, " ") })}
            className="font-display mt-2 w-full resize-none bg-transparent text-[24px] leading-tight font-medium text-ink outline-none [field-sizing:content] disabled:opacity-100 sm:text-[30px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/quotes/${q.id}/print`} target="_blank" className="flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink hover:border-bronze-2"><Printer size={15} /> PDF</Link>
          {canEdit && q.status === "draft" && (
            <Button onClick={markSent}><Send size={15} /> Mark as sent</Button>
          )}
          {canEdit && q.status === "sent" && (
            <>
              <Button variant="outline" onClick={() => { s.setQuoteStatus(q.id, "rejected"); toast("Marked rejected"); }}><ThumbsDown size={15} /> Rejected</Button>
              <Button onClick={() => { s.setQuoteStatus(q.id, "accepted"); toast("Accepted 🎉"); }}><ThumbsUp size={15} /> Accepted</Button>
            </>
          )}
          {canEdit && q.status !== "draft" && (
            <Button variant="outline" onClick={() => { const nid = s.reviseQuote(q.id); toast(`Version ${q.version + 1} created`); router.push(`/quotes/${nid}`); }}><Copy size={15} /> Revise</Button>
          )}
          {invP.canEdit && q.status === "accepted" && (
            <Button variant="dark" disabled={!q.clientId} title={!q.clientId ? "Convert the lead to a client first" : undefined} onClick={() => setInvOpen(true)}><Receipt size={15} /> Invoice milestone</Button>
          )}
        </div>
      </div>

      {(pastValidity || (q.status === "accepted" && !q.clientId) || (!q.clientId && !q.leadId && !locked)) && (
        <div className="mb-5 space-y-2">
          {!q.clientId && !q.leadId && !locked && <p className="rounded-xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning">Pick a client or lead below — the quotation is saved once it has one.</p>}
          {pastValidity && <p className="rounded-xl bg-warning-soft px-4 py-2.5 text-[13px] text-warning">This quotation passed its validity date on {fmtDate(q.validUntil)}. Revise it to send updated dates.</p>}
          {q.status === "accepted" && !q.clientId && (
            <p className="rounded-xl bg-info-soft px-4 py-2.5 text-[13px] text-info">
              Accepted — mark the lead as Won to convert it to a client, then you can raise milestone invoices.{" "}
              {lead && <Link href={`/leads/${lead.id}`} className="font-semibold underline">Open lead</Link>}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Field label="Client" className="md:col-span-2">
                <Select
                  disabled={locked}
                  value={q.clientId ? `c:${q.clientId}` : q.leadId ? `l:${q.leadId}` : ""}
                  onChange={(e) => {
                    const [k, v] = e.target.value.split(":");
                    if (!k) return save({ clientId: undefined, leadId: undefined, projectId: undefined });
                    const next = k === "c" ? { clientId: v, leadId: s.leads.find((l) => l.clientId === v)?.id } : { leadId: v, clientId: s.leads.find((l) => l.id === v)?.clientId };
                    const proj = q.projectId ? s.projects.find((p) => p.id === q.projectId) : undefined;
                    save({ ...next, projectId: proj && proj.clientId === next.clientId ? proj.id : undefined });
                  }}
                >
                  <option value="">— Select —</option>
                  <optgroup label="Clients">{s.clients.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}</optgroup>
                  <optgroup label="Open leads">{s.leads.filter((l) => !l.clientId && !["lost"].includes(l.stage)).map((l) => <option key={l.id} value={`l:${l.id}`}>{l.name} ({l.ref})</option>)}</optgroup>
                </Select>
              </Field>
              <Field label="Issue date"><Input type="date" disabled={locked} value={q.issueDate} onChange={(e) => save({ issueDate: e.target.value })} /></Field>
              <Field label="Valid until"><Input type="date" disabled={locked} min={q.issueDate} value={q.validUntil} onChange={(e) => save({ validUntil: e.target.value })} className={datesBad ? "border-danger" : undefined} /></Field>
              <Field label="Linked project" className="md:col-span-2">
                <Select disabled={locked} value={q.projectId ?? ""} onChange={(e) => save({ projectId: e.target.value || undefined })}>
                  <option value="">— None —</option>
                  {s.projects.filter((p) => !q.clientId || p.clientId === q.clientId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Prepared by" className="md:col-span-2">
                <Select disabled={locked} value={q.preparedById} onChange={(e) => save({ preparedById: e.target.value })}>
                  {!s.members.some((m) => m.id === q.preparedById) && <option value="">— Select —</option>}
                  {s.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          {q.sections.map((sec) => (
            <Card key={sec.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line bg-surface-2/40 px-4 py-3">
                <GripVertical size={16} className="text-ink-3" />
                <input
                  list="rooms"
                  disabled={locked}
                  value={sec.room}
                  onChange={(e) => setSection(sec.id, { room: e.target.value })}
                  className="font-display min-w-0 flex-1 bg-transparent text-[18px] font-medium text-ink outline-none"
                />
                <span className="tabular shrink-0 text-[14px] font-semibold whitespace-nowrap text-ink">{money(sectionTotal(sec.items))}</span>
                {!locked && (
                  <button onClick={() => confirm("Remove section?", `“${sec.room}” and its ${sec.items.length} items will be removed.`, () => save({ sections: q.sections.filter((x) => x.id !== sec.id) }))} className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label="Remove section">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                    <tr>
                      <th className="w-10 px-3 pt-3 pb-1 text-left">#</th>
                      <th className="px-2 pt-3 pb-1 text-left">Description</th>
                      <th className="w-20 px-2 pt-3 pb-1 text-right">Qty</th>
                      <th className="w-24 px-2 pt-3 pb-1 text-left">Unit</th>
                      <th className="w-28 px-2 pt-3 pb-1 text-right">Rate (AED)</th>
                      <th className="w-32 px-3 pt-3 pb-1 text-right">Amount</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it, idx) => (
                      <tr key={it.id} className="group">
                        <td className="px-3 py-1 text-[12.5px] text-ink-3">{idx + 1}</td>
                        <td className="px-1 py-1">
                          {locked ? (
                            <p className="px-2 py-1.5 text-[13.5px] leading-snug text-ink">{it.description || "—"}</p>
                          ) : (
                            <input value={it.description} placeholder="Item description" onChange={(e) => setItem(sec.id, it.id, { description: e.target.value })} className={cn(cell, "w-full")} />
                          )}
                        </td>
                        <td className="px-1 py-1"><input disabled={locked} type="number" min={0} value={it.qty} step="any" onChange={(e) => setItem(sec.id, it.id, { qty: nonNeg(e.target.value) })} className={cn(cell, "tabular w-full text-right")} /></td>
                        <td className="px-1 py-1">
                          <select disabled={locked} value={it.unit} onChange={(e) => setItem(sec.id, it.id, { unit: e.target.value })} className={cn(cell, "w-full cursor-pointer")}>
                            {UNITS.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1"><input disabled={locked} type="number" min={0} value={it.rate} step="any" onChange={(e) => setItem(sec.id, it.id, { rate: nonNeg(e.target.value) })} className={cn(cell, "tabular w-full text-right")} /></td>
                        <td className="tabular px-3 py-1 text-right text-[13.5px] font-medium whitespace-nowrap text-ink">{money(lineTotal(it))}</td>
                        <td className="pr-2">
                          {!locked && (
                            <button onClick={() => setSection(sec.id, { items: sec.items.filter((x) => x.id !== it.id) })} className="rounded-md p-1 text-ink-3 transition group-hover:opacity-100 hover:text-danger focus:opacity-100 [@media(hover:hover)]:opacity-0" aria-label="Remove item">
                              <X size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!locked && (
                <button onClick={() => setSection(sec.id, { items: [...sec.items, { id: uid("i"), description: "", qty: 1, unit: "nos", rate: 0 }] })} className="mx-4 mb-3 mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-medium text-bronze hover:bg-cream/40">
                  <Plus size={14} /> Add item
                </button>
              )}
            </Card>
          ))}
          <datalist id="rooms">{ROOMS.map((r) => <option key={r} value={r} />)}</datalist>

          {!locked && (
            <button
              onClick={() => save({ sections: [...q.sections, { id: uid("s"), room: ROOMS.find((r) => !q.sections.some((x) => x.room === r)) ?? "New area", items: [{ id: uid("i"), description: "", qty: 1, unit: "nos", rate: 0 }] }] })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-5 text-[14px] font-medium text-ink-2 transition hover:border-bronze-2 hover:bg-cream/20 hover:text-bronze"
            >
              <Plus size={16} /> Add room / section
            </button>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="Notes to client" />
              <div className="px-5 pb-5"><Textarea disabled={locked} value={q.notes} onChange={(e) => save({ notes: e.target.value })} className="min-h-[140px]" placeholder="Scope assumptions, exclusions, what changed in this version…" /></div>
            </Card>
            <Card>
              <CardHeader title="Terms & conditions" />
              <div className="px-5 pb-5"><Textarea disabled={locked} value={q.terms} onChange={(e) => save({ terms: e.target.value })} className="min-h-[140px] text-[13px]" /></div>
            </Card>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-0 xl:self-start">
          <Card className="overflow-hidden">
            <div className="sheen px-5 py-5 text-cream">
              <p className="text-[12px] text-sand/75">Total incl. VAT</p>
              <p className="font-display tabular mt-1 text-[32px] font-medium text-[#fbf7ef]">{money(t.total, { decimals: true })}</p>
              <p className="mt-1 text-[12px] text-sand/70">for {recipient.name}</p>
            </div>
            <dl className="space-y-2.5 px-5 py-5 text-[13.5px]">
              <div className="flex justify-between"><dt className="text-ink-3">Subtotal</dt><dd className="tabular font-medium">{money(t.subtotal, { decimals: true })}</dd></div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-3">Discount
                  <input disabled={locked} type="number" min={0} max={100} step={0.5} value={q.discountPct} onChange={(e) => save({ discountPct: Math.min(100, Math.max(0, Number(e.target.value))) })} className="tabular h-7 w-16 rounded-md border border-line bg-surface px-2 text-right text-[12.5px] outline-none focus:border-bronze-2" />%
                </dt>
                <dd className="tabular font-medium text-danger">− {money(t.discount, { decimals: true })}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5"><dt className="text-ink-3">Taxable amount</dt><dd className="tabular font-medium">{money(t.taxable, { decimals: true })}</dd></div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-3">VAT
                  <input disabled={locked} type="number" min={0} max={100} step={0.5} value={q.vatPct} onChange={(e) => save({ vatPct: Math.max(0, Number(e.target.value)) })} className="tabular h-7 w-16 rounded-md border border-line bg-surface px-2 text-right text-[12.5px] outline-none focus:border-bronze-2" />%
                </dt>
                <dd className="tabular font-medium">{money(t.vat, { decimals: true })}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-[15px]"><dt className="font-semibold">Total</dt><dd className="tabular font-semibold text-bronze">{money(t.total, { decimals: true })}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Payment milestones" subtitle={msTotal === 100 ? "Adds up to 100% · amounts incl. VAT" : `Adds up to ${msTotal}% — should be 100%`} />
            <div className="space-y-2 px-5 pb-5">
              {q.milestones.map((m) => (
                <div key={m.id} className="rounded-xl border border-line bg-surface px-2.5 py-2">
                  <div className="flex items-start gap-1">
                    {locked ? (
                      <p className="min-w-0 flex-1 px-2 py-1 text-[13px] leading-snug text-ink">{m.label}</p>
                    ) : (
                      <textarea rows={1} value={m.label} onChange={(e) => save({ milestones: q.milestones.map((x) => (x.id === m.id ? { ...x, label: e.target.value.replace(/\n/g, " ") } : x)) })} className={cn(cell, "h-auto min-h-8 min-w-0 flex-1 resize-none py-1 leading-snug [field-sizing:content]")} />
                    )}
                    {!locked && <button onClick={() => save({ milestones: q.milestones.filter((x) => x.id !== m.id) })} className="mt-1 rounded-md p-1 text-ink-3 hover:text-danger" aria-label="Remove milestone"><X size={14} /></button>}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 px-1">
                    <input disabled={locked} type="number" min={0} max={100} value={m.pct} onChange={(e) => save({ milestones: q.milestones.map((x) => (x.id === m.id ? { ...x, pct: Math.min(100, nonNeg(e.target.value)) } : x)) })} className={cn(cell, "tabular h-8 w-16 border-line text-right")} />
                    <span className="text-[12px] text-ink-3">%</span>
                    <span className="tabular ml-auto text-[13px] font-medium text-ink-2">{money((t.total * m.pct) / 100)}</span>
                  </div>
                </div>
              ))}
              {!locked && <button onClick={() => save({ milestones: [...q.milestones, { id: uid("m"), label: "New milestone", pct: 0 }] })} className="flex items-center gap-1.5 pt-1 text-[12.5px] font-medium text-bronze hover:underline"><Plus size={13} /> Add milestone</button>}
              {msTotal !== 100 && <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning">Milestones total {msTotal}%.</p>}
            </div>
          </Card>

          <Card className="p-5 text-[13px]">
            <p className="text-ink-3">Issued {fmtDate(q.issueDate)} · valid until {fmtDate(q.validUntil)}</p>
            {q.leadId && <Link href={`/leads/${q.leadId}`} className="mt-2 block font-medium text-bronze hover:underline">Open lead →</Link>}
            {q.clientId && <Link href={`/clients/${q.clientId}`} className="mt-1 block font-medium text-bronze hover:underline">Open client →</Link>}
            {canEdit && q.status === "draft" && (
              <button onClick={() => confirm("Delete draft?", "This draft quotation will be permanently removed.", () => { s.deleteQuote(q.id); router.push("/quotes"); })} className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-danger">
                <Trash2 size={13} /> Delete draft
              </button>
            )}
          </Card>
        </div>
      </div>

      <Modal open={invOpen} onClose={() => setInvOpen(false)} title="Invoice a milestone" subtitle={`${q.ref} v${q.version} · ${money(t.taxable)} excl. VAT`} width={500}>
        <div className="space-y-2">
          {q.milestones.map((m) => {
            const existing = s.invoices.find((i) => i.quoteId === q.id && i.items.some((it) => it.description.startsWith(`${m.label} — ${m.pct}%`)));
            const create = () => { const iid = s.invoiceFromQuote(q.id, m.id); setInvOpen(false); toast("Invoice created"); router.push(`/invoices/${iid}`); };
            return (
              <button
                key={m.id}
                onClick={() => (existing ? confirm("Invoice this milestone again?", `${existing.ref} already bills “${m.label}”. Create another invoice anyway?`, create) : create())}
                className={cn("flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-bronze-2 hover:bg-cream/20", existing ? "border-line bg-surface-2/50" : "border-line")}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-ink">{m.label}</span>
                  <span className={cn("text-[12px]", existing ? "font-medium text-success" : "text-ink-3")}>{m.pct}%{existing ? ` · invoiced (${existing.ref})` : ""}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tabular block text-[14px] font-semibold text-bronze">{money((t.taxable * m.pct) / 100)}</span>
                  <span className="text-[11px] text-ink-3">+ VAT</span>
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
      {node}
    </div>
  );
}
