import { NextResponse } from "next/server";
import { z } from "zod";
import { authError, parseBody } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const Login = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Please enter your password."),
});

export async function POST(req: Request) {
  const body = await parseBody(req, Login);
  if (body.response) return body.response;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(body.data);
  if (error) return authError(error, "login");

  return NextResponse.json({ ok: true });
}
