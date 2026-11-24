import { NextResponse } from "next/server";
import { dbError, requireRole } from "@/lib/api";

const DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { supabase } = auth.data;

  const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const [tutors, last7, last30, unhandled] = await Promise.all([
    supabase.from("tutors").select("status"),
    supabase.from("demo_requests").select("id", { count: "exact", head: true }).gte("created_at", since(7)),
    supabase.from("demo_requests").select("id", { count: "exact", head: true }).gte("created_at", since(30)),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
  ]);
  const failed = [tutors, last7, last30, unhandled].find((r) => r.error);
  if (failed?.error) return dbError(failed.error, "admin.stats");

  const byStatus = { draft: 0, pending: 0, approved: 0, rejected: 0 };
  for (const t of tutors.data ?? []) byStatus[t.status as keyof typeof byStatus]++;

  return NextResponse.json({
    tutors: byStatus,
    demoRequests: { last7Days: last7.count ?? 0, last30Days: last30.count ?? 0 },
    unhandledContactMessages: unhandled.count ?? 0,
  });
}
