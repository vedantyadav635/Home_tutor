import { NextResponse } from "next/server";
import { dbError, requireRole } from "@/lib/api";
import { adminStats } from "@/lib/admin";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;

  const result = await adminStats(auth.data.supabase);
  if (result.error) return dbError(result.error, "admin.stats");
  return NextResponse.json(result.data);
}
