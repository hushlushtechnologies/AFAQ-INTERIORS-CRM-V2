"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Member } from "@/lib/types";

/* ───────── Button ───────── */
type BtnVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "dark";
type BtnSize = "sm" | "md" | "lg" | "icon";

export function buttonClass(variant: BtnVariant = "primary", size: BtnSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-bronze-2/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
    {
      primary: "bg-bronze text-white shadow-[0_6px_16px_-6px_rgba(103,79,45,0.6)] hover:bg-[#5a4427]",
      dark: "bg-espresso text-cream hover:bg-espresso-2",
      secondary: "bg-surface-2 text-ink hover:bg-cream/60",
      outline: "border border-line-strong bg-surface text-ink hover:border-bronze-2 hover:bg-surface-2/60",
      ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
      danger: "bg-danger text-white hover:bg-[#8c2a27]",
    }[variant],
    {
      sm: "h-8 px-3 text-[13px]",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-[15px]",
      icon: "h-9 w-9 p-0",
    }[size],
    className,
  );
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }
>(({ variant, size, className, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
));
Button.displayName = "Button";

/* ───────── Card ───────── */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...p} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ───────── Badge ───────── */
export function Badge({ className, dot, children }: { className?: string; dot?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap", className ?? "bg-surface-2 text-ink-2")}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

/* ───────── Avatar ───────── */
export function Avatar({ member, name, size = 32, className, ring }: { member?: Member; name?: string; size?: number; className?: string; ring?: boolean }) {
  const n = member?.name ?? name ?? "?";
  if (member?.photo)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={member.photo} alt={n} title={n} width={size} height={size} className={cn("inline-block shrink-0 rounded-full bg-surface-2 object-cover", ring && "ring-2 ring-surface", className)} style={{ width: size, height: size }} />
    );
  return (
    <span
      title={n}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white", ring && "ring-2 ring-surface", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: member?.tone ?? "#9D825D" }}
    >
      {initials(n)}
    </span>
  );
}

export function AvatarStack({ members, size = 28 }: { members: (Member | undefined)[]; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {members.filter(Boolean).map((m) => (
        <Avatar key={m!.id} member={m} size={size} ring />
      ))}
    </div>
  );
}

/* ───────── Form controls ───────── */
const control =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-3 outline-none transition focus:border-bronze-2 focus:ring-4 focus:ring-sand/25 disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(control, "h-10", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, "min-h-[88px] py-2.5 leading-relaxed", className)} {...p} />
));
Textarea.displayName = "Textarea";

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a7d70' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export function Select({ className, children, style, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(control, "h-10 cursor-pointer appearance-none pr-9", className)}
      style={{ backgroundImage: CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "14px", ...style }}
      {...p}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
        {label.endsWith(" *") ? (
          <>
            {label.slice(0, -2)} <span className="text-danger">*</span>
          </>
        ) : (
          label
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

/* ───────── Modal ───────── */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh]">
          <motion.div className="fixed inset-0 bg-espresso/40 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full rounded-3xl border border-line bg-surface shadow-[var(--shadow-float)]"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div>
                <h2 className="font-display text-[22px] font-medium text-ink">{title}</h2>
                {subtitle && <p className="mt-1 text-[13px] text-ink-3">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 rounded-b-3xl border-t border-line bg-surface-2/40 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ───────── Page header ───────── */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-bronze-2">{eyebrow}</p>}
        <h1 className="font-display text-[32px] leading-tight font-medium text-ink md:text-[36px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────── Progress ───────── */
export function Progress({ value, className, tone = "bg-bronze" }: { value: number; className?: string; tone?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <motion.div className={cn("h-full rounded-full", tone)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/* ───────── Segmented control ───────── */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
            value === o.value ? "text-ink" : "text-ink-3 hover:text-ink-2",
          )}
        >
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-lg bg-surface shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ───────── Empty state ───────── */
export function Empty({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-bronze-2">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ───────── Search input ───────── */
export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <svg className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 pl-9" />
    </div>
  );
}

/* ───────── Fade-in wrapper for page content ───────── */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/* ───────── Confirm helper ───────── */
export function useConfirm() {
  const [state, setState] = React.useState<{ title: string; text: string; onYes: () => void } | null>(null);
  const node = (
    <Modal
      open={!!state}
      onClose={() => setState(null)}
      title={state?.title ?? ""}
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={() => setState(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              state?.onYes();
              setState(null);
            }}
          >
            Confirm
          </Button>
        </>
      }
    >
      <p className="text-[14px] text-ink-2">{state?.text}</p>
    </Modal>
  );
  return { confirm: (title: string, text: string, onYes: () => void) => setState({ title, text, onYes }), node };
}
