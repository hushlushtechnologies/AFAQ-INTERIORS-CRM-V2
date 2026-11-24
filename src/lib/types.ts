export type Role =
  | "Director"
  | "Sales Executive"
  | "Project Manager"
  | "Interior Designer"
  | "Site Engineer"
  | "Procurement Officer"
  | "Finance Officer";

export interface Member {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  tone: string; // avatar background
  active: boolean;
  /** free-text job title shown on the profile, e.g. "Accountant". Access still comes from `role`. */
  title?: string;
  /** optional profile photo (small JPEG data URL) */
  photo?: string;
}

export type LeadStage =
  | "new"
  | "contacted"
  | "requirements"
  | "site_visit"
  | "quotation"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "Manual entry"
  | "Instagram"
  | "Meta Ads"
  | "Website"
  | "Referral"
  | "Walk-in"
  | "Google"
  | "WhatsApp"
  | "Phone call"
  | "Email";

export type LeadPriority = "low" | "normal" | "high" | "urgent";

export type PropertyType =
  | "Villa"
  | "Apartment"
  | "Penthouse"
  | "Townhouse"
  | "Office"
  | "Retail"
  | "Restaurant"
  | "Hotel";

export interface Lead {
  id: string;
  ref: string;
  name: string;
  company?: string;
  phone: string;
  altPhone?: string;
  email: string;
  source: LeadSource;
  /** free text, suggestions in PROPERTY_TYPES */
  propertyType: PropertyType | string;
  location: string;
  areaSqft: number;
  budget: number;
  style?: string;
  stage: LeadStage;
  priority?: LeadPriority;
  /** empty = unassigned */
  ownerId: string;
  createdAt: string;
  inquiryDate?: string;
  expectedStart?: string;
  nextFollowUp?: string;
  notes?: string;
  lostReason?: string;
  clientId?: string;
  /** e.g. "Campaign · Ad · Form" for leads from Meta */
  sourceDetail?: string;
  externalId?: string;
}

export type ActivityType = "call" | "meeting" | "site_visit" | "note" | "email" | "stage" | "system";

export interface Activity {
  id: string;
  entity: "lead" | "client" | "project";
  entityId: string;
  type: ActivityType;
  text: string;
  at: string;
  byId: string;
}

export type ClientType = "Residential" | "Commercial" | "Hospitality";

export interface Client {
  id: string;
  ref: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  type: ClientType;
  createdAt: string;
}

export type ProjectStatus = "planning" | "design" | "execution" | "handover" | "completed" | "on_hold";

export interface Phase {
  id: string;
  name: string;
  progress: number; // 0..100
}

export interface Project {
  id: string;
  ref: string;
  name: string;
  clientId: string;
  type: PropertyType;
  location: string;
  value: number;
  budget: number;
  spent: number;
  startDate: string;
  dueDate: string;
  status: ProjectStatus;
  managerId: string;
  designerId: string;
  phases: Phase[];
  cover: string; // gradient key
}

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

export interface QuoteSection {
  id: string;
  room: string;
  items: LineItem[];
}

export interface Milestone {
  id: string;
  label: string;
  pct: number;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface Quote {
  id: string;
  ref: string;
  version: number;
  title: string;
  clientId?: string;
  leadId?: string;
  projectId?: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string;
  sections: QuoteSection[];
  discountPct: number;
  vatPct: number;
  notes: string;
  terms: string;
  milestones: Milestone[];
  preparedById: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: "Bank Transfer" | "Cheque" | "Card" | "Cash";
  reference?: string;
}

export interface Invoice {
  id: string;
  ref: string;
  clientId: string;
  projectId?: string;
  quoteId?: string;
  title: string;
  issueDate: string;
  dueDate: string;
  items: LineItem[];
  vatPct: number;
  payments: Payment[];
  cancelled?: boolean;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  leadId?: string;
  assigneeId: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
}

export interface Settings {
  companyName: string;
  legalName: string;
  trn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  vatPct: number;
  quoteValidityDays: number;
  invoiceDueDays: number;
  aiMonthlyLimit: number;
  currentUserId: string;
  /* optional extras (008_settings_extra.sql) */
  logo?: string;
  tagline?: string;
  bankName?: string;
  bankAccountName?: string;
  bankIban?: string;
  bankSwift?: string;
  quoteTerms?: string;
  invoiceNotes?: string;
}

/* ───────── permissions ───────── */
export type Module = "leads" | "quotes" | "clients" | "projects" | "tasks" | "invoices" | "studio" | "team" | "settings";
export type Access = "none" | "view" | "edit";
export type Scope = "own" | "all";
export interface Perm {
  access: Access;
  scope: Scope;
}
/** per role (Director is always full access and not stored) */
export type Permissions = Record<Exclude<Role, "Director">, Record<Module, Perm>>;
