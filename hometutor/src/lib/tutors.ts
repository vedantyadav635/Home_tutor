import "server-only";
import { z } from "zod";
import { CARD_COLUMNS, PROFILE_COLUMNS, toTutorCard, toTutorProfile } from "@/lib/mappers";
import { BOARDS, CLASS_BANDS, LANGUAGES, MODES, SUBJECTS } from "@/lib/options";
import type { createClient, createPublicClient } from "@/lib/supabase/server";

// Shared by the API routes and the pages, so both search the same way.

type AnyClient = ReturnType<typeof createPublicClient> | Awaited<ReturnType<typeof createClient>>;

const bandValues = CLASS_BANDS.map((b) => b.value) as [string, ...string[]];
export const MIN_YEARS = ["0", "1", "3", "5"] as const;

export const SearchQuery = z.object({
  board: z.array(z.enum(BOARDS)),
  band: z.array(z.enum(bandValues)),
  subject: z.array(z.enum(SUBJECTS)),
  mode: z.array(z.enum(MODES)),
  lang: z.array(z.enum(LANGUAGES)),
  minYears: z.enum(MIN_YEARS).default("0").transform(Number),
  loc: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type SearchQuery = z.infer<typeof SearchQuery>;

const nonEmpty = (v: string | null) => (v ? v : undefined);

function rawQuery(sp: URLSearchParams) {
  const all = (k: string) => sp.getAll(k).filter(Boolean);
  return {
    board: all("board"), band: all("band"), subject: all("subject"), mode: all("mode"), lang: all("lang"),
    minYears: nonEmpty(sp.get("minYears")), loc: nonEmpty(sp.get("loc")),
    page: nonEmpty(sp.get("page")), pageSize: nonEmpty(sp.get("pageSize")),
  };
}

/** Strict: for the API, where an unknown value is a 400. */
export const parseSearch = (sp: URLSearchParams) => SearchQuery.safeParse(rawQuery(sp));

/** Lenient: for pages, where a stale or hand-edited URL should just drop the bad values. */
export function readSearch(sp: URLSearchParams): SearchQuery {
  const r = rawQuery(sp);
  const keep = (vals: string[], allowed: readonly string[]) => vals.filter((v) => allowed.includes(v));
  const cleaned = {
    board: keep(r.board, BOARDS), band: keep(r.band, bandValues), subject: keep(r.subject, SUBJECTS),
    mode: keep(r.mode, MODES), lang: keep(r.lang, LANGUAGES),
    minYears: MIN_YEARS.includes(r.minYears as never) ? r.minYears : undefined,
    loc: r.loc?.slice(0, 100),
    page: /^\d+$/.test(r.page ?? "") && Number(r.page) >= 1 ? r.page : undefined,
    pageSize: undefined,
  };
  return SearchQuery.parse(cleaned);
}

export async function searchTutors(supabase: AnyClient, q: SearchQuery) {
  const args = {
    p_boards: q.board, p_bands: q.band, p_subjects: q.subject, p_modes: q.mode, p_languages: q.lang,
    p_min_years: q.minYears, p_location: q.loc ?? null,
  };
  const { data, error } = await supabase.rpc("search_tutors", { ...args, p_limit: q.pageSize, p_offset: (q.page - 1) * q.pageSize });
  if (error) return { error };

  let total = data[0]?.total_count ?? 0;
  if (!data.length && q.page > 1) {
    // Past the last page: no rows carry total_count, so ask for it separately.
    const first = await supabase.rpc("search_tutors", { ...args, p_limit: 1, p_offset: 0 });
    if (first.error) return { error: first.error };
    total = first.data[0]?.total_count ?? 0;
  }
  return { data: { tutors: data.map(toTutorCard), total: Number(total) } };
}

export async function featuredTutors(supabase: AnyClient) {
  const { data, error } = await supabase
    .from("tutors")
    .select(CARD_COLUMNS)
    .eq("status", "approved")
    .eq("verified", true)
    .order("featured", { ascending: false })
    .order("years_experience", { ascending: false })
    .order("full_name")
    .limit(4);
  if (error) return { error };
  return { data: data.map(toTutorCard) };
}

/** RLS decides visibility: approved for everyone, any status for the owner and admins. */
export async function tutorBySlug(supabase: AnyClient, slug: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { data: null };
  const { data, error } = await supabase.from("tutors").select(PROFILE_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) return { error };
  return { data: data ? toTutorProfile(data) : null };
}
