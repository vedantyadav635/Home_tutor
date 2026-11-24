import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, dbError, parseBody, requireRole, uuid } from "@/lib/api";
import { toContactMessage } from "@/lib/mappers";

const Patch = z.object({ handled: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { supabase } = auth.data;

  const { id } = await params;
  const notFound = () => apiError(404, "not_found", "We couldn't find this message.");
  if (!uuid.safeParse(id).success) return notFound();

  const body = await parseBody(req, Patch);
  if (body.response) return body.response;

  const { data, error } = await supabase.from("contact_messages").update({ handled: body.data.handled }).eq("id", id).select("*");
  if (error) return dbError(error, "admin.contact.update");
  if (!data.length) return notFound();
  return NextResponse.json(toContactMessage(data[0]));
}
