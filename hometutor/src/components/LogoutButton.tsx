"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
          router.refresh();
        })
      }
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
