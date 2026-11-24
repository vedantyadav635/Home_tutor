import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, dbError } from "@/lib/api";
import { toTutorCard } from "@/lib/mappers";
import { BOARDS, CLASS_BANDS, LANGUAGES, MODES, SUBJECTS } from "@/lib/options";
import { createPublicClient } from "@/lib/supabase/server";

const bandValues = CLASS_BANDS.map((b) => b.value) as [string, ...string[]];

const Query = z.object({
  board: z.array(z.enum(BOARDS)),
  band: z.array(z.enum(bandValues)),
  subject: z.array(z.enum(SUBJECTS)),
  mode: z.array(z.enum(MODES)),
  lang: z.array(z.enum(LANGUAGES)),
  minYears: z.enum(["0", "1", "3", "5"]).default("0").transform(Number),
  loc: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const one = (k: string) => sp.get(k) ?? undefined;
  const parsed = Query.safeParse({
    board: sp.getAll("board"), band: sp.getAll("band"), subject: sp.getAll("subject"),
    mode: sp.getAll("mode"), lang: sp.getAll("lang"),
    minYears: one("minYears"), loc: one("loc"), page: one("page"), pageSize: one("pageSize"),
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return apiError(400, "validation_failed", "Some filters are not valid.", fieldErrors as Record<string, string[]>);
  }
  const q = parsed.data;

  // Cached publicly (s-maxage), so no cookies: results never depend on who is asking.
  const supabase = createPublicClient();
  const args = {
    p_boards: q.board, p_bands: q.band, p_subjects: q.subject, p_modes: q.mode, p_languages: q.lang,
    p_min_years: q.minYears, p_location: q.loc ?? null,
  };
  const { data, error } = await supabase.rpc("search_tutors", { ...args, p_limit: q.pageSize, p_offset: (q.page - 1) * q.pageSize });
  if (error) return dbError(error, "tutors.search");

  let total = data[0]?.total_count ?? 0;
  if (!data.length && q.page > 1) {
    // Past the last page: no rows carry total_count, so ask for it separately.
    const first = await supabase.rpc("search_tutors", { ...args, p_limit: 1, p_offset: 0 });
    if (first.error) return dbError(first.error, "tutors.search.total");
    total = first.data[0]?.total_count ?? 0;
  }

  return NextResponse.json(
    { tutors: data.map(toTutorCard), total: Number(total), page: q.page, pageSize: q.pageSize },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
