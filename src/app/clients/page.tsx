"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Home, Hotel, MapPin, Phone, Plus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Client } from "@/lib/types";
import { cn, compact, digits, invoiceTotals, money } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Empty, PageHeader, SearchInput, Segmented, Select } from "@/components/ui";
import { ClientModal } from "@/components/delivery";
import { usePerm } from "@/lib/perms";

const SEG_ICON = { Residential: Home, Commercial: Building2, Hospitality: Hotel };
type Seg = "all" | Client["type"];
type Sort = "recent" | "name" | "value" | "balance";

export default function ClientsPage() {
  const s = useStore();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [seg, setSeg] = React.useState<Seg>("all");
  const [sort, setSort] = React.useState<Sort>("recent");
  const [open, setOpen] = React.useState(false);
  const { canEdit } = usePerm("clients");

  const all = React.useMemo(
    () =>
      s.clients.map((c) => {
        const projects = s.projects.filter((p) => p.clientId === c.id);
        const invs = s.invoices.filter((i) => i.clientId === c.id && !i.cancelled);
        const lifetime = projects.reduce((a, p) => a + p.value, 0);
        const balance = invs.reduce((a, i) => a + Math.max(0, invoiceTotals(i).balance), 0);
        const active = projects.filter((p) => p.status !== "completed").length;
        return { c, projects, active, lifetime, balance };
      }),
    [s.clients, s.projects, s.invoices],
  );

  const t = q.trim().toLowerCase();
  const td = digits(q);
  const rows = all
    .filter(({ c }) => seg === "all" || c.type === seg)
    .filter(({ c }) => !t || [c.name, c.company, c.email, c.city, c.ref].some((x) => x?.toLowerCase().includes(t)) || (td.length >= 3 && digits(c.phone).includes(td)))
    .sort((a, b) =>
      sort === "name" ? a.c.name.localeCompare(b.c.name) : sort === "value" ? b.lifetime - a.lifetime : sort === "balance" ? b.balance - a.balance : b.c.createdAt.localeCompare(a.c.createdAt),
    );

  const count = (k: Seg) => (k === "all" ? all.length : all.filter((r) => r.c.type === k).length);
  const totalValue = all.reduce((a, r) => a + r.lifetime, 0);
  const totalDue = all.reduce((a, r) => a + r.balance, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Clients"
        description={`${all.length} clients · ${money(totalValue)} contracted · ${money(totalDue)} outstanding`}
        actions={canEdit ? <Button onClick={() => setOpen(true)}><Plus size={16} /> New client</Button> : <span className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-ink-3">View only</span>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scroll-thin -mx-1 overflow-x-auto px-1">
          <Segmented
            value={seg}
            onChange={setSeg}
            options={(["all", "Residential", "Commercial", "Hospitality"] as Seg[]).map((k) => ({
              value: k,
              label: (
                <>
                  {k === "all" ? "All" : k}
                  <span className="rounded-md bg-surface-2 px-1.5 text-[11px] text-ink-3 tabular-nums">{count(k)}</span>
                </>
              ),
            }))}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="sm:w-48" aria-label="Sort clients">
            <option value="recent">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="value">Highest contract value</option>
            <option value="balance">Highest balance due</option>
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email…" className="sm:w-80" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          {all.length === 0 ? (
            <Empty icon={<Users size={20} />} title="No clients yet" text="Clients are created automatically when you mark a lead as won, or add one yourself." action={canEdit ? <Button onClick={() => setOpen(true)}><Plus size={15} /> New client</Button> : undefined} />
          ) : (
            <Empty icon={<Users size={20} />} title="No matching clients" text="Try a different name, number or segment." action={<Button variant="outline" onClick={() => { setQ(""); setSeg("all"); }}>Clear filters</Button>} />
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ c, projects, active, lifetime, balance }) => {
            const Icon = SEG_ICON[c.type];
            const sub = c.company || c.email || c.phone;
            return (
              <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-bronze-2 focus-visible:outline-none">
                <Card className="group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-line-strong">
                  <div className="flex items-start gap-3.5">
                    <Avatar name={c.name} size={46} className="shrink-0 bg-gradient-to-br from-sand to-bronze" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink group-hover:text-bronze">{c.name}</p>
                      <p className="truncate text-[12.5px] text-ink-3">{sub || "No contact details"}</p>
                    </div>
                    <Badge className="shrink-0 bg-surface-2 text-ink-2"><Icon size={12} /> {c.type}</Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <div>
                      <p className="text-[11.5px] text-ink-3">Projects</p>
                      <p className="mt-0.5 text-[15px] font-semibold text-ink">
                        {projects.length}
                        {active > 0 && <span className="ml-1 text-[11.5px] font-medium text-ink-3">({active} active)</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11.5px] text-ink-3">Contracted</p>
                      <p className="tabular mt-0.5 text-[15px] font-semibold text-ink">{lifetime ? `AED ${compact(lifetime)}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11.5px] text-ink-3">Balance</p>
                      <p className={cn("tabular mt-0.5 text-[15px] font-semibold", balance > 0 ? "text-warning" : "text-success")}>{balance > 0 ? `AED ${compact(balance)}` : "Clear"}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-4 text-[12px] text-ink-3">
                    <span className="shrink-0 whitespace-nowrap">{c.ref}</span>
                    {c.city && <span className="flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /><span className="truncate">{c.city}</span></span>}
                    {c.phone && sub !== c.phone && <span className="ml-auto hidden shrink-0 items-center gap-1 whitespace-nowrap sm:flex"><Phone size={12} />{c.phone}</span>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <ClientModal open={open} onClose={() => setOpen(false)} onSaved={(id) => router.push(`/clients/${id}`)} />
    </div>
  );
}
