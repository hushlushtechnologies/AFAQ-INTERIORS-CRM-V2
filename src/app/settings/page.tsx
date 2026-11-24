"use client";

import * as React from "react";
import { Check, Download, Eye, ImagePlus, RotateCcw, Trash2, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, CardHeader, Field, Input, PageHeader, Textarea, useConfirm } from "@/components/ui";
import { DEFAULT_INVOICE_NOTES, DEFAULT_QUOTE_TERMS, DEFAULT_TAGLINE } from "@/lib/constants";
import { cn, money } from "@/lib/utils";

/** Meta lead ads / Gemini status card — hidden for now; flip to true to show it again */
const SHOW_INTEGRATIONS = false;
import { toast } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { loadSampleData } from "@/lib/db";
import { usePerm } from "@/lib/perms";

export default function SettingsPage() {
  const s = useStore();
  const st = s.settings;
  const { confirm, node } = useConfirm();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { canEdit } = usePerm("settings");
  const up = (k: keyof typeof st) => (e: React.ChangeEvent<HTMLInputElement>) =>
    s.updateSettings({ [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value } as Partial<typeof st>);

  const exportJson = () => {
    const { members, clients, projects, leads, quotes, invoices, tasks, activities, settings } = useStore.getState();
    const blob = new Blob([JSON.stringify({ app: "afaq-crm-v2", exportedAt: new Date().toISOString(), members, clients, projects, leads, quotes, invoices, tasks, activities, settings }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `afaq-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== "afaq-crm-v2") throw new Error("Not an Afaq CRM backup");
      const keys = ["members", "clients", "projects", "leads", "quotes", "invoices", "tasks", "activities", "settings"] as const;
      const next: Record<string, unknown> = {};
      for (const k of keys) if (data[k]) next[k] = data[k];
      useStore.setState(next);
      toast("Backup restored");
    } catch (e) {
      toast(`Import failed: ${(e as Error).message}`);
    }
  };

  const me = s.members.find((m) => m.id === st.currentUserId);
  const emailBad = !!st.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.email.trim());
  const trnDigits = (st.trn ?? "").replace(/\D/g, "");
  const trnBad = !!st.trn && !/X/i.test(st.trn) && trnDigits.length !== 15;
  const iban = (st.bankIban ?? "").replace(/\s/g, "").toUpperCase();
  const ibanBad = !!iban && !/^0+$/.test(iban.slice(2)) && !/^AE\d{21}$/.test(iban);
  const firstQuote = s.quotes[0];
  const firstInvoice = s.invoices.find((i) => !i.cancelled);
  const set = (patch: Partial<typeof st>) => s.updateSettings(patch);

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Company"
        title="Settings"
        description="Company details, document defaults, bank details and data."
        actions={canEdit ? <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-[12px] font-medium text-success"><Check size={13} /> Changes save automatically</span> : <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Company profile" subtitle="Appears on quotation and invoice letterheads" />
          <fieldset disabled={!canEdit} className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
            <div className="md:col-span-2"><LogoPicker value={st.logo} name={st.companyName} onChange={(logo) => set({ logo: logo ?? "" })} disabled={!canEdit} /></div>
            <Field label="Trading name *" hint={!st.companyName.trim() ? "Needed on every document" : undefined}><Input value={st.companyName} onChange={up("companyName")} /></Field>
            <Field label="Tagline" hint="Small line under the name on PDFs"><Input value={st.tagline ?? DEFAULT_TAGLINE} onChange={(e) => set({ tagline: e.target.value })} placeholder="Interior design · Turnkey fit-out" /></Field>
            <Field label="Legal name"><Input value={st.legalName} onChange={up("legalName")} /></Field>
            <Field label="Tax registration number (TRN)" hint={trnBad ? "A UAE TRN has 15 digits" : undefined}><Input value={st.trn} onChange={up("trn")} inputMode="numeric" className={trnBad ? "border-danger" : undefined} /></Field>
            <Field label="Address" className="md:col-span-2"><Input value={st.address} onChange={up("address")} /></Field>
            <Field label="Phone"><Input type="tel" value={st.phone} onChange={up("phone")} /></Field>
            <Field label="Email" hint={emailBad ? "That email doesn’t look right" : undefined}><Input type="email" value={st.email} onChange={up("email")} className={emailBad ? "border-danger" : undefined} /></Field>
            <Field label="Website"><Input value={st.website} onChange={up("website")} placeholder="afaqalmanzel.ae" /></Field>
          </fieldset>
        </Card>

        <Card>
          <CardHeader
            title="Quotations & invoices"
            subtitle="Defaults for new documents. Existing documents keep their own values."
            action={
              <div className="flex gap-3 text-[12.5px] font-medium">
                {firstQuote && <a href={`/quotes/${firstQuote.id}/print`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-bronze hover:underline"><Eye size={13} /> Quote PDF</a>}
                {firstInvoice && <a href={`/invoices/${firstInvoice.id}/print`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-bronze hover:underline"><Eye size={13} /> Invoice PDF</a>}
              </div>
            }
          />
          <fieldset disabled={!canEdit} className="grid grid-cols-2 gap-4 px-5 pb-5 md:grid-cols-4">
            <Field label="Currency"><Input value={st.currency} disabled /></Field>
            <Field label="VAT %" hint="UAE standard rate is 5%"><NumInput value={st.vatPct} min={0} max={100} step={0.5} onCommit={(v) => set({ vatPct: v })} /></Field>
            <Field label="Quote valid for (days)"><NumInput value={st.quoteValidityDays} min={1} max={365} onCommit={(v) => set({ quoteValidityDays: v })} /></Field>
            <Field label="Invoice due in (days)"><NumInput value={st.invoiceDueDays} min={0} max={365} onCommit={(v) => set({ invoiceDueDays: v })} /></Field>
            <Field label="Default quotation terms & conditions" className="col-span-2 md:col-span-4" hint="Added to every new quotation. Each one can still be edited.">
              <Textarea value={st.quoteTerms ?? DEFAULT_QUOTE_TERMS} onChange={(e) => set({ quoteTerms: e.target.value })} className="min-h-[120px] text-[13px]" />
            </Field>
            <Field label="Payment note on invoices" className="col-span-2 md:col-span-4">
              <Textarea value={st.invoiceNotes ?? DEFAULT_INVOICE_NOTES} onChange={(e) => set({ invoiceNotes: e.target.value })} className="min-h-[70px] text-[13px]" />
            </Field>
          </fieldset>
        </Card>

        <Card>
          <CardHeader title="Bank details" subtitle="Printed on every invoice so clients know where to pay" />
          <fieldset disabled={!canEdit} className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
            <Field label="Bank name"><Input value={st.bankName ?? ""} onChange={(e) => set({ bankName: e.target.value })} placeholder="e.g. Emirates NBD" /></Field>
            <Field label="Account name"><Input value={st.bankAccountName ?? ""} onChange={(e) => set({ bankAccountName: e.target.value })} placeholder={st.legalName || "Company legal name"} /></Field>
            <Field label="IBAN" hint={ibanBad ? "A UAE IBAN is AE followed by 21 digits" : undefined}>
              <Input value={st.bankIban ?? ""} onChange={(e) => set({ bankIban: e.target.value.toUpperCase() })} placeholder="AE07 0331 2345 6789 0123 456" className={cn("font-mono", ibanBad && "border-danger")} />
            </Field>
            <Field label="SWIFT / BIC"><Input value={st.bankSwift ?? ""} onChange={(e) => set({ bankSwift: e.target.value.toUpperCase() })} placeholder="e.g. EBILAEAD" className="font-mono" /></Field>
          </fieldset>
        </Card>

        <Card>
          <CardHeader title="AI Studio" subtitle="Protects the monthly AI image budget" />
          <fieldset disabled={!canEdit} className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
            <Field label="Monthly image limit" hint="Generation stops for everyone when the limit is reached." className="sm:w-64">
              <NumInput value={st.aiMonthlyLimit} min={0} max={10000} onCommit={(v) => set({ aiMonthlyLimit: v })} />
            </Field>
            <p className="pb-6 text-[12.5px] text-ink-3">Around {money(st.aiMonthlyLimit * 0.15, { currency: "USD" })} a month at Google’s usual image price.</p>
          </fieldset>
        </Card>

        {SHOW_INTEGRATIONS && isSupabaseConfigured && <IntegrationsCard canEdit={canEdit} />}

        <Card>
          <CardHeader
            title="Data"
            subtitle={isSupabaseConfigured ? "Saved to your Supabase database and shared with the team." : "Demo mode keeps data in this browser. Back it up before clearing your browser data."}
          />
          {isSupabaseConfigured ? (
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              <Button variant="outline" onClick={exportJson}><Download size={15} /> Export backup (.json)</Button>
              {me?.role === "Director" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    confirm("Load sample data?", "Adds demo leads, clients, projects, quotations, invoices and tasks to the live database, all assigned to you. Use it for testing, then delete the records.", () => {
                      loadSampleData();
                      toast("Sample data added — saving…");
                    })
                  }
                >
                  <RotateCcw size={15} /> Load sample data
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 px-5 pb-5">
              <Button variant="outline" onClick={exportJson}><Download size={15} /> Export backup (.json)</Button>
              {canEdit && (
                <>
                  <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore backup</Button>
                  <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) confirm("Restore this backup?", `Everything in the CRM is replaced with “${f.name}”.`, () => void importJson(f)); }} />
                  <Button variant="outline" onClick={() => confirm("Reset demo data?", "All current records are replaced with the sample data.", () => { s.resetDemo(); toast("Demo data restored"); })}><RotateCcw size={15} /> Reset demo data</Button>
                  <Button variant="outline" className="text-danger hover:border-danger" onClick={() => confirm("Start with a clean CRM?", "All leads, clients, projects, quotations, invoices and tasks are removed. Export a backup first if you need it.", () => { s.clearAll(); toast("CRM cleared"); })}><Trash2 size={15} /> Clear all records</Button>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
      {node}
    </div>
  );
}

/** number box that lets you clear it while typing, and snaps to range when you leave it */
function NumInput({ value, min, max, step = 1, onCommit }: { value: number; min: number; max: number; step?: number; onCommit: (v: number) => void }) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(v) && v >= min && v <= max) onCommit(v);
      }}
      onBlur={() => {
        const v = clamp(Number(text) || 0);
        setText(String(v));
        if (v !== value) onCommit(v);
      }}
    />
  );
}

/** fits a logo into 480×180, keeping transparency (PNG) */
async function logoToDataUrl(file: File) {
  if (file.type && !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 10_000_000) throw new Error("That file is too large (max 10 MB).");
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("This image can’t be read. Please use PNG or JPG.");
  const scale = Math.min(1, 480 / bmp.width, 180 / bmp.height);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const png = c.toDataURL("image/png");
  return png.length < 350_000 ? png : c.toDataURL("image/jpeg", 0.88);
}

function LogoPicker({ value, name, onChange, disabled }: { value?: string; name: string; onChange: (v: string | undefined) => void; disabled?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [err, setErr] = React.useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-16 min-w-16 items-center justify-center rounded-xl border border-line bg-white px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="Logo" className="max-h-12 max-w-[180px] object-contain" /> : <span className="font-display flex h-11 w-11 items-center justify-center rounded-lg bg-espresso text-[20px] text-sand">{(name || "A").trim().charAt(0)}</span>}
      </div>
      <div>
        <div className="flex gap-2">
          <button type="button" disabled={disabled} onClick={() => ref.current?.click()} className="rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-bronze-2 disabled:opacity-50"><ImagePlus size={13} className="mr-1 inline" />{value ? "Change logo" : "Upload logo"}</button>
          {value && <button type="button" disabled={disabled} onClick={() => onChange(undefined)} className="px-2 text-[12.5px] text-ink-3 hover:text-danger">Remove</button>}
        </div>
        <p className="mt-1 text-[11.5px] text-ink-3">{err ? <span className="text-danger">{err}</span> : "Optional · PNG with a transparent background looks best. Shown on PDFs."}</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try { setErr(null); onChange(await logoToDataUrl(f)); } catch (x) { setErr((x as Error).message); }
        }}
      />
    </div>
  );
}

function IntegrationsCard({ canEdit }: { canEdit: boolean }) {
  const s = useStore();
  const [meta, setMeta] = React.useState<{ verifyToken: boolean; appSecret: boolean; pageToken: boolean; database: boolean } | null>(null);
  const [ai, setAi] = React.useState<{ configured?: boolean; used: number; limit: number; model?: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/meta/webhook").then((r) => r.json()).then(setMeta).catch(() => undefined);
    fetch("/api/ai/generate").then((r) => r.json()).then(setAi).catch(() => undefined);
  }, []);
  const webhook = typeof window !== "undefined" ? `${location.origin}/api/meta/webhook` : "";
  const metaLeads = s.leads.filter((l) => l.externalId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const metaReady = meta && meta.verifyToken && meta.appSecret && meta.pageToken && meta.database;
  const Dot = ({ ok }: { ok?: boolean }) => <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-success" : "bg-warning"}`} />;
  return (
    <Card>
      <CardHeader title="Integrations" subtitle="Meta lead ads and AI Studio" />
      <div className="grid grid-cols-1 gap-4 px-5 pb-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-line p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Dot ok={!!metaReady} /> Meta lead ads (Facebook & Instagram)</p>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {metaReady ? "Connected on the server. New form submissions arrive as leads automatically." : "Not fully set up yet. Your developer adds the Meta keys on the server."}
          </p>
          <p className="mt-3 text-[12px] font-medium text-ink-2">Webhook URL (for the Meta app)</p>
          <div className="mt-1 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2.5 py-2 text-[12px] text-ink-2">{webhook}</code>
            <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(webhook); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</Button>
          </div>
          {webhook.includes("localhost") && <p className="mt-2 text-[11.5px] text-warning">Meta can’t reach localhost. Use the live (Vercel) address.</p>}
          <p className="mt-3 text-[12.5px] text-ink-2">
            {metaLeads.length ? <>Last ad lead: <b>{metaLeads[0]!.name}</b> · {new Date(metaLeads[0]!.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {metaLeads.length} total</> : "No ad leads received yet."}
          </p>
          {meta && !metaReady && (
            <ul className="mt-2 space-y-0.5 text-[11.5px] text-ink-3">
              <li><Dot ok={meta.verifyToken} /> META_VERIFY_TOKEN</li>
              <li><Dot ok={meta.appSecret} /> META_APP_SECRET</li>
              <li><Dot ok={meta.pageToken} /> META_PAGE_ACCESS_TOKEN</li>
              <li><Dot ok={meta.database} /> SUPABASE_SECRET_KEY</li>
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Dot ok={!!ai?.configured} /> AI Studio (Google Gemini)</p>
          <p className="mt-1 text-[12.5px] text-ink-3">{ai?.configured ? `Ready · model ${ai.model}` : "Needs GEMINI_API_KEY on the server."}</p>
          {ai && <p className="mt-3 text-[12.5px] text-ink-2"><b>{ai.used}</b> images generated this month</p>}
          <Field label="Monthly image limit" hint="Protects the AI budget. Generation stops when the limit is reached." className="mt-3">
            <Input type="number" min={0} disabled={!canEdit} value={s.settings.aiMonthlyLimit} onChange={(e) => s.updateSettings({ aiMonthlyLimit: Math.max(0, Number(e.target.value)) })} className="max-w-[160px]" />
          </Field>
        </div>
      </div>
    </Card>
  );
}
