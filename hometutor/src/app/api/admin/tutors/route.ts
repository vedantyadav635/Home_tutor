import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, dbError, requireRole } from "@/lib/api";
import { one, toOwnTutorProfile } from "@/lib/mappers";
import { ADMIN_TUTOR_COLUMNS, withReviewNotes } from "@/lib/tutor-profile";

const Status = z.enum(["draft", "pending", "approved", "rejected"]);

// Admin review queue. ?status=pending shows the oldest submissions first.
export async function GET(req: NextRequest) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { supabase } = auth.data;

  const param = req.nextUrl.searchParams.get("status");
  const status = param === null ? null : Status.safeParse(param);
  if (status && !status.success) return apiError(400, "validation_failed", "Unknown status.", { status: ["Unknown status."] });

  let q = supabase.from("tutors").select(ADMIN_TUTOR_COLUMNS).order("submitted_at", { ascending: true, nullsFirst: false }).limit(200);
  if (status) q = q.eq("status", status.data);
  const { data, error } = await q;
  if (error) return dbError(error, "admin.tutors");
  const noted = await withReviewNotes(supabase, data);
  if (noted.error) return dbError(noted.error, "admin.tutors.notes");

  return NextResponse.json({ tutors: noted.data.map((r) => toOwnTutorProfile(r, one(r.profiles)?.phone ?? null)) });
}
