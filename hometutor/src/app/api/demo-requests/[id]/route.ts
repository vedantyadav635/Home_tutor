import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, dbError, parseBody, requireRole, uuid } from "@/lib/api";
import { REQUEST_COLUMNS, toReceivedRequest } from "@/lib/mappers";

const Patch = z
  .object({
    status: z.enum(["contacted", "accepted", "declined", "closed"]).optional(),
    tutorNote: z.string().trim().max(1000).optional(),
  })
  .refine((b) => b.status !== undefined || b.tutorNote !== undefined, "Send a status or a note.");

// Tutor only. RLS limits the update to requests sent to this tutor; the column grant limits it to status + tutor_note.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { supabase } = auth.data;

  const { id } = await params;
  const notFound = () => apiError(404, "not_found", "We couldn't find this request.");
  if (!uuid.safeParse(id).success) return notFound();

  const body = await parseBody(req, Patch);
  if (body.response) return body.response;

  const update: Record<string, unknown> = {};
  if (body.data.status !== undefined) update.status = body.data.status;
  if (body.data.tutorNote !== undefined) update.tutor_note = body.data.tutorNote || null;

  const { data, error } = await supabase.from("demo_requests").update(update).eq("id", id).select(REQUEST_COLUMNS);
  if (error) return dbError(error, "demo-requests.update");
  if (!data.length) return notFound();
  return NextResponse.json(toReceivedRequest(data[0]));
}
