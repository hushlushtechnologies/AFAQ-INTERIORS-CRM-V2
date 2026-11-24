export type FieldData = { name: string; values?: string[] }[];

const PROPERTY_TYPES = ["Villa", "Apartment", "Penthouse", "Townhouse", "Office", "Retail", "Restaurant", "Hotel"];
const pretty = (k: string) => k.replace(/[_?]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
const toNumber = (v: string) => {
  const t = v.toLowerCase().replace(/,/g, "");
  const m = t.match(/(\d+(?:\.\d+)?)\s*(k|m|million|thousand|lakh)?/);
  if (!m) return 0;
  const n = Number(m[1]);
  const mult = m[2]?.startsWith("m") ? 1_000_000 : m[2] === "k" || m[2] === "thousand" ? 1_000 : m[2] === "lakh" ? 100_000 : 1;
  // ranges like "200k-400k": take the upper bound
  const all = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(k|m|million|thousand)?/g)].map((x) => Number(x[1]) * (x[2]?.startsWith("m") ? 1e6 : x[2] ? 1e3 : 1));
  return Math.round(all.length > 1 ? Math.max(...all) : n * mult);
};

/** maps Meta form answers onto CRM lead fields; every answer is also kept in the notes */
export function mapFields(fd: FieldData = []) {
  const get = (k: string) => fd.find((f) => f.name.toLowerCase() === k)?.values?.[0]?.trim() ?? "";
  const out = {
    name: get("full_name") || [get("first_name"), get("last_name")].filter(Boolean).join(" ") || "Meta lead",
    phone: get("phone_number") || get("phone"),
    email: get("email"),
    location: get("city") || "",
    budget: 0,
    areaSqft: 0,
    propertyType: "Villa",
    style: "",
    company: get("company_name") || "",
    notes: [] as string[],
  };
  for (const f of fd) {
    const key = f.name.toLowerCase();
    const val = (f.values ?? []).join(", ").trim();
    if (!val) continue;
    if (["full_name", "first_name", "last_name", "phone_number", "email"].includes(key)) continue;
    out.notes.push(`${pretty(f.name)}: ${val.replace(/_/g, " ")}`);
    if (/budget|price|amount/.test(key)) out.budget = toNumber(val) || out.budget;
    else if (/sq\s*ft|sqft|size|area_size|square/.test(key)) out.areaSqft = toNumber(val) || out.areaSqft;
    else if (/property|type_of|unit_type|space/.test(key)) out.propertyType = PROPERTY_TYPES.find((p) => val.toLowerCase().includes(p.toLowerCase())) ?? out.propertyType;
    else if (/style|design/.test(key)) out.style = val.replace(/_/g, " ");
    else if (/location|community|area|city|address/.test(key) && !out.location) out.location = val.replace(/_/g, " ");
  }
  out.location = out.location.replace(/\b\w/g, (c) => c.toUpperCase());
  out.style = out.style.replace(/^./, (c) => c.toUpperCase());
  return out;
}

