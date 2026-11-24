import { NextResponse } from "next/server";
import { dbError, requireRole } from "@/lib/api";
import { requestSummary } from "@/lib/requests";

export async function GET() {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const result = await requestSummary(supabase, user.id);
  if (result.error) return dbError(result.error, "me.requests.summary");
  return NextResponse.json(result.data);
}
