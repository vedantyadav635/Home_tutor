"use client";

import Link from "next/link";
import { useState } from "react";
import { fieldError, sendJson, type ApiFailure } from "@/lib/client-api";
import styles from "../forms.module.css";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<ApiFailure | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await sendJson("/api/auth/forgot-password", { email: new FormData(e.currentTarget).get("email") });
    setSending(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  if (done)
    return (
      <div className={styles.done}>
        <h1 className={styles.title}>Check your email</h1>
        <p>If an account exists for that address, a link to set a new password is on its way. It works once.</p>
        <Link href="/login" className="link">Back to log in</Link>
      </div>
    );

  return (
    <>
      <h1 className={styles.title}>Reset your password</h1>
      <p className={styles.sub}>Enter the email you signed up with and we&rsquo;ll send you a link.</p>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label className="field">
          <span>Email</span>
          <input className="input" name="email" type="email" autoComplete="email" required aria-invalid={!!fieldError(error, "email")} />
          {fieldError(error, "email") && <span className="field-error">{fieldError(error, "email")}</span>}
        </label>
        {error && !error.fields && <p className="form-error" role="alert">{error.message}</p>}
        <button className="btn btn-primary btn-block" disabled={sending}>{sending ? "Sending…" : "Send reset link"}</button>
      </form>
      <p className={styles.foot}><Link href="/login" className="link">Back to log in</Link></p>
    </>
  );
}
