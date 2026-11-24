import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  // Only same-site paths, so ?next= can't send people elsewhere.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
  const notice =
    error === "link_expired" ? "That link has expired or was already used. Log in, or ask for a new link." :
    error === "missing_code" ? "That link is incomplete. Open it again from your email." : null;
  return <LoginForm next={safeNext} notice={notice} />;
}
