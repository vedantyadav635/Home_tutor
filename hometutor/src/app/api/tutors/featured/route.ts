import { NextResponse } from "next/server";
import { dbError } from "@/lib/api";
import { CARD_COLUMNS, toTutorCard } from "@/lib/mappers";
import { createPublicClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createPublicClient(); // publicly cached: no cookies
  const { data, error } = await supabase
    .from("tutors")
    .select(CARD_COLUMNS)
    .eq("status", "approved")
    .eq("verified", true)
    .order("featured", { ascending: false })
    .order("years_experience", { ascending: false })
    .order("full_name")
    .limit(4);
  if (error) return dbError(error, "tutors.featured");

  return NextResponse.json(
    { tutors: data.map(toTutorCard) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
