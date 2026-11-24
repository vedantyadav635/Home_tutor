import { NextResponse } from "next/server";
import { dbError, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const [profile, tutor] = await Promise.all([
    supabase.from("profiles").select("role, full_name, phone").eq("id", user.id).maybeSingle(),
    supabase.from("tutors").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (profile.error) return dbError(profile.error, "me.profile");
  if (tutor.error) return dbError(tutor.error, "me.tutor");

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    role: profile.data?.role ?? "parent",
    fullName: profile.data?.full_name ?? null,
    phone: profile.data?.phone ?? null,
    hasTutorProfile: !!tutor.data,
  });
}
