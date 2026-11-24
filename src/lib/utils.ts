import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Invoice, LineItem, Quote } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** RFC-4122 v4 id — the same ids are used as primary keys in Supabase. */
export function uid(_prefix = "") {
  void _prefix;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
  );
}

export const isUuid = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** ISO date (yyyy-mm-dd) offset by n days from today */
export function dayOffset(n: number, base = new Date()) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function today() {
  return dayOffset(0);
}

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function daysFromToday(date: string) {
  return daysBetween(today(), date.slice(0, 10));
}

const aed = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 });
const aed2 = new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(n: number, opts: { decimals?: boolean; currency?: string } = {}) {
  const c = opts.currency ?? "AED";
  return `${c} ${(opts.decimals ? aed2 : aed).format(Math.round(n * 100) / 100)}`;
}

export function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

export function fmtDate(d?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

export function fmtShort(d?: string) {
  return fmtDate(d, { day: "numeric", month: "short" });
}

export function relative(d: string) {
  const n = daysFromToday(d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n}d ago`;
  return `in ${n}d`;
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/* ───────── commercial calculations (single source of truth) ───────── */

const r2 = (n: number) => Math.round(n * 100) / 100;

export function lineTotal(i: LineItem) {
  return r2((Number(i.qty) || 0) * (Number(i.rate) || 0));
}

export function quoteTotals(q: Pick<Quote, "sections" | "discountPct" | "vatPct">) {
  const subtotal = r2(q.sections.reduce((s, sec) => s + sec.items.reduce((a, i) => a + lineTotal(i), 0), 0));
  const discount = r2((subtotal * (q.discountPct || 0)) / 100);
  const taxable = r2(subtotal - discount);
  const vat = r2((taxable * (q.vatPct || 0)) / 100);
  const total = r2(taxable + vat);
  return { subtotal, discount, taxable, vat, total };
}

export function sectionTotal(items: LineItem[]) {
  return r2(items.reduce((a, i) => a + lineTotal(i), 0));
}

export function invoiceTotals(inv: Pick<Invoice, "items" | "vatPct" | "payments">) {
  const subtotal = sectionTotal(inv.items);
  const vat = r2((subtotal * (inv.vatPct || 0)) / 100);
  const total = r2(subtotal + vat);
  const paid = r2(inv.payments.reduce((a, p) => a + p.amount, 0));
  const balance = r2(total - paid);
  return { subtotal, vat, total, paid, balance };
}

export type InvoiceStatus = "paid" | "partial" | "overdue" | "unpaid" | "cancelled";

export function invoiceStatus(inv: Invoice): InvoiceStatus {
  if (inv.cancelled) return "cancelled";
  const { total, paid, balance } = invoiceTotals(inv);
  if (total > 0 && balance <= 0.009) return "paid";
  if (daysFromToday(inv.dueDate) < 0) return "overdue";
  if (paid > 0) return "partial";
  return "unpaid";
}

/** Digits for wa.me — turns a local UAE number (050…, 04…) into 971… */
export function waNumber(phone?: string) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "971" + d.slice(1);
  return d.length >= 8 ? d : "";
}
export const digits = (v?: string) => (v ?? "").replace(/\D/g, "");
