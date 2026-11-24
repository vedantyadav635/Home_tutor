import { NextResponse } from "next/server";
import { apiError, dbError } from "@/lib/api";
import { PROFILE_COLUMNS, toTutorProfile } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";

// RLS decides visibility: approved for everyone, any status for the owner and admins.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const notFound = () => apiError(404, "not_found", "We couldn't find this tutor.");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("tutors").select(PROFILE_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) return dbError(error, "tutors.profile");
  if (!data) return notFound();

  return NextResponse.json(toTutorProfile(data), { headers: { "Cache-Control": "private, no-store" } });
}
