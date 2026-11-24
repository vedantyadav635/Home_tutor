import { NextResponse } from "next/server";
import { apiError, dbError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { tutorBySlug } from "@/lib/tutors";

// RLS decides visibility: approved for everyone, any status for the owner and admins.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await tutorBySlug(await createClient(), slug);
  if (result.error) return dbError(result.error, "tutors.profile");
  if (!result.data) return apiError(404, "not_found", "We couldn't find this tutor.");

  return NextResponse.json(result.data, { headers: { "Cache-Control": "private, no-store" } });
}
