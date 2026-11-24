"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fieldError, sendJson, type ApiFailure } from "@/lib/client-api";
import styles from "../forms.module.css";

export function LoginForm({ next, notice }: { next: string | null; notice: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<ApiFailure | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    const res = await sendJson("/api/auth/login", { email: f.get("email"), password: f.get("password") });
    if (!res.ok) { setError(res.error); setSending(false); return; }

    let to = next;
    if (!to) {
      const me = await sendJson<{ role: string }>("/api/me", undefined, "GET");
      const role = me.ok ? me.data.role : "parent";
      to = role === "admin" ? "/admin" : `/dashboard/${role}`;
    }
    router.push(to);
    router.refresh();
  }

  return (
    <>
      <h1 className={styles.title}>Log in</h1>
      <p className={styles.sub}>Welcome back. Parents and tutors use the same login.</p>
      {notice && <p className="form-error" style={{ marginTop: "1.25rem" }}>{notice}</p>}
      <form className={styles.form} onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input className="input" name="email" type="email" autoComplete="email" required aria-invalid={!!fieldError(error, "email")} />
          {fieldError(error, "email") && <span className="field-error">{fieldError(error, "email")}</span>}
        </label>
        <label className="field">
          <span className={styles.between}>
            Password
            <Link href="/forgot-password" className={`link ${styles.small}`}>Forgot password?</Link>
          </span>
          <input className="input" name="password" type="password" autoComplete="current-password" required />
        </label>
        {error && !error.fields && <p className="form-error" role="alert">{error.message}</p>}
        <button className="btn btn-primary btn-block" disabled={sending}>{sending ? "Logging in…" : "Log in"}</button>
      </form>
      <p className={styles.foot}>New here? <Link href="/signup" className="link">Create an account</Link></p>
    </>
  );
}
