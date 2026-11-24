import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Staff logins, managed from the Team page — no Supabase dashboard needed.
 * Runs on the server only: the secret key never reaches the browser.
 *
 *   create        → create a login (email + password) and add them to the team
 *   set_password  → set a new password for a team member
 *   set_active    → deactivate (blocks login) or reactivate a team member
 *
 * The caller must be signed in, active, and have Team = Edit (Directors always do).
 * Only a Director can create a Director or change a Director's login.
 */

export const runtime = "nodejs";

const ROLES = ["director", "sales_executive", "project_manager", "interior_designer", "site_engineer", "procurement_officer", "finance_officer"] as const;
type DbRole = (typeof ROLES)[number];

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

function checkPassword(p: unknown): string | null {
  if (typeof p !== "string" || p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Password needs at least one letter and one number.";
  return null;
}

export async function POST(req: Request) {
  const db = admin();
  if (!db) return fail(500, "Server setup needed: add SUPABASE_SECRET_KEY to .env.local and restart the server.");

  // who is calling?
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "Please sign in again.");
  const { data: auth, error: authErr } = await db.auth.getUser(token);
  if (authErr || !auth.user) return fail(401, "Your session has expired. Please sign in again.");

  const { data: me } = await db.from("members").select("id, role, active").eq("id", auth.user.id).maybeSingle();
  if (!me || !me.active) return fail(403, "Your account is not active.");
  let canManage = me.role === "director";
  if (!canManage) {
    const { data: p } = await db.from("role_permissions").select("access").eq("role", me.role).eq("module", "team").maybeSingle();
    canManage = p?.access === "edit";
  }
  if (!canManage) return fail(403, "You don't have permission to manage the team.");
  const isDirector = me.role === "director";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Bad request.");
  }

  /* ── create login + member ── */
  if (body.action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const role = String(body.role ?? "") as DbRole;
    if (!name) return fail(400, "Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Enter a valid email address.");
    if (!ROLES.includes(role)) return fail(400, "Choose a role.");
    if (role === "director" && !isDirector) return fail(403, "Only a Director can add another Director.");
    const pwErr = checkPassword(body.password);
    if (pwErr) return fail(400, pwErr);

    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: body.password as string,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !created.user) {
      const msg = /already/i.test(error?.message ?? "") ? "A login with this email already exists." : error?.message ?? "Could not create the login.";
      return fail(400, msg);
    }
    const title = String(body.title ?? "").trim().slice(0, 60);
    const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/") && body.photo.length < 300_000 ? body.photo : "";
    const { data: member, error: mErr } = await db
      .from("members")
      .insert({ id: created.user.id, name, email, role, phone: body.phone || null, tone: body.tone || "#9D825D", active: true, ...(title ? { job_title: title } : {}), ...(photo ? { photo } : {}) })
      .select()
      .single();
    if (mErr) {
      await db.auth.admin.deleteUser(created.user.id); // keep things consistent
      return fail(400, mErr.message);
    }
    return NextResponse.json({ member });
  }

  /* ── actions on an existing member ── */
  const id = String(body.id ?? "");
  const { data: target } = await db.from("members").select("id, role, name").eq("id", id).maybeSingle();
  if (!target) return fail(404, "Team member not found.");
  if (target.role === "director" && !isDirector) return fail(403, "Only a Director can change a Director's login.");

  if (body.action === "set_password") {
    const pwErr = checkPassword(body.password);
    if (pwErr) return fail(400, pwErr);
    const { error } = await db.auth.admin.updateUserById(id, { password: body.password as string });
    if (error) return fail(400, error.message);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_active") {
    if (id === me.id) return fail(400, "You can't deactivate your own account.");
    const active = Boolean(body.active);
    const { error } = await db.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
    if (error) return fail(400, error.message);
    const { error: mErr } = await db.from("members").update({ active }).eq("id", id);
    if (mErr) return fail(400, mErr.message);
    return NextResponse.json({ ok: true });
  }

  return fail(400, "Unknown action.");
}
