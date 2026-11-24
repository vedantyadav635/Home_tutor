import type { Metadata } from "next";
import { requirePageRole } from "@/lib/session";
import { loadOwnProfile } from "@/lib/tutor-profile";
import { ProfileBuilder } from "./ProfileBuilder";

export const metadata: Metadata = { title: "Your tutor profile" };

export default async function ProfilePage() {
  const { supabase, user } = await requirePageRole("tutor", "/dashboard/tutor/profile");
  const [own, account] = await Promise.all([
    loadOwnProfile(supabase, user.id),
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
  ]);
  return <ProfileBuilder initial={own.data ?? null} account={{ fullName: account.data?.full_name ?? "", phone: account.data?.phone ?? "" }} />;
}
