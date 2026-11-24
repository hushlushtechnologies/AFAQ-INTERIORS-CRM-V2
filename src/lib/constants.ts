import type { Module, Permissions, Perm } from "./types";
import type { LeadPriority, LeadSource, LeadStage, Priority, ProjectStatus, PropertyType, QuoteStatus, Role, TaskStatus } from "./types";

export const STAGES: { id: LeadStage; label: string; tone: string; dot: string }[] = [
  { id: "new", label: "New enquiry", tone: "bg-info-soft text-info", dot: "bg-info" },
  { id: "contacted", label: "Contacted", tone: "bg-surface-2 text-ink-2", dot: "bg-ink-3" },
  { id: "requirements", label: "Requirements", tone: "bg-cream/60 text-bronze", dot: "bg-sand" },
  { id: "site_visit", label: "Site visit", tone: "bg-cream/60 text-bronze", dot: "bg-bronze-2" },
  { id: "quotation", label: "Quotation sent", tone: "bg-warning-soft text-warning", dot: "bg-warning" },
  { id: "negotiation", label: "Negotiation", tone: "bg-warning-soft text-warning", dot: "bg-bronze" },
  { id: "won", label: "Won", tone: "bg-success-soft text-success", dot: "bg-success" },
  { id: "lost", label: "Lost", tone: "bg-danger-soft text-danger", dot: "bg-danger" },
];

export const OPEN_STAGES: LeadStage[] = ["new", "contacted", "requirements", "site_visit", "quotation", "negotiation"];

export const stageMeta = (s: LeadStage) => STAGES.find((x) => x.id === s)!;

/** rough win probability per stage, used for weighted pipeline value */
export const STAGE_PROBABILITY: Record<LeadStage, number> = {
  new: 0.05,
  contacted: 0.1,
  requirements: 0.2,
  site_visit: 0.35,
  quotation: 0.5,
  negotiation: 0.7,
  won: 1,
  lost: 0,
};

export const LOST_REASONS = [
  "Budget mismatch",
  "Chose another company",
  "Project postponed",
  "No response",
  "Scope not suitable",
  "Other",
];

export const SOURCES: LeadSource[] = ["Manual entry", "Meta Ads", "Instagram", "Website", "Referral", "Walk-in", "Phone call", "WhatsApp", "Email", "Google"];

export const LEAD_PRIORITY: Record<LeadPriority, { label: string; tone: string }> = {
  low: { label: "Low", tone: "bg-surface-2 text-ink-3" },
  normal: { label: "Normal", tone: "bg-surface-2 text-ink-2" },
  high: { label: "High", tone: "bg-warning-soft text-warning" },
  urgent: { label: "Urgent", tone: "bg-danger-soft text-danger" },
};

export const PROPERTY_TYPES: PropertyType[] = [
  "Villa",
  "Apartment",
  "Penthouse",
  "Townhouse",
  "Office",
  "Retail",
  "Restaurant",
  "Hotel",
];

export const LOCATIONS = [
  "Palm Jumeirah",
  "Dubai Hills Estate",
  "Emirates Hills",
  "Downtown Dubai",
  "Business Bay",
  "Jumeirah Golf Estates",
  "Arabian Ranches",
  "DIFC",
  "Al Barsha",
  "Jumeirah Beach Residence",
  "Dubai Marina",
  "Al Wasl",
  "Mohammed Bin Rashid City",
  "Tilal Al Ghaf",
];

export const STYLES = [
  "Modern luxury",
  "Contemporary Arabic",
  "Japandi",
  "Minimal warm",
  "Classic",
  "Industrial",
  "Coastal",
  "Art deco",
];

export const DEFAULT_QUOTE_TERMS =
  "1. Prices are in UAE Dirhams and valid for the period stated.\n2. Any change in scope will be quoted separately as a variation.\n3. Timelines start from receipt of the advance payment and design sign-off.";
export const DEFAULT_INVOICE_NOTES = "Payment by bank transfer to the account below. Please quote the invoice number as the payment reference.";
export const DEFAULT_TAGLINE = "Interior design · Turnkey fit-out";

export const ROLES: Role[] = [
  "Director",
  "Sales Executive",
  "Project Manager",
  "Interior Designer",
  "Site Engineer",
  "Procurement Officer",
  "Finance Officer",
];

export const PROJECT_STATUS: { id: ProjectStatus; label: string; tone: string }[] = [
  { id: "planning", label: "Planning", tone: "bg-info-soft text-info" },
  { id: "design", label: "Design", tone: "bg-cream/60 text-bronze" },
  { id: "execution", label: "Execution", tone: "bg-warning-soft text-warning" },
  { id: "handover", label: "Handover", tone: "bg-success-soft text-success" },
  { id: "completed", label: "Completed", tone: "bg-success-soft text-success" },
  { id: "on_hold", label: "On hold", tone: "bg-danger-soft text-danger" },
];

export const projectStatusMeta = (s: ProjectStatus) => PROJECT_STATUS.find((x) => x.id === s)!;

export const DEFAULT_PHASES = [
  "Concept & mood board",
  "Detailed design & 3D",
  "Approvals & permits",
  "Procurement",
  "Fit-out & joinery",
  "Styling & handover",
];

