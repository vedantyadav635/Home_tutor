"use client";

import { useState } from "react";
import { fieldError, sendJson, type ApiFailure } from "@/lib/client-api";
import styles from "../forms.module.css";

export default function ContactPage() {
  const [error, setError] = useState<ApiFailure | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    const res = await sendJson("/api/contact", {
      name: f.get("name"), reach: f.get("reach"), senderType: f.get("senderType"),
      message: f.get("message"), website: f.get("website") || undefined,
    });
    setSending(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  if (done)
    return (
      <div className={styles.done}>
        <h1 className={styles.title}>Message sent</h1>
        <p>Thanks for writing. We&rsquo;ll reply on the number or email you gave.</p>
      </div>
    );

  const err = (n: string) => fieldError(error, n);

  return (
    <div className={styles.wide}>
      <h1 className={styles.title}>Contact us</h1>
      <p className={styles.sub}>Questions about a tutor, your account, or listing your classes.</p>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <label className="field">
            <span>Your name</span>
            <input className="input" name="name" autoComplete="name" required aria-invalid={!!err("name")} />
            {err("name") && <span className="field-error">{err("name")}</span>}
          </label>
          <label className="field">
            <span>Mobile or email</span>
            <input className="input" name="reach" autoComplete="email" required aria-invalid={!!err("reach")} />
            {err("reach") && <span className="field-error">{err("reach")}</span>}
          </label>
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: "0.5rem", padding: 0 }}>I&rsquo;m writing as a</legend>
          <div className="chips">
            {["Parent", "Tutor", "Other"].map((t) => (
              <label key={t} className="chip">
                <input type="radio" name="senderType" value={t} defaultChecked={t === "Parent"} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Message</span>
          <textarea className="input" name="message" required maxLength={2000} rows={5} aria-invalid={!!err("message")} />
          {err("message") && <span className="field-error">{err("message")}</span>}
        </label>
        <label className={styles.hp} aria-hidden="true">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
        {error && !error.fields && <p className="form-error" role="alert">{error.message}</p>}
        <button className="btn btn-primary btn-block" disabled={sending}>{sending ? "Sending…" : "Send message"}</button>
      </form>
    </div>
  );
}
