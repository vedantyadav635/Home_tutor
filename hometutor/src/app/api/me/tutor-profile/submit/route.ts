import { NextResponse } from "next/server";
import { apiError, dbError, requireRole } from "@/lib/api";
import { loadOwnProfile, missingForSubmit } from "@/lib/tutor-profile";

export async function POST() {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const own = await loadOwnProfile(supabase, user.id);
  if (own.error) return dbError(own.error, "tutor-profile.submit.load");
  if (!own.data) return apiError(404, "not_found", "You haven't created your tutor profile yet.");
  if (own.data.status === "approved") return apiError(409, "already_live", "Your profile is already live.");
  if (own.data.status === "pending") return NextResponse.json(own.data); // already waiting for review

  const missing = missingForSubmit(own.data);
  if (missing.length)
    return apiError(
      400,
      "incomplete",
      "Please complete these before submitting: " + missing.join(", ") + ".",
      Object.fromEntries(missing.map((f) => [f, ["Required before you submit."]])),
    );

  const { error } = await supabase.from("tutors").update({ status: "pending" }).eq("id", user.id);
  if (error) return dbError(error, "tutor-profile.submit");

  const after = await loadOwnProfile(supabase, user.id);
  if (after.error) return dbError(after.error, "tutor-profile.submit.reload");
  return NextResponse.json(after.data);
}
