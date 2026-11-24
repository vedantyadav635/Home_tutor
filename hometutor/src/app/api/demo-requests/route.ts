import { NextResponse } from "next/server";
import { z } from "zod";
import { dbError, indianMobile, parseBody, uuid } from "@/lib/api";
import { notifyTutorOfRequest } from "@/lib/notify";
import { CLASS_BANDS, MODES, SUBJECTS } from "@/lib/options";
import { createClient } from "@/lib/supabase/server";

const DemoRequest = z.object({
  tutorId: uuid,
  parentName: z.string().trim().min(2, "Please enter your name.").max(100),
  parentPhone: indianMobile,
  classBand: z.enum(CLASS_BANDS.map((b) => b.value) as [string, ...string[]]),
  subject: z.enum(SUBJECTS),
  mode: z.enum(MODES),
  message: z.string().trim().max(1000).optional(),
  website: z.string().optional(), // honeypot: hidden in the form, only bots fill it
});

// Public. A signed-in parent is linked by the database trigger (parent_id = auth.uid()).
export async function POST(req: Request) {
  const body = await parseBody(req, DemoRequest);
  if (body.response) return body.response;
  const b = body.data;

  // Bot: pretend it worked, save nothing.
  if (b.website?.trim()) return NextResponse.json({ id: crypto.randomUUID() }, { status: 201 });

  // Logged-out visitors can't read rows back (RLS), so the id is generated here.
  const id = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("demo_requests").insert({
    id,
    tutor_id: b.tutorId,
    parent_name: b.parentName,
    parent_phone: b.parentPhone,
    class_band: b.classBand,
    subject: b.subject,
    mode: b.mode,
    message: b.message || null,
  });
  if (error)
    return dbError(error, "demo-requests.create", {
      "23505": "You already have an open request with this tutor.",
      "53400": "Too many requests today, please try tomorrow.",
      P0002: "This tutor isn't taking requests right now.",
      "22023": "This tutor doesn't teach that subject, class or mode.",
      "23514": "Some of the details are not valid.",
    });

  await notifyTutorOfRequest({ id, tutorId: b.tutorId, subject: b.subject, classBand: b.classBand, mode: b.mode });
  return NextResponse.json({ id }, { status: 201 });
}
