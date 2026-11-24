"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fieldError, sendJson, type ApiFailure } from "@/lib/client-api";
import styles from "../forms.module.css";

type Role = "parent" | "tutor";

export function SignupForm({ initialRole }: { initialRole: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    const email = String(f.get("email") ?? "");
    const res = await sendJson<{ needsEmailConfirmation: boolean }>("/api/auth/signup", {
      role,
      fullName: f.get("fullName"),
      email,
      phone: f.get("phone") || undefined,
      password: f.get("password"),
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    if (res.data.needsEmailConfirmation) return setSentTo(email);
    router.push(`/dashboard/${role}`);
    router.refresh();
  }

  if (sentTo)
    return (
      <div className={styles.done}>
        <h1 className={styles.title}>Check your email</h1>
        <p>We sent a confirmation link to <strong>{sentTo}</strong>. Open it on this device to finish creating your account.</p>
        <p className={styles.small}>Nothing there after a few minutes? Check your spam folder, or <button type="button" className="link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => setSentTo(null)}>try a different email</button>.</p>
      </div>
    );

  const err = (n: string) => fieldError(error, n);

  return (
    <>
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.sub}>{role === "tutor" ? "You'll build your tutor profile right after this." : "Save tutors and keep track of your demo requests."}</p>
      <form className={styles.form} onSubmit={submit} noValidate>
        <fieldset className={styles.roles}>
          <legend>I am a</legend>
          <label className={styles.role}>
            <input type="radio" name="role" value="parent" checked={role === "parent"} onChange={() => setRole("parent")} />
            <strong>Parent</strong>
            <small>Looking for a tutor</small>
          </label>
          <label className={styles.role}>
            <input type="radio" name="role" value="tutor" checked={role === "tutor"} onChange={() => setRole("tutor")} />
            <strong>Tutor</strong>
            <small>Looking for students</small>
          </label>
        </fieldset>
        <label className="field">
          <span>Full name</span>
          <input className="input" name="fullName" autoComplete="name" required aria-invalid={!!err("fullName")} />
          {err("fullName") && <span className="field-error">{err("fullName")}</span>}
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" name="email" type="email" autoComplete="email" required aria-invalid={!!err("email")} />
          {err("email") && <span className="field-error">{err("email")}</span>}
        </label>
        <label className="field">
          <span>Mobile number <span className={styles.optional}>Optional</span></span>
          <input className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!err("phone")} />
          {err("phone") ? <span className="field-error">{err("phone")}</span> : <small>{role === "tutor" ? "Shown to parents only after you accept their request." : "Fills in your demo requests for you."}</small>}
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={!!err("password")} />
          {err("password") ? <span className="field-error">{err("password")}</span> : <small>At least 8 characters.</small>}
        </label>
        {error && !error.fields && <p className="form-error" role="alert">{error.message}</p>}
        <button className="btn btn-primary btn-block" disabled={sending}>{sending ? "Creating account…" : "Create account"}</button>
      </form>
      <p className={styles.foot}>Already have an account? <Link href="/login" className="link">Log in</Link></p>
    </>
  );
}
