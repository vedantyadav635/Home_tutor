// The one place database rows become API objects (camelCase).
// Private columns (phone, review_note, status, submitted_at, approved_at) are never copied.
import { DAYS, TIME_SLOTS, type Day, type TimeSlot } from "@/lib/options";

export function photoUrl(path: string | null): string | null {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tutor-photos/${encoded}`;
}

type CardRow = {
  id: string; slug: string; full_name: string; qualification: string | null; years_experience: number | null;
  city: string | null; area: string | null; subjects: string[]; class_bands: string[]; modes: string[];
  languages: string[]; bio: string | null; fee_text: string | null; photo_path: string | null; verified: boolean;
};

export function toTutorCard(r: CardRow) {
  return {
    id: r.id,
    slug: r.slug,
    fullName: r.full_name,
    qualification: r.qualification,
    yearsExperience: r.years_experience,
    city: r.city,
    area: r.area,
    subjects: r.subjects,
    classBands: r.class_bands,
    modes: r.modes,
    languages: r.languages,
    bio: r.bio,
    feeText: r.fee_text,
    photoUrl: photoUrl(r.photo_path),
    verified: r.verified,
  };
}
export type TutorCard = ReturnType<typeof toTutorCard>;

export type AvailabilityGrid = Record<Day, Record<TimeSlot, boolean>>;

/** ["Mon:evening", ...] -> { Mon: { morning: false, afternoon: false, evening: true }, ... } */
export function toAvailabilityGrid(values: string[]): AvailabilityGrid {
  const set = new Set(values);
  return Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(TIME_SLOTS.map((s) => [s, set.has(`${d}:${s}`)]))]),
  ) as AvailabilityGrid;
}

type ProfileRow = CardRow & {
  travel_range: string | null; methodology: string | null; fee_amount: number | null;
  fee_unit: "hour" | "month" | null; boards: string[]; availability: string[]; featured: boolean;
  tutor_experience: { period: string | null; title: string; details: string | null; sort_order: number }[];
  tutor_education: { item: string; sort_order: number }[];
};

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export function toTutorProfile(r: ProfileRow) {
  return {
    ...toTutorCard(r),
    travelRange: r.travel_range,
    methodology: r.methodology,
    feeAmount: r.fee_amount,
    feeUnit: r.fee_unit,
    boards: r.boards,
    featured: r.featured,
    availability: toAvailabilityGrid(r.availability),
    experience: [...r.tutor_experience].sort(bySortOrder).map((e) => ({ period: e.period, title: e.title, details: e.details })),
    education: [...r.tutor_education].sort(bySortOrder).map((e) => e.item),
  };
}

/** The tutor's own view: public profile plus review fields and their private phone. Never use for public responses. */
export function toOwnTutorProfile(
  r: ProfileRow & { status: string; review_note: string | null; submitted_at: string | null; approved_at: string | null },
  phone: string | null,
) {
  return {
    ...toTutorProfile(r),
    phone,
    status: r.status,
    reviewNote: r.review_note,
    submittedAt: r.submitted_at,
    approvedAt: r.approved_at,
  };
}

/** A to-one embed (e.g. tutors -> profiles). Without generated DB types supabase-js types it as an array. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

// ---------- Demo requests ----------

type DemoRequestRow = {
  id: string; tutor_id: string; parent_name: string; parent_phone: string; class_band: string | null;
  subject: string | null; mode: string | null; message: string | null; status: string; tutor_note: string | null;
  created_at: string; updated_at: string;
};

const requestBase = (r: DemoRequestRow) => ({
  id: r.id,
  classBand: r.class_band,
  subject: r.subject,
  mode: r.mode,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** What the tutor sees: the parent's contact details and their own note. */
export const toReceivedRequest = (r: DemoRequestRow) => ({
  ...requestBase(r),
  parentName: r.parent_name,
  parentPhone: r.parent_phone,
  tutorNote: r.tutor_note,
});

/** What the parent sees: the tutor, and the tutor's phone only once accepted (passed in from the RPC). */
export const toSentRequest = (
  r: DemoRequestRow & { tutors: { full_name: string; slug: string } | { full_name: string; slug: string }[] | null },
  tutorPhone: string | null,
) => ({
  ...requestBase(r),
  tutorId: r.tutor_id,
  tutorName: one(r.tutors)?.full_name ?? null,
  tutorSlug: one(r.tutors)?.slug ?? null,
  ...(r.status === "accepted" && tutorPhone ? { tutorPhone } : {}),
});

export const REQUEST_COLUMNS =
  "id, tutor_id, parent_name, parent_phone, class_band, subject, mode, message, status, tutor_note, created_at, updated_at";

// ---------- Contact messages (admin only) ----------

export const toContactMessage = (r: {
  id: string; name: string; reach: string; sender_type: string; message: string; handled: boolean; created_at: string;
}) => ({
  id: r.id,
  name: r.name,
  reach: r.reach,
  senderType: r.sender_type,
  message: r.message,
  handled: r.handled,
  createdAt: r.created_at,
});

/** Columns to select for each shape: only public ones. */
export const CARD_COLUMNS =
  "id, slug, full_name, qualification, years_experience, city, area, subjects, class_bands, modes, languages, bio, fee_text, photo_path, verified";
export const PROFILE_COLUMNS = `${CARD_COLUMNS}, travel_range, methodology, fee_amount, fee_unit, boards, availability, featured,
  tutor_experience (period, title, details, sort_order), tutor_education (item, sort_order)`;
