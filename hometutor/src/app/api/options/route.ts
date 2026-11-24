import { NextResponse } from "next/server";
import { BOARDS, CLASS_BANDS, DAYS, LANGUAGES, MODES, SUBJECTS, TIME_SLOTS } from "@/lib/options";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    { boards: BOARDS, classBands: CLASS_BANDS, subjects: SUBJECTS, modes: MODES, languages: LANGUAGES, days: DAYS, timeSlots: TIME_SLOTS },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
