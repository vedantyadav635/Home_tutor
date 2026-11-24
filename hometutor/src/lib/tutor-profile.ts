import "server-only";
import { z } from "zod";
import { BOARDS, CLASS_BANDS, DAYS, LANGUAGES, MODES, SUBJECTS, TIME_SLOTS } from "@/lib/options";
import { PROFILE_COLUMNS, toOwnTutorProfile } from "@/lib/mappers";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// ---------- Parsers the frontend may rely on ----------

/** "2019–now · Home tutor · 60 students, 14 scored 90%+" (one job per line) -> [{ period, title, details }] */
export function parseExperienceLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*[·|]\s*/).filter(Boolean);
      if (parts.length === 1) return { period: null, title: parts[0], details: null };
      const hasPeriod = /\d/.test(parts[0]);
      if (parts.length === 2)
        return hasPeriod ? { period: parts[0], title: parts[1], details: null } : { period: null, title: parts[0], details: parts[1] };
      return hasPeriod
        ? { period: parts[0], title: parts[1], details: parts.slice(2).join(" · ") }
        : { period: null, title: parts[0], details: parts.slice(1).join(" · ") };
    });
}

/** "₹4,000 / month" -> { amount: 4000, unit: "month" }; anything else -> nulls. */
export function parseFee(text: string | null) {
  const m = text?.match(/([\d,]+)\s*(?:\/|per)\s*(hour|hr|month|mo)\b/i);
  if (!m) return { amount: null, unit: null };
  return { amount: Number(m[1].replace(/,/g, "")), unit: m[2].toLowerCase().startsWith("h") ? "hour" : "month" } as const;
}

// ---------- Body schema (every field optional = draft save) ----------

const text = (max: number) =>
  z.string().trim().max(max).transform((s) => s || null).nullable().optional();
const list = <T extends readonly [string, ...string[]]>(values: T, max = 20) =>
  z.array(z.enum(values)).max(max).transform((a) => [...new Set(a)]).optional();
const bandValues = CLASS_BANDS.map((b) => b.value) as [string, ...string[]];
const slot = z.string().transform((s) => s.trim().toLowerCase()).pipe(z.enum(TIME_SLOTS));

const ExperienceItem = z.object({
  period: text(50),
  title: z.string().trim().min(1, "Add a title for each job.").max(200),
  details: text(1000),
});

export const ProfileBody = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(100).optional(),
  qualification: text(200),
  yearsExperience: z
    .preprocess((v) => (v === "" ? null : typeof v === "string" ? Number(v) : v), z.number().int().min(0).max(60).nullable())
    .optional(),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\+?\d{10,13}$/, "Enter a 10-digit mobile number.")]))
    .transform((s) => s || null)
    .nullable()
    .optional(),
  city: text(100),
  area: text(100),
  travelRange: text(100),
  subjects: list(SUBJECTS),
  classBands: list(bandValues),
  boards: list(BOARDS),
  modes: list(MODES),
  languages: list(LANGUAGES),
  bio: text(300),
  methodology: text(2000),
  // Either the textarea text (one job per line) or a list of objects.
  experience: z.union([z.string().max(5000).transform(parseExperienceLines), z.array(ExperienceItem)]).pipe(z.array(z.any()).max(20)).optional(),
  // Either the textarea text (one item per line) or a list of strings.
  education: z
    .union([z.string().max(5000).transform((s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)), z.array(z.string().trim().min(1))])
    .pipe(z.array(z.string().max(300)).max(20))
    .optional(),
  fee: text(50),
  feeAmount: z.number().int().min(0).max(1_000_000).nullable().optional(),
  feeUnit: z.enum(["hour", "month"]).nullable().optional(),
  // { days: [...], times: [...] } (the builder's two pickers) or a full grid { Mon: { morning: true, ... } }.
  availability: z
    .union([
      z.object({ days: z.array(z.enum(DAYS)), times: z.array(slot) }).transform(({ days, times }) => days.flatMap((d) => times.map((t) => `${d}:${t}`))),
      z.partialRecord(z.enum(DAYS), z.partialRecord(slot, z.boolean())).transform((grid) =>
        DAYS.flatMap((d) => TIME_SLOTS.filter((t) => grid[d]?.[t]).map((t) => `${d}:${t}`)),
      ),
    ])
    .transform((a) => [...new Set(a)])
    .optional(),
});
export type ProfileBody = z.infer<typeof ProfileBody>;

