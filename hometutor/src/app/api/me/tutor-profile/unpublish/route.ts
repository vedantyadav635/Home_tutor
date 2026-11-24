import { NextResponse } from "next/server";
import { apiError, dbError, requireRole } from "@/lib/api";
import { loadOwnProfile } from "@/lib/tutor-profile";

export async function POST() {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const { data, error } = await supabase.from("tutors").update({ status: "draft" }).eq("id", user.id).select("id");
  if (error) return dbError(error, "tutor-profile.unpublish");
  if (!data.length) return apiError(404, "not_found", "You haven't created your tutor profile yet.");

  const own = await loadOwnProfile(supabase, user.id);
  if (own.error) return dbError(own.error, "tutor-profile.unpublish.reload");
  return NextResponse.json(own.data);
}
