"use client";

import * as React from "react";
import { ArrowRightLeft, Calendar, Mail, MapPinned, MessageSquare, Phone, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Activity, ActivityType } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, Button, Card, CardHeader, Segmented, Textarea } from "@/components/ui";

const ICON: Record<ActivityType, { icon: React.ElementType; tone: string; label: string }> = {
  call: { icon: Phone, tone: "bg-info-soft text-info", label: "Call" },
  meeting: { icon: Calendar, tone: "bg-cream/70 text-bronze", label: "Meeting" },
  site_visit: { icon: MapPinned, tone: "bg-success-soft text-success", label: "Site visit" },
  note: { icon: MessageSquare, tone: "bg-surface-2 text-ink-2", label: "Note" },
  email: { icon: Mail, tone: "bg-info-soft text-info", label: "Email" },
  stage: { icon: ArrowRightLeft, tone: "bg-warning-soft text-warning", label: "Stage" },
  system: { icon: Sparkles, tone: "bg-surface-2 text-ink-3", label: "System" },
};

export function ActivityFeed({ entity, entityId, title = "Activity", canPost = true }: { entity: Activity["entity"]; entityId: string; title?: string; canPost?: boolean }) {
  const all = useStore((s) => s.activities);
  const members = useStore((s) => s.members);
  const log = useStore((s) => s.logActivity);
  const items = all.filter((a) => a.entity === entity && a.entityId === entityId);
  const [type, setType] = React.useState<"note" | "call" | "meeting" | "site_visit">("note");
  const [text, setText] = React.useState("");

  return (
    <Card>
      <CardHeader title={title} subtitle={`${items.length} ${items.length === 1 ? "entry" : "entries"}`} />
      <div className="px-5 pb-4">
        {canPost && <div className="rounded-2xl border border-line bg-surface-2/40 p-3">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "note", label: "Note" },
              { value: "call", label: "Call" },
              { value: "meeting", label: "Meeting" },
              { value: "site_visit", label: "Site visit" },
            ]}
          />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) {
                log(entity, entityId, type, text.trim());
                setText("");
              }
            }}
            placeholder={type === "call" ? "What was discussed on the call?" : type === "site_visit" ? "Observations, measurements, site conditions…" : "Write an update…"}
            className="mt-3 min-h-[72px] bg-surface"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11.5px] text-ink-3">Ctrl + Enter to post</span>
            <Button
              size="sm"
              disabled={!text.trim()}
              onClick={() => {
                log(entity, entityId, type, text.trim());
                setText("");
              }}
            >
              Log {ICON[type].label.toLowerCase()}
            </Button>
          </div>
        </div>}

        <ol className="relative mt-5 space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
          {items.length === 0 && <li className="py-6 text-center text-[13px] text-ink-3">No activity yet.</li>}
          {items.map((a) => {
            const meta = ICON[a.type];
            const Icon = meta.icon;
            const who = members.find((m) => m.id === a.byId);
            return (
              <li key={a.id} className="relative flex gap-3.5">
                <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", meta.tone)}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 text-[12.5px]">
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      <Avatar member={who} size={18} /> {who?.name ?? "System"}
                    </span>
                    <span className="text-ink-3">· {meta.label} · {timeAgo(a.at)}</span>
                  </div>
                  <p className="mt-1 text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-2">{a.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
