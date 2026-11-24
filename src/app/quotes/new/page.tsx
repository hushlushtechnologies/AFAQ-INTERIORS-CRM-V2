"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { permFor } from "@/lib/perms";

/** Creates a draft (optionally pre-filled from a lead or client) and opens the builder. */
export default function NewQuote() {
  return (
    <React.Suspense>
      <Creator />
    </React.Suspense>
  );
}

function Creator() {
  const router = useRouter();
  const params = useSearchParams();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (done.current) return;
    done.current = true;
    const s = useStore.getState();
    if (permFor(s, "quotes").access !== "edit") return router.replace("/quotes");
    const leadId = params.get("lead") ?? undefined;
    const clientId = params.get("client") ?? undefined;
    const lead = leadId ? s.leads.find((l) => l.id === leadId) : undefined;
    const id = s.newQuote({
      leadId,
      clientId: clientId ?? lead?.clientId,
      title: lead ? [lead.location, lead.propertyType].filter(Boolean).join(" ") + " — Interior Fit-out" : "New quotation",
      preparedById: lead?.ownerId || s.settings.currentUserId,
    });
    router.replace(`/quotes/${id}`);
  }, [params, router]);
  return <p className="py-20 text-center text-[13px] text-ink-3">Preparing a new quotation…</p>;
}
