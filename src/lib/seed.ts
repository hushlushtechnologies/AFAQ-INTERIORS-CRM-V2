import type { Activity, Client, Invoice, Lead, Member, Project, Quote, Settings, Task } from "./types";
import { DEFAULT_PERMISSIONS, DEFAULT_PHASES } from "./constants";
import { dayOffset } from "./utils";

/** Demo data so every screen is populated on first run. "Reset demo data" in Settings restores it. */
export function buildSeed() {
  const d = (n: number) => dayOffset(n);
  const t = (n: number, h = 10) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    x.setHours(h, 15, 0, 0);
    return x.toISOString();
  };

  const members: Member[] = [
    { id: "m1", name: "Aziz Rahman", role: "Director", email: "aziz@afaqalmanzel.ae", phone: "+971 50 210 4411", tone: "#674F2D", active: true },
    { id: "m2", name: "Sara Haddad", role: "Sales Executive", email: "sara@afaqalmanzel.ae", phone: "+971 55 381 2290", tone: "#9D825D", active: true },
    { id: "m3", name: "Omar Farouk", role: "Sales Executive", email: "omar@afaqalmanzel.ae", phone: "+971 52 744 1093", tone: "#7A4B2E", active: true },
    { id: "m4", name: "Lina Karam", role: "Interior Designer", email: "lina@afaqalmanzel.ae", phone: "+971 56 902 3381", tone: "#A7AE8F", active: true },
    { id: "m5", name: "Daniel Pereira", role: "Interior Designer", email: "daniel@afaqalmanzel.ae", phone: "+971 50 118 7720", tone: "#B9805A", active: true },
    { id: "m6", name: "Rashid Al Nuaimi", role: "Project Manager", email: "rashid@afaqalmanzel.ae", phone: "+971 55 600 4128", tone: "#3A2F25", active: true },
    { id: "m7", name: "Vikram Nair", role: "Site Engineer", email: "vikram@afaqalmanzel.ae", phone: "+971 52 339 8812", tone: "#6E655B", active: true },
    { id: "m8", name: "Noura Saleh", role: "Finance Officer", email: "noura@afaqalmanzel.ae", phone: "+971 56 455 0071", tone: "#5F6650", active: true },
    { id: "m9", name: "Joseph Mathew", role: "Procurement Officer", email: "joseph@afaqalmanzel.ae", phone: "+971 50 772 6604", tone: "#BFA37A", active: true },
  ];

  const clients: Client[] = [
    { id: "c1", ref: "CL-1001", name: "Khalid Al Mansoori", phone: "+971 50 555 1201", email: "khalid.m@gmail.com", address: "Frond K, Villa 14", city: "Palm Jumeirah", type: "Residential", createdAt: t(-140) },
    { id: "c2", ref: "CL-1002", name: "Elena Rossi", company: "Rossi Family Office", phone: "+971 55 820 3311", email: "elena@rossifo.com", address: "Gate Village 3, Level 4", city: "DIFC", type: "Commercial", createdAt: t(-120) },
    { id: "c3", ref: "CL-1003", name: "Faisal Qureshi", phone: "+971 52 610 9045", email: "faisal.q@outlook.com", address: "Sidra 2, Villa 88", city: "Dubai Hills Estate", type: "Residential", createdAt: t(-96) },
    { id: "c4", ref: "CL-1004", name: "Maya Thompson", company: "Saffron & Sea Restaurant", phone: "+971 56 210 7788", email: "maya@saffronsea.ae", address: "The Walk, Unit R-12", city: "Jumeirah Beach Residence", type: "Hospitality", createdAt: t(-80) },
    { id: "c5", ref: "CL-1005", name: "Abdullah Bin Sultan", phone: "+971 50 333 9090", email: "a.binsultan@me.com", address: "Sector E, Villa 21", city: "Emirates Hills", type: "Residential", createdAt: t(-60) },
    { id: "c6", ref: "CL-1006", name: "Priya Menon", company: "Lumen Tech FZ-LLC", phone: "+971 55 711 4420", email: "priya@lumentech.io", address: "Bay Square, Building 7, Office 1402", city: "Business Bay", type: "Commercial", createdAt: t(-44) },
    { id: "c7", ref: "CL-1007", name: "Hessa Al Falasi", phone: "+971 52 908 1122", email: "hessa.f@gmail.com", address: "Il Primo, Apt 5402", city: "Downtown Dubai", type: "Residential", createdAt: t(-21) },
  ];

  const P = (names = DEFAULT_PHASES, progress: number[]) =>
    names.map((name, i) => ({ id: `ph${i}`, name, progress: progress[i] ?? 0 }));

  const projects: Project[] = [
    { id: "p1", ref: "PRJ-2401", name: "Frond K Signature Villa", clientId: "c1", type: "Villa", location: "Palm Jumeirah", value: 2_850_000, budget: 2_150_000, spent: 1_420_000, startDate: d(-120), dueDate: d(45), status: "execution", managerId: "m6", designerId: "m4", phases: P(undefined, [100, 100, 100, 85, 55, 0]), cover: "dune" },
    { id: "p2", ref: "PRJ-2402", name: "Rossi Family Office Fit-out", clientId: "c2", type: "Office", location: "DIFC", value: 980_000, budget: 760_000, spent: 702_000, startDate: d(-100), dueDate: d(6), status: "handover", managerId: "m6", designerId: "m5", phases: P(undefined, [100, 100, 100, 100, 100, 70]), cover: "night" },
    { id: "p3", ref: "PRJ-2403", name: "Sidra Family Home", clientId: "c3", type: "Villa", location: "Dubai Hills Estate", value: 1_340_000, budget: 1_020_000, spent: 310_000, startDate: d(-70), dueDate: d(90), status: "design", managerId: "m6", designerId: "m4", phases: P(undefined, [100, 70, 20, 0, 0, 0]), cover: "ivory" },
    { id: "p4", ref: "PRJ-2404", name: "Saffron & Sea — JBR", clientId: "c4", type: "Restaurant", location: "Jumeirah Beach Residence", value: 1_120_000, budget: 880_000, spent: 640_000, startDate: d(-75), dueDate: d(-4), status: "execution", managerId: "m6", designerId: "m5", phases: P(undefined, [100, 100, 100, 100, 72, 10]), cover: "clay" },
    { id: "p5", ref: "PRJ-2405", name: "Emirates Hills Majlis & Pool House", clientId: "c5", type: "Villa", location: "Emirates Hills", value: 1_960_000, budget: 1_480_000, spent: 95_000, startDate: d(-30), dueDate: d(150), status: "planning", managerId: "m6", designerId: "m4", phases: P(undefined, [80, 10, 0, 0, 0, 0]), cover: "sage" },
    { id: "p6", ref: "PRJ-2306", name: "Lumen Tech HQ", clientId: "c6", type: "Office", location: "Business Bay", value: 640_000, budget: 500_000, spent: 498_000, startDate: d(-210), dueDate: d(-60), status: "completed", managerId: "m6", designerId: "m5", phases: P(undefined, [100, 100, 100, 100, 100, 100]), cover: "stone" },
  ];

  const L = (o: Omit<Lead, "id" | "ref"> & { n: number }): Lead => {
    const { n, ...rest } = o;
    return { id: `l${n}`, ref: `LD-${3000 + n}`, ...rest };
  };

  const leads: Lead[] = [
    L({ n: 1, name: "Ahmed Al Zarooni", phone: "+971 50 223 1100", email: "ahmed.z@gmail.com", source: "Meta Ads", propertyType: "Villa", location: "Tilal Al Ghaf", areaSqft: 6200, budget: 900_000, style: "Modern luxury", stage: "new", ownerId: "m2", createdAt: t(0, 9), nextFollowUp: d(0), notes: "Filled lead form from the Majlis reel. Prefers WhatsApp." }),
    L({ n: 2, name: "Rebecca Lawson", phone: "+971 55 401 8822", email: "rebecca.l@icloud.com", source: "Instagram", propertyType: "Apartment", location: "Dubai Marina", areaSqft: 1850, budget: 220_000, style: "Coastal", stage: "new", ownerId: "m3", createdAt: t(-1, 15), nextFollowUp: d(1) }),
    L({ n: 3, name: "Yousef Haddad", company: "Haddad Clinics", phone: "+971 52 667 3301", email: "yousef@haddadclinics.ae", source: "Google", propertyType: "Office", location: "Al Wasl", areaSqft: 4200, budget: 650_000, stage: "contacted", ownerId: "m2", createdAt: t(-4), nextFollowUp: d(-1), notes: "Wants a calm, clinical-but-warm reception. Call back after board meeting." }),
    L({ n: 4, name: "Natalia Ivanova", phone: "+971 56 991 2045", email: "natalia.iv@mail.ru", source: "Referral", propertyType: "Penthouse", location: "Downtown Dubai", areaSqft: 5400, budget: 1_400_000, style: "Art deco", stage: "contacted", ownerId: "m3", createdAt: t(-6), nextFollowUp: d(2), notes: "Referred by Khalid Al Mansoori." }),
    L({ n: 5, name: "Mariam Al Shamsi", phone: "+971 50 812 7766", email: "mariam.s@gmail.com", source: "Instagram", propertyType: "Townhouse", location: "Arabian Ranches", areaSqft: 3100, budget: 380_000, style: "Japandi", stage: "requirements", ownerId: "m2", createdAt: t(-9), nextFollowUp: d(1), notes: "4BR + maid. Ground floor and kitchen only in phase 1." }),
    L({ n: 6, name: "Tom Whitaker", company: "Whitaker & Co", phone: "+971 55 230 4419", email: "tom@whitaker.co", source: "Website", propertyType: "Office", location: "Business Bay", areaSqft: 2800, budget: 420_000, stage: "requirements", ownerId: "m3", createdAt: t(-11), nextFollowUp: d(3) }),
    L({ n: 7, name: "Sheikha Al Maktoum", phone: "+971 50 100 2020", email: "office.sam@gmail.com", source: "Referral", propertyType: "Villa", location: "Mohammed Bin Rashid City", areaSqft: 14_500, budget: 4_200_000, style: "Contemporary Arabic", stage: "site_visit", priority: "high", ownerId: "m1", createdAt: t(-14), nextFollowUp: d(0), notes: "Site visit with Lina on Thursday 11am. Bring stone & fabric samples." }),
    L({ n: 8, name: "Karan Malhotra", phone: "+971 52 448 9000", email: "karan.m@gmail.com", source: "Meta Ads", propertyType: "Villa", location: "Jumeirah Golf Estates", areaSqft: 5600, budget: 760_000, style: "Minimal warm", stage: "site_visit", ownerId: "m2", createdAt: t(-16), nextFollowUp: d(-2) }),
    L({ n: 9, name: "Hessa Al Falasi", phone: "+971 52 908 1122", email: "hessa.f@gmail.com", source: "Instagram", propertyType: "Apartment", location: "Downtown Dubai", areaSqft: 2400, budget: 360_000, style: "Japandi", stage: "quotation", ownerId: "m3", createdAt: t(-21), nextFollowUp: d(2), clientId: "c7" }),
    L({ n: 10, name: "Grand Oasis Hotel", company: "Oasis Hospitality LLC", phone: "+971 4 330 1200", email: "projects@oasishosp.ae", source: "Referral", propertyType: "Hotel", location: "Al Barsha", areaSqft: 22_000, budget: 3_600_000, stage: "negotiation", priority: "urgent", ownerId: "m1", createdAt: t(-38), nextFollowUp: d(1), notes: "Lobby + 40 keys refresh. Procurement asked for 4% discount." }),
    L({ n: 11, name: "Abdullah Bin Sultan", phone: "+971 50 333 9090", email: "a.binsultan@me.com", source: "Referral", propertyType: "Villa", location: "Emirates Hills", areaSqft: 9800, budget: 1_960_000, stage: "won", ownerId: "m1", createdAt: t(-62), clientId: "c5" }),
    L({ n: 12, name: "Priya Menon", company: "Lumen Tech FZ-LLC", phone: "+971 55 711 4420", email: "priya@lumentech.io", source: "Website", propertyType: "Office", location: "Business Bay", areaSqft: 6000, budget: 640_000, stage: "won", ownerId: "m3", createdAt: t(-230), clientId: "c6" }),
    L({ n: 13, name: "Chris Evans", phone: "+971 56 120 3344", email: "chris.e@yahoo.com", source: "Google", propertyType: "Apartment", location: "Dubai Marina", areaSqft: 1200, budget: 90_000, stage: "lost", ownerId: "m2", createdAt: t(-30), lostReason: "Budget mismatch" }),
    L({ n: 14, name: "Fatima Noor", phone: "+971 50 909 1818", email: "fatima.noor@gmail.com", source: "WhatsApp", propertyType: "Villa", location: "Al Barsha", areaSqft: 4800, budget: 520_000, style: "Classic", stage: "quotation", ownerId: "m2", createdAt: t(-19), nextFollowUp: d(-3), notes: "Quote sent; waiting on husband's approval." }),
    L({ n: 15, name: "Zest Café", company: "Zest F&B", phone: "+971 4 220 9988", email: "hello@zestcafe.ae", source: "Walk-in", propertyType: "Restaurant", location: "Al Wasl", areaSqft: 1600, budget: 280_000, stage: "new", ownerId: "", createdAt: t(-2), nextFollowUp: d(0) }),
  ];

  const S = (room: string, items: [string, number, string, number][]) => ({
    id: `s-${room}-${Math.random().toString(36).slice(2, 6)}`,
    room,
    items: items.map(([description, qty, unit, rate], i) => ({ id: `i${i}-${Math.random().toString(36).slice(2, 6)}`, description, qty, unit, rate })),
  });

  const stdTerms =
    "1. Prices are in UAE Dirhams and valid for the period stated.\n2. Any change in scope will be quoted separately as a variation.\n3. Timelines start from receipt of the advance payment and design sign-off.\n4. Materials are subject to availability; equivalent alternatives will be proposed for approval.\n5. Authority approvals and NOC fees are excluded unless listed.";
  const stdMilestones = [
    { id: "ms1", label: "Advance on signing", pct: 40 },
    { id: "ms2", label: "On design approval & procurement", pct: 30 },
    { id: "ms3", label: "On fit-out completion", pct: 25 },
    { id: "ms4", label: "On handover", pct: 5 },
  ];

  const quotes: Quote[] = [
    {
      id: "q1", ref: "QT-2026-041", version: 2, title: "Il Primo Apartment — Full Interior", clientId: "c7", leadId: "l9", status: "sent", issueDate: d(-6), validUntil: d(24), discountPct: 3, vatPct: 5, preparedById: "m3",
      notes: "Revision 2 swaps marble flooring in living areas for large-format porcelain to bring the total within budget.",
      terms: stdTerms, milestones: stdMilestones,
      sections: [
        S("Living room", [["Large-format porcelain flooring 120x120, supply & install", 640, "sqft", 68], ["Feature wall — fluted oak panelling with LED cove", 1, "lot", 24_500], ["Custom sofa, 3.2m boucle", 1, "nos", 18_900], ["Curtains & motorised sheers", 2, "set", 7_400]]),
        S("Kitchen", [["Handleless kitchen cabinets, matte lacquer", 14, "lm", 3_950], ["Quartz countertop & splashback", 1, "lot", 16_800]]),
        S("Master bedroom", [["Upholstered bed wall with integrated lighting", 1, "lot", 21_000], ["Walk-in wardrobe, oak veneer", 1, "lot", 34_500]]),
        S("Design & management fees", [["Interior design, 3D visualisation & project management", 1, "lot", 38_000]]),
      ],
    },
    {
      id: "q2", ref: "QT-2026-044", version: 1, title: "Grand Oasis — Lobby & Guest Floor Refresh", leadId: "l10", status: "sent", issueDate: d(-12), validUntil: d(18), discountPct: 0, vatPct: 5, preparedById: "m1",
      notes: "Includes mock-up room for approval before rollout.", terms: stdTerms, milestones: stdMilestones,
      sections: [
        S("Reception", [["Reception desk — travertine & brass", 1, "nos", 148_000], ["Lobby lounge furniture package", 1, "lot", 386_000], ["Feature chandelier", 1, "nos", 92_000]]),
        S("Guest rooms (40 keys)", [["Guest room soft refurbishment package", 40, "nos", 46_500]]),
        S("Design & management fees", [["Design, FF&E specification & PM", 1, "lot", 210_000]]),
      ],
    },
    {
      id: "q3", ref: "QT-2026-038", version: 1, title: "Emirates Hills Majlis & Pool House", clientId: "c5", leadId: "l11", projectId: "p5", status: "accepted", issueDate: d(-40), validUntil: d(-10), discountPct: 2, vatPct: 5, preparedById: "m1",
      notes: "", terms: stdTerms, milestones: stdMilestones,
      sections: [
        S("Majlis", [["Gypsum ceiling with recessed coffer", 1_100, "sqft", 85], ["Majlis seating, bespoke", 1, "set", 165_000], ["Carved timber screens", 6, "nos", 14_800]]),
        S("Outdoor & terrace", [["Pool house joinery & kitchenette", 1, "lot", 286_000], ["Pergola with louvred roof", 1, "nos", 178_000], ["Landscape lighting", 1, "lot", 96_000]]),
        S("Design & management fees", [["Design & project management", 1, "lot", 240_000]]),
      ],
    },
    {
      id: "q4", ref: "QT-2026-045", version: 1, title: "Al Barsha Villa — Ground Floor", leadId: "l14", status: "draft", issueDate: d(-1), validUntil: d(29), discountPct: 0, vatPct: 5, preparedById: "m2",
      notes: "", terms: stdTerms, milestones: stdMilestones,
      sections: [S("Majlis", [["Majlis seating, classic", 1, "set", 92_000], ["Wall panelling", 420, "sqft", 140]]), S("Dining", [["Dining table, 10 seater", 1, "nos", 38_000]])],
    },
  ];

  const invoices: Invoice[] = [
    { id: "i1", ref: "INV-2026-112", clientId: "c1", projectId: "p1", title: "Frond K Villa — Milestone 2 (Procurement)", issueDate: d(-35), dueDate: d(-5), vatPct: 5, items: [{ id: "a", description: "Milestone 2 — 30% of contract value", qty: 1, unit: "lot", rate: 855_000 }], payments: [{ id: "pa", date: d(-20), amount: 500_000, method: "Bank Transfer", reference: "ENBD-77812" }] },
    { id: "i2", ref: "INV-2026-118", clientId: "c2", projectId: "p2", title: "Rossi Family Office — Milestone 3", issueDate: d(-18), dueDate: d(12), vatPct: 5, items: [{ id: "a", description: "Milestone 3 — fit-out completion (25%)", qty: 1, unit: "lot", rate: 245_000 }], payments: [] },
    { id: "i3", ref: "INV-2026-104", clientId: "c4", projectId: "p4", title: "Saffron & Sea — Advance", issueDate: d(-70), dueDate: d(-55), vatPct: 5, items: [{ id: "a", description: "Advance payment — 40%", qty: 1, unit: "lot", rate: 448_000 }], payments: [{ id: "pb", date: d(-60), amount: 470_400, method: "Cheque", reference: "CHQ 004512" }] },
    { id: "i4", ref: "INV-2026-121", clientId: "c5", projectId: "p5", title: "Emirates Hills — Advance on signing", issueDate: d(-8), dueDate: d(7), vatPct: 5, items: [{ id: "a", description: "Advance — 40% of contract value", qty: 1, unit: "lot", rate: 784_000 }], payments: [{ id: "pc", date: d(-2), amount: 400_000, method: "Bank Transfer", reference: "FAB-55190" }] },
    { id: "i5", ref: "INV-2026-097", clientId: "c6", projectId: "p6", title: "Lumen Tech HQ — Final retention", issueDate: d(-58), dueDate: d(-28), vatPct: 5, items: [{ id: "a", description: "Handover retention — 5%", qty: 1, unit: "lot", rate: 32_000 }], payments: [{ id: "pd", date: d(-27), amount: 33_600, method: "Bank Transfer" }] },
    { id: "i6", ref: "INV-2026-123", clientId: "c3", projectId: "p3", title: "Sidra Family Home — Design stage", issueDate: d(-3), dueDate: d(27), vatPct: 5, items: [{ id: "a", description: "Design development & 3D visualisation", qty: 1, unit: "lot", rate: 96_000 }], payments: [] },
  ];

  const T = (n: number, title: string, assigneeId: string, due: number, priority: Task["priority"], status: Task["status"], extra: Partial<Task> = {}): Task => ({
    id: `t${n}`, title, assigneeId, dueDate: d(due), priority, status, createdAt: t(-10 + (n % 7)), ...extra,
  });

  const tasks: Task[] = [
    T(1, "Finalise joinery shop drawings — master suite", "m4", 1, "high", "in_progress", { projectId: "p1" }),
    T(2, "Confirm marble slab selection with client", "m6", 0, "high", "todo", { projectId: "p1" }),
    T(3, "Snag list walk-through", "m7", 2, "medium", "todo", { projectId: "p2" }),
    T(4, "Issue handover dossier & warranties", "m6", 5, "medium", "todo", { projectId: "p2" }),
    T(5, "Kitchen extraction hood — chase supplier delivery", "m9", -2, "high", "in_progress", { projectId: "p4" }),
    T(6, "Mood board v2 — Sidra family room", "m4", 3, "medium", "review", { projectId: "p3" }),
    T(7, "Submit DM fit-out permit drawings", "m6", 6, "high", "todo", { projectId: "p3" }),
    T(8, "Concept presentation — Majlis options A/B", "m4", 4, "medium", "in_progress", { projectId: "p5" }),
    T(9, "Call Yousef Haddad re: clinic brief", "m2", -1, "medium", "todo", { leadId: "l3" }),
    T(10, "Prepare samples for MBR City site visit", "m4", 0, "high", "todo", { leadId: "l7" }),
    T(11, "Revise Grand Oasis quote with 4% discount option", "m1", 1, "high", "in_progress", { leadId: "l10" }),
    T(12, "Follow up Fatima Noor on quotation", "m2", -3, "medium", "todo", { leadId: "l14" }),
    T(13, "Reconcile October supplier payments", "m8", 2, "medium", "in_progress"),
    T(14, "Chase INV-2026-112 balance", "m8", 0, "high", "todo", { projectId: "p1" }),
    T(15, "Lighting fixture schedule sign-off", "m5", -1, "medium", "done", { projectId: "p4" }),
    T(16, "Update portfolio photos — Lumen Tech HQ", "m5", 8, "low", "todo", { projectId: "p6" }),
  ];

  const A = (n: number, entity: Activity["entity"], entityId: string, type: Activity["type"], text: string, at: string, byId: string): Activity => ({ id: `a${n}`, entity, entityId, type, text, at, byId });

  const activities: Activity[] = [
    A(1, "lead", "l1", "system", "Lead captured from Meta Ads form", t(0, 9), "m2"),
    A(2, "lead", "l3", "call", "Spoke to Yousef — wants proposal for reception + 6 consult rooms. Call back next week.", t(-3, 11), "m2"),
    A(3, "lead", "l7", "meeting", "Intro meeting at office. Discussed scope for whole villa, ~14,500 sqft.", t(-10, 16), "m1"),
    A(4, "lead", "l7", "stage", "Moved to Site visit", t(-8, 10), "m1"),
    A(5, "lead", "l9", "email", "Sent revision 2 of quotation QT-2026-041", t(-6, 14), "m3"),
    A(6, "lead", "l10", "meeting", "Negotiation meeting with procurement head. Requested 4% discount and 60-day credit.", t(-2, 15), "m1"),
    A(7, "project", "p1", "site_visit", "Site inspection: ceiling works 90% complete, joinery install starts Monday.", t(-1, 9), "m7"),
    A(8, "project", "p4", "note", "Kitchen hood delayed at port — supplier ETA +5 days. Opening date at risk.", t(-2, 17), "m9"),
    A(9, "project", "p2", "note", "Client walk-through done. Minor snags on glass partition seals.", t(-1, 12), "m6"),
    A(10, "lead", "l14", "call", "Fatima asked for payment plan options. Sent milestone breakdown on WhatsApp.", t(-4, 13), "m2"),
    A(11, "lead", "l5", "meeting", "Requirements session — Japandi, light oak, kitchen island must seat 4.", t(-5, 16), "m2"),
    A(12, "project", "p3", "note", "Client approved concept direction; 3D renders in progress.", t(-3, 10), "m4"),
  ];

  const settings: Settings = {
    companyName: "Afaq Al Manzel Interiors",
    legalName: "Afaq Al Manzel Interiors L.L.C",
    trn: "100XXXXXXXXXXX3",
    address: "Office 1204, Bay Square 6, Business Bay, Dubai, UAE",
    phone: "+971 4 000 0000",
    email: "hello@afaqalmanzel.ae",
    website: "afaqalmanzel.ae",
    currency: "AED",
    vatPct: 5,
    quoteValidityDays: 30,
    invoiceDueDays: 15,
    aiMonthlyLimit: 100,
    currentUserId: "m1",
    tagline: "Interior design · Turnkey fit-out",
    bankName: "Emirates NBD",
    bankAccountName: "Afaq Al Manzel Interiors L.L.C",
    bankIban: "AE00 0000 0000 0000 0000 000",
    bankSwift: "EBILAEAD",
  };

  addHistory({ members, clients, projects, leads, invoices, activities, tasks });
  const permissions = structuredClone(DEFAULT_PERMISSIONS);

  return { members, clients, projects, leads, quotes, invoices, tasks, activities, settings, permissions };
}

