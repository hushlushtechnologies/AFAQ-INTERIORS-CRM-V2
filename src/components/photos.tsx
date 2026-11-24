"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Download, ImagePlus, Loader2, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { deleteMedia, downloadImage, uploadPhotos, useMedia, type Media } from "@/lib/media";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { usePerm } from "@/lib/perms";
import { cn, fmtDate } from "@/lib/utils";
import { Card, CardHeader, useConfirm } from "@/components/ui";
import { toast } from "@/components/layout/app-shell";

export function PhotosCard({ entity, entityId, canUpload }: { entity: Media["entity"]; entityId: string; canUpload: boolean }) {
  const me = useStore((s) => s.settings.currentUserId);
  const isDirector = useStore((s) => s.members.find((m) => m.id === s.settings.currentUserId)?.role === "Director");
  const studio = usePerm("studio");
  const { items, setItems, loading, error } = useMedia(entity, entityId);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [open, setOpen] = React.useState<number | null>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const { confirm, node } = useConfirm();
  const photos = items.filter((m) => m.kind === "photo");
  const designs = items.filter((m) => m.kind === "generated");

  const upload = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setBusy(true);
    try {
      const added = await uploadPhotos(entity, entityId, imgs, me);
      setItems((x) => [...added, ...x]);
      toast(`${added.length} photo${added.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <Card>
        <CardHeader title="Room & site photos" />
        <p className="px-5 pb-5 text-[13px] text-ink-3">Photo uploads work once the CRM is connected to Supabase.</p>
      </Card>
    );
  }

  return (
    <Card
      onDragOver={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        setDrag(false);
        void upload([...e.dataTransfer.files]);
      }}
      className={cn("transition", drag && "border-bronze-2 ring-4 ring-sand/30")}
    >
      <CardHeader
        title="Room & site photos"
        subtitle={photos.length ? `${photos.length} photo${photos.length > 1 ? "s" : ""}${designs.length ? ` · ${designs.length} AI design${designs.length > 1 ? "s" : ""}` : ""}` : "Upload the client’s room, site or reference photos"}
        action={
          canUpload ? (
            <button onClick={() => input.current?.click()} disabled={busy} className="flex items-center gap-1.5 text-[12.5px] font-medium text-bronze hover:underline disabled:opacity-60">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {busy ? "Uploading…" : "Upload"}
            </button>
          ) : undefined
        }
      />
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && void upload([...e.target.files])} />
      <div className="px-5 pb-5">
        {error && <p className="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-[12.5px] text-danger">{error}</p>}
        {loading && !items.length ? (
          <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface-2" />)}</div>
        ) : photos.length === 0 ? (
          canUpload ? (
            <button onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-7 text-[13px] text-ink-3 transition hover:border-bronze-2 hover:text-bronze">
              <ImagePlus size={22} />
              Drop photos here or click to upload
            </button>
          ) : (
            <p className="text-[13px] text-ink-3">No photos yet.</p>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((m, i) => (
              <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.name ?? "Photo"} className="h-full w-full cursor-zoom-in object-cover transition duration-300 group-hover:scale-105" onClick={() => setOpen(i)} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                  {studio.canEdit && (
                    <Link href={`/studio?${entity}=${entityId}&photo=${m.id}`} title="Design this room in AI Studio" className="pointer-events-auto rounded-lg bg-white/90 p-1.5 text-bronze hover:bg-white">
                      <Sparkles size={13} />
                    </Link>
                  )}
                  {(m.createdBy === me || isDirector) && (
                    <button
                      title="Delete"
                      onClick={() => confirm("Delete photo?", "The photo is removed for everyone.", async () => {
                        try {
                          await deleteMedia(m);
                          setItems((x) => x.filter((y) => y.id !== m.id));
                        } catch (e) {
                          toast((e as Error).message);
                        }
                      })}
                      className="pointer-events-auto rounded-lg bg-white/90 p-1.5 text-danger hover:bg-white"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canUpload && (
              <button onClick={() => input.current?.click()} className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line-strong text-ink-3 transition hover:border-bronze-2 hover:text-bronze" title="Add photos">
                <ImagePlus size={20} />
              </button>
            )}
          </div>
        )}
        {studio.canView && (photos.length > 0 || designs.length > 0) && (
          <Link href={`/studio?${entity}=${entityId}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-espresso py-2.5 text-[13px] font-medium text-cream transition hover:bg-espresso-2">
            <Sparkles size={14} className="text-sand" /> {designs.length ? `Open AI Studio · ${designs.length} design${designs.length > 1 ? "s" : ""}` : "Create designs in AI Studio"}
          </Link>
        )}
      </div>
      <Lightbox items={photos} index={open} onIndex={setOpen} />
      {node}
    </Card>
  );
}

export function Lightbox({ items, index, onIndex }: { items: Media[]; index: number | null; onIndex: (i: number | null) => void }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (index === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") onIndex(Math.min(items.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [index, items.length, onIndex]);
  if (!mounted) return null;
  const m = index !== null ? items[index] : undefined;
  return createPortal(
    <AnimatePresence>
      {m && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onIndex(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <div className="absolute top-4 right-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {m.url && (
              <button onClick={() => downloadImage(m.url!, `${m.kind === "generated" ? "afaq-design" : "photo"}-${m.id.slice(0, 6)}.${m.kind === "generated" ? "png" : "jpg"}`)} className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Download">
                <Download size={18} />
              </button>
            )}
            <button onClick={() => onIndex(null)} className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {index! > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onIndex(index! - 1); }} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous"><ChevronLeft size={22} /></button>
          )}
          {index! < items.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); onIndex(index! + 1); }} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next"><ChevronRight size={22} /></button>
          )}
          <p className="absolute bottom-5 left-1/2 max-w-2xl -translate-x-1/2 text-center text-[13px] text-white/80">{m.prompt ?? m.name} · {fmtDate(m.createdAt)}</p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
