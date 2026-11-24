import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { buildDesignPrompt } from "@/lib/ai-prompt";

/**
 * AI Studio: generates an interior design image with Google Gemini (Nano Banana).
 * With a reference photo it redesigns that room; without one it creates a new concept.
 * The result is saved privately in Supabase Storage and linked to the lead/project.
 *
 * Env: GEMINI_API_KEY, (GEMINI_IMAGE_MODEL), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

export const runtime = "nodejs";
export const maxDuration = 120;

const BUCKET = "crm-media";
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = process.env.GEMINI_API_KEY;
  if (!url || !secret) return fail(500, "Server setup needed: SUPABASE_SECRET_KEY is missing.");
  if (!key) return fail(500, "AI Studio isn’t set up yet: add GEMINI_API_KEY to the server environment.");
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  // caller + permission
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "Please sign in again.");
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return fail(401, "Your session has expired. Please sign in again.");
  const { data: me } = await db.from("members").select("id, role, active").eq("id", auth.user.id).maybeSingle();
  if (!me?.active) return fail(403, "Your account is not active.");
  if (me.role !== "director") {
    const { data: p } = await db.from("role_permissions").select("access").eq("role", me.role).eq("module", "studio").maybeSingle();
    if (p?.access !== "edit") return fail(403, "You don’t have permission to generate designs.");
  }

  const body = (await req.json().catch(() => ({}))) as {
    entity?: "lead" | "project";
    entityId?: string;
    sourceId?: string;
    prompt?: string;
    style?: string;
    room?: string;
    keepLayout?: boolean;
    aspect?: string;
  };
  if (body.entity !== "lead" && body.entity !== "project") return fail(400, "Choose a lead or project.");
  if (!body.entityId) return fail(400, "Choose a lead or project.");
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 3 && !body.style) return fail(400, "Describe the design you want.");
  if (prompt.length > 2000) return fail(400, "The prompt is too long (2,000 characters max).");

  // the caller must be able to see the record (use their own token so row security applies)
  const asUser = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: record } = await asUser.from(body.entity === "lead" ? "leads" : "projects").select("id").eq("id", body.entityId).maybeSingle();
  if (!record) return fail(403, "You can’t access this record.");

  // monthly budget
  const { data: st } = await db.from("settings").select("ai_monthly_limit").eq("id", 1).maybeSingle();
  const limit = st?.ai_monthly_limit ?? 100;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await db.from("media").select("id", { count: "exact", head: true }).eq("kind", "generated").gte("created_at", monthStart.toISOString());
  if ((count ?? 0) >= limit) return fail(429, `This month’s limit of ${limit} AI images is used up. A Director can raise it in Settings.`);

  // reference photo
  let source: { id: string; data: string; mime: string } | undefined;
  if (body.sourceId) {
    const { data: m } = await db.from("media").select("id, path, entity, entity_id").eq("id", body.sourceId).maybeSingle();
    if (!m) return fail(404, "Reference photo not found.");
    // only photos/designs that belong to this same lead or project can be used as a reference
    if (m.entity !== body.entity || m.entity_id !== body.entityId) return fail(403, "That photo belongs to a different record.");
    const { data: file, error } = await db.storage.from(BUCKET).download(m.path);
    if (error || !file) return fail(500, "Couldn’t read the reference photo.");
    source = { id: m.id, data: Buffer.from(await file.arrayBuffer()).toString("base64"), mime: file.type || "image/jpeg" };
  }

  const text = buildDesignPrompt({ prompt, style: body.style, room: body.room, keepLayout: body.keepLayout !== false, hasPhoto: !!source });

  // Gemini
  const res = await fetch(`${process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [...(source ? [{ inline_data: { mime_type: source.mime, data: source.data } }] : []), { text }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        ...(source ? {} : { imageConfig: { aspectRatio: ["16:9", "4:3", "1:1", "3:4", "9:16"].includes(body.aspect ?? "") ? body.aspect : "16:9" } }),
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("[ai] gemini", res.status, detail.slice(0, 500));
    if (res.status === 429 && /free_tier|limit: 0/i.test(detail))
      return fail(429, "The Gemini key is on Google’s free tier, which doesn’t include image generation. Turn on billing for the key’s project at aistudio.google.com/apikey, then try again.");
    if (res.status === 429 && /per day|daily/i.test(detail)) return fail(429, "Today’s Gemini image quota is used up. Try again tomorrow or raise the quota in Google AI Studio.");
    if (res.status === 429) return fail(429, "The AI service is busy. Wait a minute and try again.");
    if (res.status === 400 && /API key/i.test(detail)) return fail(500, "The Gemini API key is not valid.");
    return fail(502, "The AI service couldn’t create this image. Try rewording the prompt.");
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string }; text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const img = parts.map((p) => p.inlineData ?? (p.inline_data ? { mimeType: p.inline_data.mime_type, data: p.inline_data.data } : undefined)).find(Boolean);
  if (!img) {
    const why = json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason;
    return fail(422, why && why !== "STOP" ? `The AI declined this request (${why}). Try a different prompt.` : "No image came back. Try rewording the prompt.");
  }

  // save
  const id = randomUUID();
  const ext = img.mimeType.includes("jpeg") ? "jpg" : "png";
  const path = `${body.entity}/${body.entityId}/ai-${id}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(path, Buffer.from(img.data, "base64"), { contentType: img.mimeType, upsert: false });
  if (up.error) return fail(500, `Couldn’t save the image: ${up.error.message}`);
  const { data: row, error } = await db
    .from("media")
    .insert({
      id,
      entity: body.entity,
      entity_id: body.entityId,
      kind: "generated",
      path,
      name: `AI design ${new Date().toISOString().slice(0, 10)}`,
      mime: img.mimeType,
      prompt: prompt || null,
      style: body.style || null,
      room: body.room || null,
      model: MODEL,
      source_id: source?.id ?? null,
      created_by: me.id,
    })
    .select()
    .single();
  if (error) return fail(500, error.message);

  await db.from("activities").insert({
    entity: body.entity,
    entity_id: body.entityId,
    type: "system",
    text: `AI design generated${body.style ? ` — ${body.style}` : ""}${body.room ? `, ${body.room}` : ""}${prompt ? `: “${prompt.slice(0, 140)}${prompt.length > 140 ? "…" : ""}”` : ""}`,
    by_id: me.id,
  });

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return NextResponse.json({ media: row, url: signed?.signedUrl, used: (count ?? 0) + 1, limit });
}

/** usage for the meter in AI Studio */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return NextResponse.json({ configured: false });
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ count }, { data: st }] = await Promise.all([
    db.from("media").select("id", { count: "exact", head: true }).eq("kind", "generated").gte("created_at", monthStart.toISOString()),
    db.from("settings").select("ai_monthly_limit").eq("id", 1).maybeSingle(),
  ]);
  return NextResponse.json({ configured: !!process.env.GEMINI_API_KEY, used: count ?? 0, limit: st?.ai_monthly_limit ?? 100, model: MODEL });
}
