import { NextResponse, type NextRequest } from "next/server";
import { apiError, dbError, requireRole } from "@/lib/api";
import { contactMessages } from "@/lib/admin";

// ?handled=true|false (optional). Newest first.
export async function GET(req: NextRequest) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;

  const handled = req.nextUrl.searchParams.get("handled");
  if (handled !== null && handled !== "true" && handled !== "false")
    return apiError(400, "validation_failed", "handled must be true or false.", { handled: ["Use true or false."] });

  const result = await contactMessages(auth.data.supabase, handled === null ? undefined : handled === "true");
  if (result.error) return dbError(result.error, "admin.contact");
  return NextResponse.json({ messages: result.data });
}
