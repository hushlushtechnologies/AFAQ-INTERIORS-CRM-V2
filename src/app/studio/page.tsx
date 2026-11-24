"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Download, ImagePlus, Loader2, Maximize2, RefreshCcw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePerm } from "@/lib/perms";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { deleteMedia, downloadImage, mediaFrom, uploadPhotos, useMedia, type Media } from "@/lib/media";
import { ROOM_TYPES, STYLE_PRESETS } from "@/lib/ai-prompt";
import { cn, fmtDate, timeAgo } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Empty, Field, PageHeader, Select, Textarea, useConfirm } from "@/components/ui";
import { Lightbox } from "@/components/photos";
import { toast } from "@/components/layout/app-shell";

export default function StudioPage() {
  return (
    <React.Suspense>
      <Studio />
    </React.Suspense>
  );
}

type Usage = { configured?: boolean; used: number; limit: number };

function Studio() {
  const params = useSearchParams();
  const router = useRouter();
  const s = useStore();
  const { canEdit } = usePerm("studio");
  const leadsP = usePerm("leads");
  const projP = usePerm("projects");
  const initial = params.get("lead") ? { entity: "lead" as const, id: params.get("lead")! } : params.get("project") ? { entity: "project" as const, id: params.get("project")! } : null;
  const [target, setTarget] = React.useState<{ entity: "lead" | "project"; id: string } | null>(initial);
  const { items, setItems, loading } = useMedia(target?.entity, target?.id);
  const photos = items.filter((m) => m.kind === "photo");
  const designs = items.filter((m) => m.kind === "generated");
  const [sourceId, setSourceId] = React.useState<string | null>(params.get("photo"));
  const [room, setRoom] = React.useState("Living room");
  const [style, setStyle] = React.useState<string>("Modern luxury");
  const [prompt, setPrompt] = React.useState("");
  const [keepLayout, setKeepLayout] = React.useState(true);
  const [aspect, setAspect] = React.useState("16:9");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<Usage | null>(null);
  const [focus, setFocus] = React.useState<string | null>(null);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const targetRef = React.useRef(target);
  targetRef.current = target;
  const { confirm, node } = useConfirm();

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetch("/api/ai/generate").then((r) => r.json()).then(setUsage).catch(() => undefined);
  }, []);

  // default the reference to the first photo of a newly chosen record
  React.useEffect(() => {
    if (!loading && sourceId === null && photos.length && !params.get("photo")) setSourceId(photos[0]!.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, target?.id]);

  const choose = (v: string) => {
    if (!v) return setTarget(null);
    const [entity, id] = v.split(":") as ["lead" | "project", string];
    setTarget({ entity, id });
    setSourceId(null);
    setFocus(null);
    router.replace(`/studio?${entity}=${id}`);
  };

  const record =
    target?.entity === "lead" ? s.leads.find((l) => l.id === target.id) : target?.entity === "project" ? s.projects.find((p) => p.id === target.id) : undefined;
  const source = items.find((m) => m.id === sourceId);
  const latest = designs.find((d) => d.id === focus) ?? designs[0];
  const latestSource = latest?.sourceId ? items.find((m) => m.id === latest.sourceId) : undefined;
  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null;

  const canGenerate = prompt.trim().length >= 3 || !!style;
  const generate = async () => {
    if (!target || busy || !canGenerate) return;
    const forTarget = target;
    setErr(null);
    setBusy(true);
    try {
      const { data } = await supabase().auth.getSession();
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ entity: target.entity, entityId: target.id, sourceId: source?.id, prompt, style, room, keepLayout, aspect }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          json.error ??
            (res.status === 504 || res.status === 408 ? "The AI took too long to respond. Please try again." : res.status === 413 ? "The reference photo is too large." : "Generation failed. Please try again."),
        );
      setUsage((u) => (u ? { ...u, used: json.used, limit: json.limit } : u));
      // the user may have switched to another lead/project while this was running
      if (targetRef.current?.id !== forTarget.id) return toast("Design saved to the previous record");
      const m: Media = { ...mediaFrom(json.media), url: json.url };
      setItems((x) => [m, ...x]);
      setFocus(m.id);
    } catch (e) {
      const msg = (e as Error).message;
      setErr(/Failed to fetch|NetworkError|Load failed/i.test(msg) ? "Couldn’t reach the server. Check your internet connection and try again." : msg);
    } finally {
      setBusy(false);
    }
  };
  const download = async (m: Media) => {
    if (!m.url) return;
    try {
      await downloadImage(m.url, `afaq-${(record && "name" in record ? record.name : "design").replace(/\W+/g, "-").toLowerCase()}-${m.id.slice(0, 6)}.png`);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const upload = async (files: File[]) => {
    if (!target || !files.length) return;
    setUploading(true);
    try {
      const added = await uploadPhotos(target.entity, target.id, files, s.settings.currentUserId);
      setItems((x) => [...added, ...x]);
      setSourceId(added[0]!.id);
      toast(added.length === 1 ? "Photo uploaded" : `${added.length} photos uploaded`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader eyebrow="Design" title="AI Studio" />
        <Card><Empty icon={<Sparkles size={20} />} title="Connect Supabase to use AI Studio" text="Photos and generated designs are stored in your Supabase project." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Design"
        title="AI Studio"
        description="Turn a client’s room photo into design concepts. Pick the lead or project, choose a photo, describe the look."
        actions={
          usage && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5">
              <div className="w-28">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", remaining! < 10 ? "bg-danger" : "bg-bronze")} style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }} />
                </div>
              </div>
              <p className="text-[12.5px] text-ink-2"><b className="text-ink">{usage.used}</b> / {usage.limit} images this month</p>
            </div>
          )
        }
      />
      {usage && usage.configured === false && (
        <p className="mb-5 rounded-2xl bg-warning-soft px-4 py-3 text-[13px] text-warning">AI Studio needs a Gemini API key on the server (GEMINI_API_KEY). Ask your developer to add it.</p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        {/* ── controls ── */}
        <div className="space-y-5">
          <Card className="p-5">
            <Field label="Client / project">
              <Select value={target ? `${target.entity}:${target.id}` : ""} onChange={(e) => choose(e.target.value)} disabled={busy}>
                <option value="">Choose…</option>
                {leadsP.canView && (
                  <optgroup label="Leads">
                    {s.leads.filter((l) => l.stage !== "lost").map((l) => <option key={l.id} value={`lead:${l.id}`}>{l.name} — {l.propertyType}, {l.location}</option>)}
                  </optgroup>
                )}
                {projP.canView && (
                  <optgroup label="Projects">
                    {s.projects.map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
                  </optgroup>
                )}
              </Select>
            </Field>
            {record && (
              <Link href={target!.entity === "lead" ? `/leads/${record.id}` : `/projects/${record.id}`} className="mt-2 inline-block text-[12.5px] font-medium text-bronze hover:underline">
                Open {target!.entity} →
              </Link>
            )}
          </Card>

          {target && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">Reference photo</p>
                {canEdit && (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-[12.5px] font-medium text-bronze hover:underline disabled:opacity-60">
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} {uploading ? "Uploading…" : "Upload"}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files && void upload([...e.target.files])} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setSourceId("")}
                  className={cn("flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 text-center text-[10.5px] leading-tight text-ink-3 transition", !source ? "border-bronze bg-cream/40 text-bronze" : "border-dashed border-line-strong hover:border-bronze-2")}
                >
                  <Wand2 size={16} /> From scratch
                </button>
                {[...photos, ...designs.filter((d, i) => i < 3 || d.id === sourceId)].map((m) => (
                  <button key={m.id} onClick={() => setSourceId(m.id)} aria-label={m.kind === "generated" ? "Use AI design as reference" : `Use ${m.name ?? "photo"} as reference`} className={cn("relative aspect-square overflow-hidden rounded-xl border-2 transition", sourceId === m.id ? "border-bronze ring-2 ring-sand/50" : "border-transparent hover:border-line-strong")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                    {m.kind === "generated" && <span className="absolute top-1 left-1 rounded bg-espresso/80 px-1 text-[9px] font-semibold text-sand">AI</span>}
                    {sourceId === m.id && <span className="absolute right-1 bottom-1 rounded-full bg-bronze p-0.5 text-white"><Check size={10} /></span>}
                  </button>
                ))}
              </div>
              {!loading && photos.length === 0 && <p className="mt-3 text-[12px] text-ink-3">No photos on this {target.entity} yet. Upload the client’s room photo, or design from scratch.</p>}
            </Card>
          )}

          {target && (
            <Card className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Room">
                  <Select value={room} onChange={(e) => setRoom(e.target.value)}>{ROOM_TYPES.map((r) => <option key={r}>{r}</option>)}</Select>
                </Field>
                {source ? (
                  <Field label="Layout">
                    <Select value={keepLayout ? "keep" : "free"} onChange={(e) => setKeepLayout(e.target.value === "keep")}>
                      <option value="keep">Keep same layout</option>
                      <option value="free">Allow changes</option>
                    </Select>
                  </Field>
                ) : (
                  <Field label="Shape">
                    <Select value={aspect} onChange={(e) => setAspect(e.target.value)}>
                      <option value="16:9">Wide 16:9</option>
                      <option value="4:3">Standard 4:3</option>
                      <option value="1:1">Square</option>
                      <option value="3:4">Portrait 3:4</option>
                      <option value="9:16">Story 9:16</option>
                    </Select>
                  </Field>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium text-ink-2">Style</p>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      title={p.hint}
                      onClick={() => setStyle(style === p.id ? "" : p.id)}
                      className={cn("rounded-full border px-3 py-1.5 text-[12.5px] transition", style === p.id ? "border-bronze bg-bronze text-white" : "border-line-strong text-ink-2 hover:border-bronze-2")}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Describe the design" hint="Materials, colours, furniture, mood — the more specific, the better.">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                  placeholder="e.g. Beige travertine floor, fluted oak TV wall with hidden LED, L-shaped boucle sofa, brass floor lamp, sheer linen curtains, warm evening light"
                  className="min-h-[110px]"
                  onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && !busy && canEdit && void generate()}
                />
              </Field>
              {err && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">{err}</p>}
              {remaining === 0 && <p className="rounded-xl bg-warning-soft px-3 py-2 text-[13px] text-warning">This month’s {usage?.limit} AI images are used up. A Director can raise the limit in Settings.</p>}
              {canEdit && !canGenerate && <p className="text-[12px] text-ink-3">Pick a style or describe the design to generate.</p>}
              {canEdit ? (
                <Button size="lg" className="w-full" disabled={busy || !canGenerate || remaining === 0} onClick={generate}>
                  {busy ? <><Loader2 size={17} className="animate-spin" /> Designing… usually 10–30 seconds</> : <><Sparkles size={17} /> Generate design</>}
                </Button>
              ) : (
                <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-center text-[12.5px] text-ink-3">You can view designs. Generating needs AI Studio edit access.</p>
              )}
            </Card>
          )}
        </div>

        {/* ── results ── */}
        <div className="space-y-5">
          {!target ? (
            <Card><Empty icon={<Sparkles size={20} />} title="Choose a lead or project to start" text="You can also open AI Studio from the ✦ button on any photo in a lead or project." /></Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <AnimatePresence mode="wait">
                  {busy ? (
                    <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sheen flex aspect-video flex-col items-center justify-center gap-3 text-cream">
                      <Sparkles size={28} className="animate-pulse text-sand" />
                      <p className="text-[14px]">Designing your {room.toLowerCase()}…</p>
                      <p className="text-[12px] text-sand/70">{style || "Custom style"}{source ? " · based on the selected photo" : ""}</p>
                    </motion.div>
                  ) : latest ? (
                    <motion.div key={latest.id} initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                      {latestSource?.url && latest.url ? (
                        <Compare before={latestSource.url} after={latest.url} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={latest.url} alt="AI design" className="w-full cursor-zoom-in bg-surface-2" onClick={() => setLightbox(designs.indexOf(latest))} />
                      )}
                      <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {latest.style && <Badge className="bg-cream/60 text-bronze">{latest.style}</Badge>}
                            {latest.room && <Badge>{latest.room}</Badge>}
                            <span className="text-[12px] text-ink-3">{timeAgo(latest.createdAt)}</span>
                          </div>
                          {latest.prompt && <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">{latest.prompt}</p>}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {canEdit && (
                            <Button variant="outline" size="sm" onClick={() => { setSourceId(latest.id); setKeepLayout(true); toast("Using this design as the new reference"); }}>
                              <RefreshCcw size={14} /> Refine
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setLightbox(designs.indexOf(latest))} aria-label="View full size">
                            <Maximize2 size={14} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void download(latest)}>
                            <Download size={14} /> Download
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Empty icon={<Sparkles size={20} />} title="No designs yet" text="Pick a photo and a style, describe the look, and press Generate." />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {designs.length > 0 && (
                <Card className="p-5">
                  <p className="mb-3 text-[13px] font-semibold text-ink">All designs for {record && "name" in record ? record.name : "this record"} <span className="font-normal text-ink-3">· {designs.length}</span></p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                    {designs.map((d, i) => {
                      const by = s.members.find((m) => m.id === d.createdBy);
                      return (
                        <div key={d.id} className={cn("group overflow-hidden rounded-xl border transition", latest?.id === d.id ? "border-bronze" : "border-line hover:border-line-strong")}>
                          <button className="block aspect-video w-full overflow-hidden bg-surface-2" onClick={() => setFocus(d.id)} onDoubleClick={() => setLightbox(i)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={d.url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                          </button>
                          <div className="flex items-center gap-2 px-2.5 py-2">
                            <Avatar member={by} size={18} />
                            <p className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3">{d.style ?? "Custom"} · {fmtDate(d.createdAt, { day: "numeric", month: "short" })}</p>
                            {(d.createdBy === s.settings.currentUserId || s.members.find((m) => m.id === s.settings.currentUserId)?.role === "Director") && (
                              <button
                                onClick={() => confirm("Delete design?", "This AI design is removed for everyone.", async () => {
                                  try {
                                    await deleteMedia(d);
                                    setItems((x) => x.filter((y) => y.id !== d.id));
                                    if (focus === d.id) setFocus(null);
                                  } catch (e) {
                                    toast((e as Error).message);
                                  }
                                })}
                                className="text-ink-3 transition group-hover:opacity-100 hover:text-danger focus:opacity-100 [@media(hover:hover)]:opacity-0"
                                aria-label="Delete design"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
      <Lightbox items={designs} index={lightbox} onIndex={setLightbox} />
      {node}
    </div>
  );
}

/** drag to compare the original photo with the design */
function Compare({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = React.useState(50);
  return (
    <div className="relative select-none bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Design" className="block w-full" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Original" className="h-full w-full object-cover" draggable={false} />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="h-full w-0.5 -translate-x-1/2 bg-white shadow" />
        <div className="absolute top-1/2 left-0 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-espresso shadow-lg">⇆</div>
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">Before</span>
      <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">After</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare before and after" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}
