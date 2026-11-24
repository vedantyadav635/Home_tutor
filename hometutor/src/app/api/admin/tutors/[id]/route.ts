import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, dbError, parseBody, requireRole, uuid } from "@/lib/api";
import { one, toOwnTutorProfile } from "@/lib/mappers";
import { ADMIN_TUTOR_COLUMNS, withReviewNotes } from "@/lib/tutor-profile";

const Patch = z
  .object({
    status: z.enum(["approved", "rejected"]).optional(),
    verified: z.boolean().optional(),
    featured: z.boolean().optional(),
    reviewNote: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.")
  .refine((b) => b.status !== "rejected" || !!b.reviewNote, {
    message: "Add a review note explaining what to fix.",
    path: ["reviewNote"],
  });

// Admin only. Runs as the admin's session: is_privileged() lets the tutors_guard trigger accept these changes.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { supabase } = auth.data;

  const { id } = await params;
  const notFound = () => apiError(404, "not_found", "We couldn't find this tutor.");
  if (!uuid.safeParse(id).success) return notFound();

  const body = await parseBody(req, Patch);
  if (body.response) return body.response;
  const b = body.data;

  const update: Record<string, unknown> = {};
  if (b.status !== undefined) update.status = b.status;
  if (b.verified !== undefined) update.verified = b.verified;
  if (b.featured !== undefined) update.featured = b.featured;
  if (b.reviewNote !== undefined) update.review_note = b.reviewNote || null;

  const { data, error } = await supabase.from("tutors").update(update).eq("id", id).select(ADMIN_TUTOR_COLUMNS);
  if (error) return dbError(error, "admin.tutors.update");
  if (!data.length) return notFound();
  const noted = await withReviewNotes(supabase, data);
  if (noted.error) return dbError(noted.error, "admin.tutors.notes");
  return NextResponse.json(toOwnTutorProfile(noted.data[0], one(noted.data[0].profiles)?.phone ?? null));
}
