import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { mapFields, type FieldData } from "@/lib/meta";

/**
 * Meta Lead Ads → CRM leads.
 *
 * Meta calls this URL when someone submits an instant form on a Facebook/Instagram ad.
 *  GET  — one-time verification when you add the webhook in the Meta app
 *  POST — "leadgen" notifications; we fetch the full lead from the Graph API and save it
 *
 * Env: META_VERIFY_TOKEN, META_APP_SECRET, META_PAGE_ACCESS_TOKEN, (META_GRAPH_VERSION),
 *      NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v25.0"}`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  if (!mode) {
    // health check for the Settings page (no secrets)
    return NextResponse.json({
      verifyToken: !!process.env.META_VERIFY_TOKEN,
      appSecret: !!process.env.META_APP_SECRET,
      pageToken: !!process.env.META_PAGE_ACCESS_TOKEN,
      database: !!(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
  }
  return new Response("Verification failed", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

type GraphLead = {
  id: string;
  created_time?: string;
  field_data?: FieldData;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  form_id?: string;
  platform?: string;
  is_organic?: boolean;
};

async function fetchLead(leadgenId: string): Promise<GraphLead> {
  const token = process.env.META_PAGE_ACCESS_TOKEN!;
  const full = await fetch(`${GRAPH}/${leadgenId}?fields=created_time,field_data,ad_name,adset_name,campaign_name,form_id,platform,is_organic&access_token=${encodeURIComponent(token)}`);
  if (full.ok) return full.json();
  // ad/campaign names need extra permissions; fall back to the form answers only
  const basic = await fetch(`${GRAPH}/${leadgenId}?fields=created_time,field_data,form_id&access_token=${encodeURIComponent(token)}`);
  if (!basic.ok) throw new Error(`Graph API ${basic.status}: ${(await basic.text()).slice(0, 300)}`);
  return basic.json();
}

async function formName(formId?: string) {
  if (!formId) return undefined;
  const r = await fetch(`${GRAPH}/${formId}?fields=name&access_token=${encodeURIComponent(process.env.META_PAGE_ACCESS_TOKEN!)}`);
  return r.ok ? ((await r.json()).name as string | undefined) : undefined;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret || !process.env.META_PAGE_ACCESS_TOKEN) {
    console.error("[meta] missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY / META_PAGE_ACCESS_TOKEN");
    return new Response("Not configured", { status: 500 });
  }
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: { object?: string; entry?: { changes?: { field: string; value: { leadgen_id?: string | number; form_id?: string | number } }[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const ids = (body.entry ?? []).flatMap((e) => (e.changes ?? []).filter((c) => c.field === "leadgen" && c.value?.leadgen_id).map((c) => String(c.value.leadgen_id)));
  let failed = 0;

  for (const leadgenId of ids) {
    try {
      const { data: existing } = await db.from("leads").select("id").eq("external_id", leadgenId).maybeSingle();
      if (existing) continue; // Meta retries — already saved

      const g = await fetchLead(leadgenId);
      const f = mapFields(g.field_data);
      const form = await formName(g.form_id);
      const detail = [g.campaign_name, g.ad_name, form ? `Form: ${form}` : undefined].filter(Boolean).join(" · ");
      const { data: owner } = await db.rpc("next_lead_owner");
      if (!owner) throw new Error("No active Sales Executive or Director to assign the lead to");

      const { data: lead, error } = await db
        .from("leads")
        .insert({
          ref: "LD-0", // replaced by the next free number in the database
          name: f.name,
          company: f.company || null,
          phone: f.phone || null,
          email: f.email || null,
          source: g.platform === "ig" ? "Instagram" : "Meta Ads",
          property_type: f.propertyType,
          location: f.location || null,
          area_sqft: f.areaSqft,
          budget: f.budget,
          style: f.style || null,
          stage: "new",
          owner_id: owner,
          next_follow_up: new Date().toISOString().slice(0, 10),
          notes: f.notes.length ? f.notes.join("\n") : null,
          source_detail: detail || null,
          external_id: leadgenId,
          priority: "normal",
          inquiry_date: (g.created_time ? new Date(g.created_time) : new Date()).toISOString().slice(0, 10),
          created_at: g.created_time ? new Date(g.created_time).toISOString() : new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505" && /external_id/.test(error.message)) continue; // arrived twice at once
        throw new Error(error.message);
      }
      await db.from("activities").insert({
        entity: "lead",
        entity_id: lead.id,
        type: "system",
        text: `Lead received from ${g.platform === "ig" ? "Instagram" : "Facebook"} lead form${detail ? ` — ${detail}` : ""}`,
        by_id: owner,
      });
    } catch (e) {
      failed++;
      console.error("[meta] lead", leadgenId, (e as Error).message);
    }
  }

  // a non-200 makes Meta retry later; duplicates are skipped above
  return failed ? new Response("Some leads failed", { status: 500 }) : new Response("EVENT_RECEIVED", { status: 200 });
}
