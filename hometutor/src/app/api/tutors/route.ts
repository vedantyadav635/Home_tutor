import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, dbError } from "@/lib/api";
import { createPublicClient } from "@/lib/supabase/server";
import { parseSearch, searchTutors } from "@/lib/tutors";

export async function GET(req: NextRequest) {
  const parsed = parseSearch(req.nextUrl.searchParams);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return apiError(400, "validation_failed", "Some filters are not valid.", fieldErrors as Record<string, string[]>);
  }
  const q = parsed.data;

  // Cached publicly (s-maxage), so no cookies: results never depend on who is asking.
  const result = await searchTutors(createPublicClient(), q);
  if (result.error) return dbError(result.error, "tutors.search");

  return NextResponse.json(
    { ...result.data, page: q.page, pageSize: q.pageSize },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
