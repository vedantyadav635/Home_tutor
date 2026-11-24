import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, dbError, requireUser } from "@/lib/api";
import { REQUEST_COLUMNS, toReceivedRequest, toSentRequest } from "@/lib/mappers";

const Status = z.enum(["new", "contacted", "accepted", "declined", "closed"]);

// Tutors: requests received. Everyone else: requests they sent.
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam === null ? null : Status.safeParse(statusParam);
  if (status && !status.success) return apiError(400, "validation_failed", "Unknown status.", { status: ["Unknown status."] });

  const { data: profile, error: pErr } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (pErr) return dbError(pErr, "me.requests.role");
  const isTutor = profile?.role === "tutor";

  if (isTutor) {
    let q = supabase.from("demo_requests").select(REQUEST_COLUMNS).eq("tutor_id", user.id).order("created_at", { ascending: false }).limit(200);
    if (status) q = q.eq("status", status.data);
    const { data, error } = await q;
    if (error) return dbError(error, "me.requests.received");
    return NextResponse.json({ role: "tutor", requests: data.map(toReceivedRequest) });
  }

  let q = supabase
    .from("demo_requests")
    .select(`${REQUEST_COLUMNS}, tutors (full_name, slug)`)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status.data);
  const { data, error } = await q;
  if (error) return dbError(error, "me.requests.sent");

  // Parent: the tutor's phone comes only from the RPC, which itself checks accepted + caller.
  const requests = await Promise.all(
    data.map(async (r) => {
      if (r.status !== "accepted") return toSentRequest(r, null);
      const { data: phone, error: rpcErr } = await supabase.rpc("tutor_contact_for_request", { request_id: r.id });
      if (rpcErr) console.error("[me.requests.phone]", rpcErr);
      return toSentRequest(r, phone ?? null);
    }),
  );
  return NextResponse.json({ role: "parent", requests });
}