export const QUOTE_STATUS: { id: QuoteStatus; label: string; tone: string }[] = [
  { id: "draft", label: "Draft", tone: "bg-surface-2 text-ink-2" },
  { id: "sent", label: "Sent", tone: "bg-info-soft text-info" },
  { id: "accepted", label: "Accepted", tone: "bg-success-soft text-success" },
  { id: "rejected", label: "Rejected", tone: "bg-danger-soft text-danger" },
  { id: "expired", label: "Expired", tone: "bg-warning-soft text-warning" },
];

export const quoteStatusMeta = (s: QuoteStatus) => QUOTE_STATUS.find((x) => x.id === s)!;

export const INVOICE_STATUS_TONE: Record<string, { label: string; tone: string }> = {
  paid: { label: "Paid", tone: "bg-success-soft text-success" },
  partial: { label: "Part-paid", tone: "bg-info-soft text-info" },
  unpaid: { label: "Unpaid", tone: "bg-surface-2 text-ink-2" },
  overdue: { label: "Overdue", tone: "bg-danger-soft text-danger" },
  cancelled: { label: "Cancelled", tone: "bg-surface-2 text-ink-3 line-through" },
};

export const TASK_STATUS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: "todo", label: "To do", dot: "bg-ink-3" },
  { id: "in_progress", label: "In progress", dot: "bg-info" },
  { id: "review", label: "In review", dot: "bg-warning" },
  { id: "done", label: "Done", dot: "bg-success" },
];

export const PRIORITY: Record<Priority, { label: string; tone: string }> = {
  high: { label: "High", tone: "bg-danger-soft text-danger" },
  medium: { label: "Medium", tone: "bg-warning-soft text-warning" },
  low: { label: "Low", tone: "bg-surface-2 text-ink-2" },
};

export const UNITS = ["sqft", "sqm", "lm", "nos", "set", "lot", "item", "hr"];

export const ROOMS = [
  "Living room",
  "Majlis",
  "Dining",
  "Kitchen",
  "Master bedroom",
  "Bedroom 2",
  "Bedroom 3",
  "Bathrooms",
  "Entrance & corridors",
  "Outdoor & terrace",
  "Reception",
  "Workstations",
  "Meeting rooms",
  "Design & management fees",
];

export const COVERS: Record<string, string> = {
  dune: "linear-gradient(135deg,#d2b48c 0%,#9d825d 55%,#674f2d 100%)",
  ivory: "linear-gradient(135deg,#f5f5dc 0%,#e4d5b4 50%,#bfa37a 100%)",
  night: "linear-gradient(135deg,#3a2f25 0%,#1f1913 60%,#674f2d 100%)",
  clay: "linear-gradient(135deg,#e8c8a6 0%,#b9805a 60%,#7a4b2e 100%)",
  sage: "linear-gradient(135deg,#dfe3d2 0%,#a7ae8f 55%,#5f6650 100%)",
  stone: "linear-gradient(135deg,#ece7df 0%,#bdb4a8 55%,#6e655b 100%)",
};

/* ───────── permissions ───────── */

export const MODULES: { id: Module; label: string; description: string; scope?: string }[] = [
  { id: "leads", label: "Leads & pipeline", description: "Enquiries, follow-ups, won/lost", scope: "Only leads they own" },
  { id: "quotes", label: "Quotations", description: "Proposals, versions, pricing" },
  { id: "clients", label: "Clients", description: "Client profiles and contacts" },
  { id: "projects", label: "Projects", description: "Phases, budgets, site log", scope: "Only projects they manage or design" },
  { id: "tasks", label: "Tasks", description: "Team task board", scope: "Only tasks assigned to them" },
  { id: "invoices", label: "Invoices & payments", description: "Billing, receipts, receivables" },
  { id: "studio", label: "AI Studio", description: "Generate design concepts from photos" },
  { id: "team", label: "Team", description: "Staff directory and adding staff" },
  { id: "settings", label: "Settings", description: "Company details, VAT, defaults" },
];

const P = (access: Perm["access"], scope: Perm["scope"] = "all"): Perm => ({ access, scope });

/** mirrors the defaults in supabase/003_permissions.sql */
export const DEFAULT_PERMISSIONS: Permissions = {
  "Sales Executive": { leads: P("edit", "own"), quotes: P("edit"), clients: P("edit"), projects: P("view"), tasks: P("edit", "own"), invoices: P("none"), studio: P("edit"), team: P("view"), settings: P("none") },
  "Project Manager": { leads: P("view"), quotes: P("view"), clients: P("edit"), projects: P("edit", "own"), tasks: P("edit"), invoices: P("view"), studio: P("view"), team: P("view"), settings: P("none") },
  "Interior Designer": { leads: P("view"), quotes: P("view"), clients: P("view"), projects: P("edit", "own"), tasks: P("edit", "own"), invoices: P("none"), studio: P("edit"), team: P("view"), settings: P("none") },
  "Site Engineer": { leads: P("none"), quotes: P("none"), clients: P("view"), projects: P("edit", "own"), tasks: P("edit", "own"), invoices: P("none"), studio: P("none"), team: P("view"), settings: P("none") },
  "Procurement Officer": { leads: P("none"), quotes: P("view"), clients: P("view"), projects: P("view"), tasks: P("edit", "own"), invoices: P("none"), studio: P("none"), team: P("view"), settings: P("none") },
  "Finance Officer": { leads: P("view"), quotes: P("view"), clients: P("view"), projects: P("view"), tasks: P("edit", "own"), invoices: P("edit"), studio: P("none"), team: P("view"), settings: P("edit") },
};
