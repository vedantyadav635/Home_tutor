import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email confirmation / password reset links land here with ?code=...
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!code) return to("/login?error=missing_code");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback]", error);
    return to("/login?error=link_expired");
  }

  // Only same-site relative paths, so the link can't be used as an open redirect.
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return to(next);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return to(profile?.role === "tutor" ? "/dashboard/tutor" : "/dashboard/parent");
}
