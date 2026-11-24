import { NextResponse } from "next/server";
import { dbError, requireRole } from "@/lib/api";

const STATUSES = ["new", "contacted", "accepted", "declined", "closed"] as const;

export async function GET() {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const { data, error } = await supabase.from("demo_requests").select("status").eq("tutor_id", user.id);
  if (error) return dbError(error, "me.requests.summary");

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<(typeof STATUSES)[number], number>;
  for (const r of data) counts[r.status as keyof typeof counts]++;
  return NextResponse.json({ ...counts, total: data.length });
}
