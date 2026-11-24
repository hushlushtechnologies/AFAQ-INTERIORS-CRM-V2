"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { DEFAULT_TAGLINE } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { fmtDate, lineTotal, money } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

export interface DocSection {
  room?: string;
  items: LineItem[];
}

export function PrintDocument({
  kind,
  number,
  meta,
  to,
  sections,
  totals,
  milestones,
  notes,
  terms,
  payments,
}: {
  kind: "Quotation" | "Tax Invoice";
  number: string;
  meta: [string, string][];
  to: { name: string; company?: string; address?: string; email?: string; phone?: string };
  sections: DocSection[];
  totals: [string, number, boolean?][];
  milestones?: { label: string; pct: number; amount: number }[];
  notes?: string;
  terms?: string;
  payments?: { date: string; method: string; amount: number }[];
}) {
  const st = useStore((s) => s.settings);
  React.useEffect(() => {
    document.title = `${number} — ${to.name}`;
  }, [number, to.name]);
  let n = 0;
  return (
    <div className="min-h-screen bg-[#e9e3da] py-10 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-5 flex max-w-[820px] items-center justify-between px-2">
        <p className="text-[13px] text-ink-2">Use “Save as PDF” in the print dialog to export.</p>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-bronze px-4 py-2.5 text-[13.5px] font-medium text-white hover:bg-[#5a4427]">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <article className="print-sheet mx-auto max-w-[820px] bg-white px-14 py-12 text-[12.5px] text-[#2a2119] shadow-[var(--shadow-float)]">
        <header className="flex items-start justify-between border-b border-[#e6ddd1] pb-7">
          <div>
            <div className="flex items-center gap-3">
              {st.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={st.logo} alt={st.companyName} className="max-h-14 max-w-[200px] object-contain" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1f1913]">
                  <span className="font-display text-[20px] text-[#e4d5b4]">{(st.companyName || "A").trim().charAt(0)}</span>
                </div>
              )}
              <div>
                <p className="font-display text-[19px] leading-tight">{st.companyName}</p>
                {(st.tagline ?? DEFAULT_TAGLINE) && <p className="text-[9.5px] tracking-[0.25em] text-[#9d825d] uppercase">{st.tagline ?? DEFAULT_TAGLINE}</p>}
              </div>
            </div>
            <p className="mt-4 max-w-[280px] leading-relaxed text-[#5e5246]">
              {[st.legalName, st.address, [st.phone, st.email].filter(Boolean).join(" · "), st.trn ? `TRN ${st.trn}` : ""].filter(Boolean).map((line, i) => (
                <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
              ))}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[30px] leading-none font-light text-[#674f2d]">{kind}</p>
            <p className="mt-2 text-[13px] font-semibold">{number}</p>
            <table className="mt-3 ml-auto text-[11.5px]">
              <tbody>
                {meta.map(([k, v]) => (
                  <tr key={k}>
                    <td className="pr-3 text-right text-[#8a7d70]">{k}</td>
                    <td className="text-right font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </header>

        <section className="mt-7">
          <p className="text-[9.5px] font-semibold tracking-[0.2em] text-[#9d825d] uppercase">{kind === "Tax Invoice" ? "Bill to" : "Prepared for"}</p>
          <p className="mt-1.5 text-[15px] font-semibold">{to.name}</p>
          {to.company && <p>{to.company}</p>}
          <p className="text-[#5e5246]">{[to.address, to.phone, to.email].filter(Boolean).join(" · ")}</p>
        </section>

        <section className="mt-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#2a2119] text-[10px] font-semibold tracking-[0.12em] uppercase">
                <th className="w-8 py-2 text-left">#</th>
                <th className="py-2 text-left">Description</th>
                <th className="w-16 py-2 text-right">Qty</th>
                <th className="w-14 py-2 pl-3 text-left">Unit</th>
                <th className="w-24 py-2 text-right">Rate</th>
                <th className="w-28 py-2 text-right">Amount</th>
              </tr>
            </thead>
            {sections.map((sec, si) => (
              <tbody key={si} className="break-inside-avoid">
                {sec.room && (
                  <tr>
                    <td colSpan={6} className="font-display pt-5 pb-1.5 text-[14px] text-[#674f2d]">
                      {sec.room}
                    </td>
                  </tr>
                )}
                {sec.items.map((it) => (
                  <tr key={it.id} className="border-b border-[#efe8df] align-top">
                    <td className="py-2 text-[#8a7d70]">{++n}</td>
                    <td className="py-2 pr-4">{it.description || "—"}</td>
                    <td className="tabular py-2 text-right">{it.qty.toLocaleString()}</td>
                    <td className="py-2 pl-3 text-[#5e5246]">{it.unit}</td>
                    <td className="tabular py-2 text-right">{it.rate.toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
                    <td className="tabular py-2 text-right font-medium">{lineTotal(it).toLocaleString("en-AE", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>

          <div className="mt-6 flex justify-end">
            <table className="w-[300px] text-[12.5px]">
              <tbody>
                {totals.map(([k, v, strong]) => (
                  <tr key={k} className={strong ? "border-t-2 border-[#2a2119] text-[14px] font-semibold" : ""}>
                    <td className={`py-1.5 ${strong ? "pt-2.5" : "text-[#5e5246]"}`}>{k}</td>
                    <td className={`tabular py-1.5 text-right ${strong ? "pt-2.5 text-[#674f2d]" : ""}`}>{v < 0 ? `− ${money(-v, { decimals: true })}` : money(v, { decimals: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {payments && payments.length > 0 && (
          <section className="mt-8 break-inside-avoid">
            <p className="text-[9.5px] font-semibold tracking-[0.2em] text-[#9d825d] uppercase">Payments received</p>
            <table className="mt-2 w-full">
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-[#efe8df]">
                    <td className="py-1.5">{fmtDate(p.date)}</td>
                    <td className="py-1.5 text-[#5e5246]">{p.method}</td>
                    <td className="tabular py-1.5 text-right">{money(p.amount, { decimals: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {milestones && milestones.length > 0 && (
          <section className="mt-8 break-inside-avoid">
            <p className="text-[9.5px] font-semibold tracking-[0.2em] text-[#9d825d] uppercase">Payment schedule</p>
            <table className="mt-2 w-full">
              <tbody>
                {milestones.map((m, i) => (
                  <tr key={i} className="border-b border-[#efe8df]">
                    <td className="py-1.5">{m.label}</td>
                    <td className="tabular w-16 py-1.5 text-right text-[#5e5246]">{m.pct}%</td>
                    <td className="tabular w-32 py-1.5 text-right">{money(m.amount, { decimals: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {notes && (
          <section className="mt-8 break-inside-avoid">
            <p className="text-[9.5px] font-semibold tracking-[0.2em] text-[#9d825d] uppercase">Notes</p>
            <p className="mt-2 leading-relaxed whitespace-pre-wrap text-[#5e5246]">{notes}</p>
          </section>
        )}
        {terms && (
          <section className="mt-6 break-inside-avoid">
            <p className="text-[9.5px] font-semibold tracking-[0.2em] text-[#9d825d] uppercase">Terms & conditions</p>
            <p className="mt-2 text-[11px] leading-relaxed whitespace-pre-wrap text-[#5e5246]">{terms}</p>
          </section>
        )}

        {kind === "Tax Invoice" && (st.bankIban || st.bankName) && (
          <section className="mt-8 rounded-lg border border-[#e6ddd1] px-5 py-4">
            <p className="text-[9.5px] font-semibold tracking-[0.2em] text-[#9d825d] uppercase">Payment details</p>
            <table className="mt-2 text-[11.5px]">
              <tbody>
                {([["Bank", st.bankName], ["Account name", st.bankAccountName || st.legalName], ["IBAN", st.bankIban], ["SWIFT / BIC", st.bankSwift]] as [string, string | undefined][])
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k}>
                      <td className="pr-6 text-[#8a7d70]">{k}</td>
                      <td className={k === "IBAN" ? "font-mono font-semibold tracking-wide" : "font-medium"}>{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}
        <footer className="mt-14 flex items-end justify-between border-t border-[#e6ddd1] pt-6 text-[11px] text-[#8a7d70]">
          <div>
            <div className="mb-1 h-10 w-48 border-b border-[#bfb3a3]" />
            Authorised signature
          </div>
          {kind === "Quotation" && (
            <div className="text-right">
              <div className="mb-1 ml-auto h-10 w-48 border-b border-[#bfb3a3]" />
              Client acceptance &amp; date
            </div>
          )}
          {kind === "Tax Invoice" && <p>{st.website}</p>}
        </footer>
      </article>
    </div>
  );
}
