"use client";

import { useStore, type Store } from "./store";
import type { Module, Perm } from "./types";

const FULL: Perm = { access: "edit", scope: "all" };
const NONE: Perm = { access: "none", scope: "own" };

/** what the signed-in (or "viewing as") person may do in a module */
export function permFor(s: Pick<Store, "members" | "settings" | "permissions">, module: Module): Perm {
  const me = s.members.find((m) => m.id === s.settings.currentUserId);
  if (!me || !me.active) return NONE;
  if (me.role === "Director") return FULL;
  return s.permissions[me.role]?.[module] ?? NONE;
}

export function usePerm(module: Module) {
  const p = useStore((s) => permFor(s, module));
  return {
    ...p,
    canView: p.access !== "none",
    canEdit: p.access === "edit",
    ownOnly: p.scope === "own",
  };
}

/** route → module, for the page guard and sidebar */
export function moduleForPath(path: string): Module | null {
  if (path.startsWith("/leads")) return "leads";
  if (path.startsWith("/quotes")) return "quotes";
  if (path.startsWith("/clients")) return "clients";
  if (path.startsWith("/projects")) return "projects";
  if (path.startsWith("/tasks")) return "tasks";
  if (path.startsWith("/invoices")) return "invoices";
  if (path.startsWith("/studio")) return "studio";
  if (path.startsWith("/team")) return "team";
  if (path.startsWith("/settings")) return "settings";
  return null;
}
