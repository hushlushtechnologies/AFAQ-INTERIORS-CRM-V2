"use client";

import { supabase } from "./supabase/client";
import { pauseSync, roleToDb } from "./db";
import { useStore } from "./store";
import type { Member } from "./types";

async function call(body: Record<string, unknown>) {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  const res = await fetch("/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}

/** creates the login and the team member in one go */
export async function createStaffLogin(m: Omit<Member, "id">, password: string) {
  const { member } = await call({ action: "create", name: m.name, email: m.email, role: roleToDb(m.role), phone: m.phone, tone: m.tone, title: m.title, photo: m.photo, password });
  const added: Member = { id: member.id, name: member.name, email: member.email, role: m.role, phone: member.phone ?? "", tone: member.tone, active: true, title: member.job_title ?? m.title, photo: member.photo ?? m.photo };
  pauseSync(() => useStore.setState((s) => ({ members: [...s.members.filter((x) => x.id !== added.id), added] })));
  return added;
}

export async function setStaffPassword(id: string, password: string) {
  await call({ action: "set_password", id, password });
}

/** deactivating also blocks the login */
export async function setStaffActive(id: string, active: boolean) {
  await call({ action: "set_active", id, active });
  pauseSync(() => useStore.setState((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, active } : m)) })));
}

/** anyone can change their own photo (works without Team access) */
export async function setMyPhoto(id: string, photo: string | undefined) {
  const { error } = await supabase().rpc("set_my_photo", { p_photo: photo ?? "" });
  if (error) throw new Error(/function|schema cache/i.test(error.message) ? "Photos need the latest database update (supabase/007_team_profiles.sql)." : error.message);
  pauseSync(() => useStore.setState((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, photo } : m)) })));
}

export async function changeOwnPassword(current: string, next: string) {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const email = data.session?.user.email;
  if (!email) throw new Error("Please sign in again.");
  const check = await sb.auth.signInWithPassword({ email, password: current });
  if (check.error) throw new Error("Current password is incorrect.");
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}

/** easy-to-read password: Word-Word-1234 */
export function generatePassword() {
  const words = ["Palm", "Dune", "Marble", "Cedar", "Pearl", "Amber", "Oasis", "Falcon", "Desert", "Coral", "Linen", "Walnut", "Brass", "Ivory", "Sand", "Harbor"];
  const r = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]! % n;
  };
  return `${words[r(words.length)]}-${words[r(words.length)]}-${1000 + r(9000)}`;
}

export function passwordProblem(p: string) {
  if (p.length < 8) return "At least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Use at least one letter and one number.";
  return null;
}
