import { NextResponse } from "next/server";
import { z } from "zod";
import { dbError, indianMobile, parseBody } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const Contact = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  // A mobile number or an email address.
  reach: z
    .string()
    .trim()
    .max(200)
    .refine((s) => z.email().safeParse(s).success || indianMobile.safeParse(s).success, "Enter a mobile number or email address."),
  senderType: z.enum(["Parent", "Tutor", "Other"]),
  message: z.string().trim().min(5, "Please write a short message.").max(2000),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const body = await parseBody(req, Contact);
  if (body.response) return body.response;
  const b = body.data;
  if (b.website?.trim()) return NextResponse.json({ ok: true }, { status: 201 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .insert({ name: b.name, reach: b.reach, sender_type: b.senderType, message: b.message });
  if (error)
    return dbError(error, "contact.create", { "53400": "You've sent several messages today. We'll reply soon; please try again tomorrow." });
  return NextResponse.json({ ok: true }, { status: 201 });
}
