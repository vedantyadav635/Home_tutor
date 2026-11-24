import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Every error response: { error: { code, message, fields? } }
export type ApiError = { error: { code: string; message: string; fields?: Record<string, string[]> } };

export function apiError(status: number, code: string, message: string, fields?: Record<string, string[]>) {
  return NextResponse.json<ApiError>({ error: { code, message, ...(fields && { fields }) } }, { status });
}

type Result<T> = { data: T; response?: never } | { data?: never; response: NextResponse };

/** Reads the JSON body and validates it. On failure, `response` is a ready 400. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<Result<z.infer<S>>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { response: apiError(400, "invalid_json", "The request body must be valid JSON.") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      response: apiError(400, "validation_failed", "Please check the highlighted fields.", fieldErrors as Record<string, string[]>),
    };
  }
  return { data: parsed.data };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type Role = "parent" | "tutor" | "admin";

/** The signed-in user, or a 401 response. */
export async function requireUser(): Promise<Result<{ user: User; supabase: Supabase }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { response: apiError(401, "unauthorized", "Please log in to continue.") };
  return { data: { user: data.user, supabase } };
}

/** The signed-in user with the given role, or a 401/403 response. */
export async function requireRole(role: Role): Promise<Result<{ user: User; supabase: Supabase; role: Role }>> {
  const auth = await requireUser();
  if (auth.response) return auth;
  const { user, supabase } = auth.data;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== role) return { response: apiError(403, "forbidden", "You don't have access to this.") };
  return { data: { user, supabase, role } };
}

// Postgres errors -> HTTP. Raw messages are logged on the server, never sent to the client.
const PG_ERRORS: Record<string, [status: number, code: string, message: string]> = {
  "23505": [409, "conflict", "This already exists."],
  "23514": [400, "invalid", "Some of the details are not valid."],
  "42501": [403, "forbidden", "You don't have permission to do that."],
  P0002: [404, "not_found", "We couldn't find what you were looking for."],
  "22023": [400, "invalid", "Some of the details are not valid."],
  "53400": [429, "rate_limited", "Too many requests. Please try again later."],
};

/** `messages` lets a route give a friendlier, more specific message for a code (status stays the same). */
export function dbError(
  err: { code?: string; message?: string } | null | undefined,
  context = "db",
  messages: Partial<Record<keyof typeof PG_ERRORS, string>> = {},
) {
  console.error(`[${context}]`, err);
  const known = err?.code ? PG_ERRORS[err.code] : undefined;
  if (known) return apiError(known[0], known[1], messages[err!.code!] ?? known[2]);
  return apiError(500, "server_error", "Something went wrong. Please try again.");
}

/** Supabase Auth errors -> HTTP, with generic messages so accounts can't be probed. */
export function authError(err: { status?: number; code?: string; message?: string }, context = "auth") {
  console.error(`[${context}]`, err);
  if (err.status === 429 || err.code === "over_request_rate_limit" || err.code === "over_email_send_rate_limit")
    return apiError(429, "rate_limited", "Too many attempts. Please wait a few minutes and try again.");
  if (err.code === "invalid_credentials") return apiError(401, "invalid_credentials", "Email or password is incorrect.");
  if (err.code === "email_not_confirmed")
    return apiError(403, "email_not_confirmed", "Please confirm your email first. Check your inbox for the link.");
  if (err.code === "email_address_invalid" || err.code === "email_address_not_authorized")
    return apiError(400, "invalid_email", "Please use a different email address.", { email: ["This email address can't be used."] });
  if (err.code === "weak_password")
    return apiError(400, "weak_password", "Please choose a stronger password.", { password: ["Password is too weak."] });
  return apiError(400, "auth_failed", "We couldn't complete that request. Please try again.");
}

/** Indian mobile: accepts "+91 98765 43210", "098765-43210", "9876543210" -> "9876543210". */
export const indianMobile = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number."));

export const uuid = z.uuid();

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
