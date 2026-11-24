import { NextResponse } from "next/server";
import { dbError } from "@/lib/api";
import { createPublicClient } from "@/lib/supabase/server";
import { featuredTutors } from "@/lib/tutors";

export async function GET() {
  const result = await featuredTutors(createPublicClient()); // publicly cached: no cookies
  if (result.error) return dbError(result.error, "tutors.featured");

  return NextResponse.json(
    { tutors: result.data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
