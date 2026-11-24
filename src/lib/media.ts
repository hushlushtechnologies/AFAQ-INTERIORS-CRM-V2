"use client";

import * as React from "react";
import { isSupabaseConfigured, supabase } from "./supabase/client";
import { uid } from "./utils";

export const BUCKET = "crm-media";

export interface Media {
  id: string;
  entity: "lead" | "project";
  entityId: string;
  kind: "photo" | "generated";
  path: string;
  name?: string;
  prompt?: string;
  style?: string;
  room?: string;
  sourceId?: string;
  createdBy?: string;
  createdAt: string;
  url?: string; // signed, short-lived
}

type Row = Record<string, unknown>;
export const mediaFrom = (r: Row): Media => ({
  id: r.id as string,
  entity: r.entity as Media["entity"],
  entityId: r.entity_id as string,
  kind: r.kind as Media["kind"],
  path: r.path as string,
  name: (r.name as string) ?? undefined,
  prompt: (r.prompt as string) ?? undefined,
  style: (r.style as string) ?? undefined,
  room: (r.room as string) ?? undefined,
  sourceId: (r.source_id as string) ?? undefined,
  createdBy: (r.created_by as string) ?? undefined,
  createdAt: r.created_at as string,
});

export async function signUrls(items: Media[]) {
  if (!items.length) return items;
  const { data } = await supabase().storage.from(BUCKET).createSignedUrls(items.map((m) => m.path), 60 * 60);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return items.map((m) => ({ ...m, url: map.get(m.path) ?? undefined }));
}

export async function listMedia(entity: Media["entity"], entityId: string) {
  const { data, error } = await supabase().from("media").select("*").eq("entity", entity).eq("entity_id", entityId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return signUrls((data ?? []).map(mediaFrom));
}

/** shrink large phone photos before upload (max 2000px, JPEG) */
async function compress(file: File): Promise<Blob> {
  if (file.type && !file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > 25_000_000) throw new Error(`${file.name} is too large (max 25 MB)`);
  const bmp = await createImageBitmap(file).catch(() => null);
  // the browser can't read it (e.g. iPhone HEIC) — don't upload something mislabelled as JPEG
  if (!bmp) throw new Error(`${file.name} can’t be read. Please use a JPG or PNG photo (on iPhone: Settings → Camera → Formats → Most Compatible).`);
  const max = 2000;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1_500_000 && file.type === "image/jpeg") return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not process image"))), "image/jpeg", 0.86));
}

export async function uploadPhotos(entity: Media["entity"], entityId: string, files: File[], userId: string) {
  const sb = supabase();
  const out: Media[] = [];
  for (const file of files) {
    const blob = await compress(file);
    const id = uid();
    const path = `${entity}/${entityId}/${id}.jpg`;
    const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
    const { data, error } = await sb
      .from("media")
      .insert({ id, entity, entity_id: entityId, kind: "photo", path, name: file.name, mime: "image/jpeg", created_by: userId })
      .select()
      .single();
    if (error) {
      await sb.storage.from(BUCKET).remove([path]);
      throw new Error(error.message);
    }
    out.push(mediaFrom(data as Row));
  }
  return signUrls(out);
}

export async function deleteMedia(m: Media) {
  const sb = supabase();
  const { error } = await sb.from("media").delete().eq("id", m.id);
  if (error) throw new Error(error.message);
  await sb.storage.from(BUCKET).remove([m.path]);
}

/** photos + generated designs for one lead/project, with refresh */
export function useMedia(entity: Media["entity"] | undefined, entityId: string | undefined) {
  const [items, setItems] = React.useState<Media[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    if (!entity || !entityId || !isSupabaseConfigured) return setItems([]);
    setLoading(true);
    try {
      setItems(await listMedia(entity, entityId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [entity, entityId]);
  React.useEffect(() => {
    void load();
    // signed image links last an hour; refresh them before they expire
    const t = setInterval(() => void load(), 50 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);
  return { items, setItems, loading, error, reload: load };
}

export async function downloadImage(url: string, name: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Download failed — the link may have expired. Refresh the page and try again.");
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
