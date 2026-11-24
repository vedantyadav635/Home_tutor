import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, dbError, requireRole } from "@/lib/api";
import { adminTutors, TUTOR_STATUSES } from "@/lib/admin";

const Status = z.enum(TUTOR_STATUSES);

// Admin review queue. ?status=pending shows the oldest submissions first.
export async function GET(req: NextRequest) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;

  const param = req.nextUrl.searchParams.get("status");
  const status = param === null ? null : Status.safeParse(param);
  if (status && !status.success) return apiError(400, "validation_failed", "Unknown status.", { status: ["Unknown status."] });

  const result = await adminTutors(auth.data.supabase, status?.data);
  if (result.error) return dbError(result.error, "admin.tutors");
  return NextResponse.json({ tutors: result.data });
}