/* ───────── six months of history so the dashboard charts have shape ───────── */

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function addHistory(x: { members: Member[]; clients: Client[]; projects: Project[]; leads: Lead[]; invoices: Invoice[]; activities: Activity[]; tasks: Task[] }) {
  const r = rng(7);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  const iso = (daysAgo: number, h = 11) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, Math.floor(r() * 59), 0, 0);
    return d.toISOString();
  };
  const day = (daysAgo: number) => iso(daysAgo).slice(0, 10);
  const sales = ["m2", "m3", "m1"];
  const names = ["Rania Khoury", "James Carter", "Aisha Al Hammadi", "Vikash Patel", "Sophie Laurent", "Hamad Al Ketbi", "Lena Fischer", "Mohammed Rafi", "Claire Dubois", "Saeed Al Mazrouei", "Anita Desai", "Daniel Kim", "Noor Al Huda", "Peter Novak", "Layla Saeed", "Tariq Aziz", "Emma Wilson", "Faris Al Amiri", "Grace Liu", "Rashed Lootah", "Isabel Santos", "Kareem Nasser", "Olga Petrova", "Sami Haddad"];
  const srcW: [Lead["source"], number][] = [["Meta Ads", 34], ["Instagram", 22], ["Referral", 16], ["Website", 12], ["Walk-in", 6], ["Google", 6], ["WhatsApp", 4]];
  const src = () => {
    let t = r() * 100;
    for (const [k, w] of srcW) if ((t -= w) <= 0) return k;
    return "Meta Ads";
  };
  const types = ["Villa", "Apartment", "Penthouse", "Townhouse", "Office"] as const;
  const locs = ["Dubai Hills Estate", "Palm Jumeirah", "Arabian Ranches", "Business Bay", "Jumeirah Village Circle", "Damac Hills", "Al Barsha", "Dubai Marina", "Mirdif"];
  let n = 100;
  // past leads, mostly closed
  for (let i = 0; i < names.length * 3; i++) {
    const ago = 25 + Math.floor(r() * 330);
    const roll = r();
    const stage: Lead["stage"] = roll < 0.32 ? "won" : roll < 0.78 ? "lost" : pick(["contacted", "requirements", "quotation"] as const);
    const source = src();
    x.leads.push({
      id: `hl${i}`, ref: `LD-${2800 + n++}`, name: names[i % names.length]!, phone: `+9715${Math.floor(10000000 + r() * 89999999)}`, email: "",
      source, propertyType: pick(types), location: pick(locs), areaSqft: 1200 + Math.floor(r() * 6000), budget: Math.round((150 + r() * 1400) / 10) * 10000,
      stage, priority: "normal", ownerId: pick(sales), createdAt: iso(ago), inquiryDate: day(ago),
      lostReason: stage === "lost" ? pick(["Budget mismatch", "Chose another company", "Project postponed", "No response"]) : undefined,
      sourceDetail: source === "Meta Ads" ? "Villa Makeover · Majlis Reel · Form: Free consultation" : undefined, externalId: source === "Meta Ads" || source === "Instagram" ? `hist-${i}` : undefined,
    });
  }
  // a few recent ones so the last weeks are not empty
  for (let i = 0; i < 9; i++) {
    const ago = Math.floor(r() * 24) + 1;
    const source = src();
    x.leads.push({
      id: `rl${i}`, ref: `LD-${2800 + n++}`, name: pick(names), phone: `+9715${Math.floor(10000000 + r() * 89999999)}`, email: "", source, propertyType: pick(types), location: pick(locs),
      areaSqft: 1500 + Math.floor(r() * 4000), budget: Math.round((180 + r() * 900) / 10) * 10000, stage: pick(["new", "contacted", "requirements", "site_visit"] as const), priority: "normal",
      ownerId: pick(sales), createdAt: iso(ago), inquiryDate: day(ago), nextFollowUp: day(-Math.floor(r() * 6)), externalId: source === "Meta Ads" ? `rec-${i}` : undefined,
    });
  }
  // completed / older projects with monthly billing
  const past = [
    { name: "Al Furjan Villa", type: "Villa", loc: "Al Furjan", value: 690_000, ago: 345 },
    { name: "Silicon Oasis Clinic", type: "Office", loc: "Dubai Silicon Oasis", value: 480_000, ago: 300 },
    { name: "Jumeirah Islands Mansion", type: "Villa", loc: "Jumeirah Islands", value: 1_960_000, ago: 262 },
    { name: "City Walk Boutique", type: "Retail", loc: "City Walk", value: 390_000, ago: 225 },
    { name: "Jumeirah Golf Villa", type: "Villa", loc: "Jumeirah Golf Estates", value: 1_450_000, ago: 175 },
    { name: "Bay Square Showroom", type: "Retail", loc: "Business Bay", value: 520_000, ago: 160 },
    { name: "Marina Penthouse 4402", type: "Penthouse", loc: "Dubai Marina", value: 1_180_000, ago: 140 },
    { name: "Mirdif Family Villa", type: "Villa", loc: "Mirdif", value: 760_000, ago: 118 },
    { name: "DIFC Law Office", type: "Office", loc: "DIFC", value: 610_000, ago: 92 },
    { name: "Damac Hills Townhouse", type: "Townhouse", loc: "Damac Hills", value: 430_000, ago: 64 },
    { name: "Creek Harbour Apartment", type: "Apartment", loc: "Dubai Creek Harbour", value: 345_000, ago: 21 },
    { name: "Al Barari Garden Villa", type: "Villa", loc: "Al Barari", value: 1_240_000, ago: 9 },
  ] as const;
  past.forEach((p, i) => {
    const cid = `hc${i}`;
    x.clients.push({ id: cid, ref: `CL-${1100 + i}`, name: names[(i * 5 + 1) % names.length]!, phone: `+971 5${[0, 2, 5, 6][i % 4]} ${String(310 + i * 37).slice(-3)} ${String(4021 + i * 613).slice(-4)}`, email: "", address: "", city: p.loc, type: p.type === "Office" || p.type === "Retail" ? "Commercial" : "Residential", createdAt: iso(p.ago + 10) });
    const done = p.ago > 110;
    const fresh = p.ago < 30;
    x.projects.push({
      id: `hp${i}`, ref: `PRJ-23${10 + i}`, name: p.name, clientId: cid, type: p.type as Project["type"], location: p.loc, value: p.value, budget: Math.round(p.value * 0.76), spent: Math.round(p.value * (done ? 0.74 : fresh ? 0.04 : 0.45)),
      startDate: day(p.ago), dueDate: day(p.ago - 120), status: done ? "completed" : fresh ? (p.ago < 15 ? "planning" : "design") : p.ago > 80 ? "handover" : "execution", managerId: "m6", designerId: i % 2 ? "m4" : "m5",
      phases: DEFAULT_PHASES.map((name, k) => ({ id: `hph${i}${k}`, name, progress: done ? 100 : fresh ? (k === 0 ? (p.ago < 15 ? 40 : 90) : k === 1 && p.ago >= 15 ? 25 : 0) : Math.max(0, Math.min(100, 100 - k * 18 - (p.ago < 80 ? 25 : 0))) })), cover: ["stone", "clay", "night", "ivory", "sage", "dune"][i % 6]!,
    });
    // milestone invoices roughly monthly, paid ~2-3 weeks later
    [40, 30, 25, 5].forEach((pctv, k) => {
      const issued = p.ago - k * 32;
      if (issued < 3) return;
      const amount = Math.round((p.value * pctv) / 100);
      const paidAgo = issued - 12 - Math.floor(r() * 14);
      x.invoices.push({
        id: `hi${i}${k}`, ref: `INV-H${i}${k}`, clientId: cid, projectId: `hp${i}`, title: `${p.name} — Milestone ${k + 1}`, issueDate: day(issued), dueDate: day(issued - 15), vatPct: 5,
        items: [{ id: `hii${i}${k}`, description: `Milestone ${k + 1} — ${pctv}%`, qty: 1, unit: "lot", rate: amount }],
        payments: paidAgo > 0 ? [{ id: `hpay${i}${k}`, date: day(paidAgo), amount: Math.round(amount * 1.05), method: "Bank Transfer" }] : [],
      });
    });
  });
  // number the history invoices like real ones: INV-<year>-<seq>, oldest first
  const perYear = new Map<string, number>();
  x.invoices
    .filter((v) => v.id.startsWith("hi"))
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
    .forEach((v) => {
      const y = v.issueDate.slice(0, 4);
      const n = (perYear.get(y) ?? 0) + 1;
      perYear.set(y, n);
      v.ref = `INV-${y}-${String(n).padStart(3, "0")}`;
    });
  // daily team rhythm for the heatmap
  const kinds = ["call", "call", "note", "meeting", "site_visit", "email"] as const;
  const texts = { call: "Follow-up call with client", note: "Updated client brief", meeting: "Design review meeting", site_visit: "Site visit & measurements", email: "Sent revised drawings" };
  const leadIds = x.leads.map((l) => l.id);
  for (let ago = 1; ago < 84; ago++) {
    const dow = new Date(Date.now() - ago * 86_400_000).getDay();
    const count = dow === 5 ? Math.floor(r() * 2) : Math.floor(r() * 6) + (dow === 1 || dow === 2 ? 2 : 0);
    for (let k = 0; k < count; k++) {
      const type = pick(kinds);
      x.activities.push({ id: `ha${ago}-${k}`, entity: "lead", entityId: pick(leadIds), type, text: texts[type], at: iso(ago, 9 + Math.floor(r() * 8)), byId: pick(["m1", "m2", "m3", "m4", "m6", "m7"]) });
    }
  }
  x.activities.sort((a, b) => b.at.localeCompare(a.at));
}