/** Body -> tutors columns. Only keys that were sent are included, so partial saves leave the rest alone. */
export function toTutorColumns(b: ProfileBody) {
  const cols: Record<string, unknown> = {};
  const set = (col: string, v: unknown) => v !== undefined && (cols[col] = v);
  set("full_name", b.fullName);
  set("qualification", b.qualification);
  set("years_experience", b.yearsExperience);
  set("city", b.city);
  set("area", b.area);
  set("travel_range", b.travelRange);
  set("subjects", b.subjects);
  set("class_bands", b.classBands);
  set("boards", b.boards);
  set("modes", b.modes);
  set("languages", b.languages);
  set("bio", b.bio);
  set("methodology", b.methodology);
  set("availability", b.availability);
  if (b.fee !== undefined) {
    const parsed = parseFee(b.fee);
    cols.fee_text = b.fee;
    cols.fee_amount = b.feeAmount !== undefined ? b.feeAmount : parsed.amount;
    cols.fee_unit = b.feeUnit !== undefined ? b.feeUnit : parsed.unit;
  } else {
    set("fee_amount", b.feeAmount);
    set("fee_unit", b.feeUnit);
  }
  return cols;
}

export function slugify(name: string) {
  return (
    name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") ||
    "tutor"
  );
}

// ---------- Loading and completeness ----------

// review_note has no SELECT grant (so it never leaks through the REST API); it comes from tutor_review_notes().
export const OWN_COLUMNS = `${PROFILE_COLUMNS}, status, submitted_at, approved_at`;
/** Admin review view: the owner view plus the tutor's phone from profiles. */
export const ADMIN_TUTOR_COLUMNS = `${OWN_COLUMNS}, profiles (phone)`;

/** Adds review_note to each row. The RPC only returns notes for the caller's own row, or any row for admins. */
export async function withReviewNotes<T extends { id: string }>(supabase: Supabase, rows: T[]) {
  if (!rows.length) return { data: [] as (T & { review_note: string | null })[] };
  const { data, error } = await supabase.rpc("tutor_review_notes", { p_ids: rows.map((r) => r.id) });
  if (error) return { error };
  const notes = new Map((data as { id: string; review_note: string | null }[]).map((n) => [n.id, n.review_note]));
  return { data: rows.map((r) => ({ ...r, review_note: notes.get(r.id) ?? null })) };
}

/** The signed-in tutor's own profile (with phone and review note), or null if not created yet. */
export async function loadOwnProfile(supabase: Supabase, userId: string) {
  const [tutor, profile] = await Promise.all([
    supabase.from("tutors").select(OWN_COLUMNS).eq("id", userId).maybeSingle(),
    supabase.from("profiles").select("phone").eq("id", userId).maybeSingle(),
  ]);
  if (tutor.error) return { error: tutor.error };
  if (profile.error) return { error: profile.error };
  if (!tutor.data) return { data: null };
  const noted = await withReviewNotes(supabase, [tutor.data]);
  if (noted.error) return { error: noted.error };
  return { data: toOwnTutorProfile(noted.data[0], profile.data?.phone ?? null) };
}

/** Field names (as in the PUT body) still missing before the profile can be submitted. */
export function missingForSubmit(p: NonNullable<Awaited<ReturnType<typeof loadOwnProfile>>["data"]>) {
  const missing: string[] = [];
  if (!p.fullName) missing.push("fullName");
  if (!p.qualification) missing.push("qualification");
  if (!p.phone) missing.push("phone");
  if (!p.city) missing.push("city");
  if (!p.area) missing.push("area");
  if (!p.subjects.length) missing.push("subjects");
  if (!p.classBands.length) missing.push("classBands");
  if (!p.modes.length) missing.push("modes");
  if (!p.languages.length) missing.push("languages");
  if (!p.bio) missing.push("bio");
  if (!Object.values(p.availability).some((day) => Object.values(day).some(Boolean))) missing.push("availability");
  if (!p.feeText) missing.push("fee");
  return missing;
}
