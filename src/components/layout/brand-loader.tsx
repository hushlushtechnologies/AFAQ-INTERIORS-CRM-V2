"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

const STEPS = ["Securing your session", "Loading leads & pipeline", "Gathering projects & quotations", "Preparing your dashboard"];

/** full-screen branded loader shown while the CRM signs in and loads data */
export function BrandLoader({ label }: { label?: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(STEPS.length - 1, x + 1)), 900);
    return () => clearInterval(t);
  }, []);
  const text = label ?? STEPS[i]!;
  const arch = "M14,92 L14,46 A36,36 0 0 1 86,46 L86,92";
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#17120d]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(210,180,140,0.18),transparent_70%)]" />
      <motion.div
        className="absolute h-[520px] w-[520px] rounded-full border border-sand/10"
        animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.4, 0.15, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-col items-center">
        <div className="relative h-[120px] w-[100px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <path d={arch} fill="none" stroke="#d2b48c" strokeOpacity={0.15} strokeWidth={2} />
            <motion.path
              d={arch}
              fill="none"
              stroke="url(#loaderGold)"
              strokeWidth={2.5}
              strokeLinecap="round"
              initial={{ pathLength: 0, pathOffset: 0 }}
              animate={{ pathLength: [0, 0.65, 0], pathOffset: [0, 0.35, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <defs>
              <linearGradient id="loaderGold" x1="0" x2="1">
                <stop offset="0%" stopColor="#f0d8a8" />
                <stop offset="100%" stopColor="#b98a4c" />
              </linearGradient>
            </defs>
          </svg>
          <motion.div
            className="absolute bottom-[14px] left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-2xl border border-sand/25 bg-gradient-to-br from-[#8a6a3d] to-[#4a371f] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <span className="text-[24px] font-bold text-[#f5ecd9]">A</span>
          </motion.div>
        </div>

        <p className="mt-6 text-[17px] font-semibold tracking-tight text-white">Afaq Al Manzel</p>
        <p className="mt-0.5 text-[10.5px] tracking-[0.3em] text-sand/70 uppercase">Interiors CRM</p>

        <div className="mt-8 h-[3px] w-56 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#e9cf9f] to-transparent"
            animate={{ x: ["-120%", "320%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mt-4 h-5">
          <AnimatePresence mode="wait">
            <motion.p key={text} className="text-[13px] text-sand/80" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {text}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
