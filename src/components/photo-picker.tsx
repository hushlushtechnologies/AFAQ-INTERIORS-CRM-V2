"use client";

import * as React from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/ui";

/** square-crops and shrinks a photo to a small JPEG data URL (~15–40 KB) */
export async function photoToDataUrl(file: File, size = 256): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 15_000_000) throw new Error("That photo is too large (max 15 MB).");
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("This photo can’t be read. Please use a JPG or PNG.");
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  // centre crop, nudged up a little so faces aren't cut off
  const sx = (bmp.width - side) / 2;
  const sy = Math.max(0, (bmp.height - side) / 2 - (bmp.height > bmp.width ? side * 0.12 : 0));
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** avatar with "Upload photo" / "Remove" — the photo is optional */
export function PhotoPicker({ member, value, onChange, disabled }: { member: Pick<Member, "name" | "tone">; value?: string; onChange: (v: string | undefined) => void; disabled?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await photoToDataUrl(f));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="flex items-center gap-4">
      <button type="button" disabled={disabled || busy} onClick={() => ref.current?.click()} className="group relative shrink-0 rounded-full" aria-label="Upload photo">
        <Avatar member={{ id: "preview", name: member.name || "?", tone: member.tone, photo: value, role: "Sales Executive", email: "", phone: "", active: true }} size={64} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
        </span>
      </button>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={disabled || busy} onClick={() => ref.current?.click()} className="rounded-lg border border-line-strong px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-bronze-2 disabled:opacity-50">
            {value ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button type="button" disabled={disabled || busy} onClick={() => onChange(undefined)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12.5px] text-ink-3 hover:text-danger">
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-[11.5px] text-ink-3">{err ? <span className="text-danger">{err}</span> : "Optional · JPG or PNG. Without a photo, initials are shown."}</p>
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}
