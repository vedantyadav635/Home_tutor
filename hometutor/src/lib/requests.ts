import "server-only";
import { REQUEST_COLUMNS, toReceivedRequest, toSentRequest } from "@/lib/mappers";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const REQUEST_STATUSES = ["new", "contacted", "accepted", "declined", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Requests sent to this tutor, newest first. */
export async function receivedRequests(supabase: Supabase, tutorId: string, status?: RequestStatus) {
  let q = supabase.from("demo_requests").select(REQUEST_COLUMNS).eq("tutor_id", tutorId).order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return { error };
  return { data: data.map(toReceivedRequest) };
}

/** Requests this parent sent, newest first. The tutor's phone comes only from the RPC, which checks accepted + caller. */
export async function sentRequests(supabase: Supabase, parentId: string, status?: RequestStatus) {
  let q = supabase
    .from("demo_requests")
    .select(`${REQUEST_COLUMNS}, tutors (full_name, slug)`)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return { error };
  const requests = await Promise.all(
    data.map(async (r) => {
      if (r.status !== "accepted") return toSentRequest(r, null);
      const { data: phone, error: rpcErr } = await supabase.rpc("tutor_contact_for_request", { request_id: r.id });
      if (rpcErr) console.error("[requests.phone]", rpcErr);
      return toSentRequest(r, phone ?? null);
    }),
  );
  return { data: requests };
}

export async function requestSummary(supabase: Supabase, tutorId: string) {
  const { data, error } = await supabase.from("demo_requests").select("status").eq("tutor_id", tutorId);
  if (error) return { error };
  const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
  for (const r of data) counts[r.status as RequestStatus]++;
  return { data: { ...counts, total: data.length } };
}
