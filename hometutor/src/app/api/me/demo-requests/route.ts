import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, dbError, requireUser } from "@/lib/api";
import { receivedRequests, REQUEST_STATUSES, sentRequests } from "@/lib/requests";

const Status = z.enum(REQUEST_STATUSES);

// Tutors: requests received. Everyone else: requests they sent.
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam === null ? null : Status.safeParse(statusParam);
  if (status && !status.success) return apiError(400, "validation_failed", "Unknown status.", { status: ["Unknown status."] });

  const { data: profile, error: pErr } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (pErr) return dbError(pErr, "me.requests.role");
  const isTutor = profile?.role === "tutor";

  const result = isTutor
    ? await receivedRequests(supabase, user.id, status?.data)
    : await sentRequests(supabase, user.id, status?.data);
  if (result.error) return dbError(result.error, "me.requests");
  return NextResponse.json({ role: isTutor ? "tutor" : "parent", requests: result.data });
}
