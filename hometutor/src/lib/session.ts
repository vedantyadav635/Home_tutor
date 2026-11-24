import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export const dashboardFor = (role: Role) => (role === "admin" ? "/admin" : `/dashboard/${role}`);

/**
 * For dashboard pages: the signed-in user with this role.
 * Logged out -> /login?next=<path>. Wrong role -> their own dashboard.
 */
export async function requirePageRole(role: Role, path: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", data.user.id).maybeSingle();
  const actual = (profile?.role ?? "parent") as Role;
  if (actual !== role) redirect(dashboardFor(actual));

  return { supabase, user: data.user, firstName: profile?.full_name?.split(" ")[0] ?? null };
}
