import "server-only";
import { one, toContactMessage, toOwnTutorProfile } from "@/lib/mappers";
import type { createClient } from "@/lib/supabase/server";
import { ADMIN_TUTOR_COLUMNS, withReviewNotes } from "@/lib/tutor-profile";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const TUTOR_STATUSES = ["pending", "approved", "rejected", "draft"] as const;
export type TutorStatus = (typeof TUTOR_STATUSES)[number];

/** Admin review list. Pending shows the oldest submission first. */
export async function adminTutors(supabase: Supabase, status?: TutorStatus) {
  let q = supabase.from("tutors").select(ADMIN_TUTOR_COLUMNS).order("submitted_at", { ascending: true, nullsFirst: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return { error };
  const noted = await withReviewNotes(supabase, data);
  if (noted.error) return { error: noted.error };
  return { data: noted.data.map((r) => toOwnTutorProfile(r, one(r.profiles)?.phone ?? null)) };
}

export async function contactMessages(supabase: Supabase, handled?: boolean) {
  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (handled !== undefined) q = q.eq("handled", handled);
  const { data, error } = await q;
  if (error) return { error };
  return { data: data.map(toContactMessage) };
}

const DAY = 24 * 60 * 60 * 1000;

export async function adminStats(supabase: Supabase) {
  const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const [tutors, last7, last30, unhandled] = await Promise.all([
    supabase.from("tutors").select("status"),
    supabase.from("demo_requests").select("id", { count: "exact", head: true }).gte("created_at", since(7)),
    supabase.from("demo_requests").select("id", { count: "exact", head: true }).gte("created_at", since(30)),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
  ]);
  const failed = [tutors, last7, last30, unhandled].find((r) => r.error);
  if (failed?.error) return { error: failed.error };

  const byStatus = { draft: 0, pending: 0, approved: 0, rejected: 0 };
  for (const t of tutors.data ?? []) byStatus[t.status as keyof typeof byStatus]++;
  return {
    data: {
      tutors: byStatus,
      demoRequests: { last7Days: last7.count ?? 0, last30Days: last30.count ?? 0 },
      unhandledContactMessages: unhandled.count ?? 0,
    },
  };
}
