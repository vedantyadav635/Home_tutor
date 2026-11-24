import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, siteUrl } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const Forgot = z.object({ email: z.email().trim().toLowerCase() });

export async function POST(req: Request) {
  const body = await parseBody(req, Forgot);
  if (body.response) return body.response;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(body.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) console.error("[forgot-password]", error);

  // Always 200 so nobody can find out which emails have accounts.
  return NextResponse.json({ ok: true, message: "If an account exists for that email, we've sent a reset link." });
}
