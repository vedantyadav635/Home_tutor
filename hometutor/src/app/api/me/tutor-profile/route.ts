import { NextResponse } from "next/server";
import { apiError, dbError, parseBody, requireRole } from "@/lib/api";
import { loadOwnProfile, ProfileBody, slugify, toTutorColumns } from "@/lib/tutor-profile";

// All writes use the tutor's own session, so RLS and the tutors_guard trigger stay in force.

export async function GET() {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const own = await loadOwnProfile(supabase, user.id);
  if (own.error) return dbError(own.error, "tutor-profile.get");
  if (!own.data) return apiError(404, "not_found", "You haven't created your tutor profile yet.");
  return NextResponse.json(own.data);
}

export async function PUT(req: Request) {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const body = await parseBody(req, ProfileBody); // unknown keys (e.g. verified, status) are stripped
  if (body.response) return body.response;
  const b = body.data;
  const cols = toTutorColumns(b);

  const existing = await supabase.from("tutors").select("id").eq("id", user.id).maybeSingle();
  if (existing.error) return dbError(existing.error, "tutor-profile.lookup");

  let created = false;
  if (!existing.data) {
    if (!b.fullName)
      return apiError(400, "validation_failed", "Enter your name to start your profile.", { fullName: ["Required to create your profile."] });
    // Other tutors' drafts are hidden by RLS, so we can't list taken slugs; try and retry on conflict instead.
    const base = slugify(b.fullName);
    for (let i = 1; i <= 25 && !created; i++) {
      const slug = i === 1 ? base : `${base}-${i}`;
      const { error } = await supabase.from("tutors").insert({ id: user.id, slug, ...cols });
      if (!error) created = true;
      else if (!(error.code === "23505" && error.message.includes("slug"))) return dbError(error, "tutor-profile.create");
    }
    if (!created) return apiError(409, "conflict", "We couldn't create a profile link for this name. Please try a fuller name.");
  } else if (Object.keys(cols).length) {
    const { error } = await supabase.from("tutors").update(cols).eq("id", user.id);
    if (error) return dbError(error, "tutor-profile.update");
  }

  if (b.phone !== undefined) {
    const { error } = await supabase.from("profiles").update({ phone: b.phone }).eq("id", user.id);
    if (error) return dbError(error, "tutor-profile.phone");
  }
  if (b.experience !== undefined) {
    const error = await replaceRows(supabase, "tutor_experience", user.id, b.experience);
    if (error) return dbError(error, "tutor-profile.experience");
  }
  if (b.education !== undefined) {
    const error = await replaceRows(supabase, "tutor_education", user.id, b.education.map((item) => ({ item })));
    if (error) return dbError(error, "tutor-profile.education");
  }

  const own = await loadOwnProfile(supabase, user.id);
  if (own.error) return dbError(own.error, "tutor-profile.reload");
  return NextResponse.json(own.data, { status: created ? 201 : 200 });
}

/** Insert the new list first, then delete the old rows: a failure part-way never loses the tutor's data. */
async function replaceRows(
  supabase: Parameters<typeof loadOwnProfile>[0],
  table: "tutor_experience" | "tutor_education",
  tutorId: string,
  rows: Record<string, unknown>[],
) {
  let keep: string[] = [];
  if (rows.length) {
    const { data, error } = await supabase
      .from(table)
      .insert(rows.map((r, i) => ({ ...r, tutor_id: tutorId, sort_order: i })))
      .select("id");
    if (error) return error;
    keep = data.map((r: { id: string }) => r.id);
  }
  let del = supabase.from(table).delete().eq("tutor_id", tutorId);
  if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
  const { error } = await del;
  return error;
}
