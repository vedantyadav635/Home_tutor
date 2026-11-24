import { NextResponse, type NextRequest } from "next/server";
import { apiError, dbError, requireRole } from "@/lib/api";
import { toContactMessage } from "@/lib/mappers";

// ?handled=true|false (optional). Newest first.
export async function GET(req: NextRequest) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { supabase } = auth.data;

  const handled = req.nextUrl.searchParams.get("handled");
  if (handled !== null && handled !== "true" && handled !== "false")
    return apiError(400, "validation_failed", "handled must be true or false.", { handled: ["Use true or false."] });

  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (handled !== null) q = q.eq("handled", handled === "true");
  const { data, error } = await q;
  if (error) return dbError(error, "admin.contact");
  return NextResponse.json({ messages: data.map(toContactMessage) });
}
