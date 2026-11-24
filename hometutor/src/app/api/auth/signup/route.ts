import { NextResponse } from "next/server";
import { z } from "zod";
import { authError, parseBody, siteUrl } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const Signup = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
  fullName: z.string().trim().min(2, "Please enter your full name.").max(100),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{10,13}$/, "Enter a 10-digit mobile number."))
    .optional(),
  role: z.enum(["parent", "tutor"]),
});

export async function POST(req: Request) {
  const body = await parseBody(req, Signup);
  if (body.response) return body.response;
  const { email, password, fullName, phone, role } = body.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName, phone },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });
  if (error) return authError(error, "signup");

  // Same response whether or not the email was already registered (Supabase hides that too).
  return NextResponse.json({ ok: true, needsEmailConfirmation: !data.session }, { status: 201 });
}
