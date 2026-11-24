import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <SignupForm initialRole={role === "tutor" ? "tutor" : "parent"} />;
}
