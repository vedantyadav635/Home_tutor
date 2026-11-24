"use client";

import { useRef, useState } from "react";
import { bandLabel } from "@/components/tutor";
import { fieldError, sendJson, type ApiFailure } from "@/lib/client-api";
import styles from "./request.module.css";

type Tutor = { id: string; firstName: string; subjects: string[]; classBands: string[]; modes: string[] };
type Me = { role: string; fullName: string | null; phone: string | null };

export function RequestDemo({ tutor }: { tutor: Tutor }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  async function open() {
    dialog.current?.showModal();
    if (me === null) {
      // Prefill for a signed-in parent. Logged-out visitors just get a 401 and an empty form.
      const res = await sendJson<Me>("/api/me", undefined, "GET");
      if (res.ok) setMe(res.data);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    const res = await sendJson("/api/demo-requests", {
      tutorId: tutor.id,
      parentName: f.get("parentName"),
      parentPhone: f.get("parentPhone"),
      classBand: f.get("classBand"),
      subject: f.get("subject"),
      mode: f.get("mode"),
      message: f.get("message") || undefined,
      website: f.get("website") || undefined,
    });
    if (res.ok) setState("sent");
    else { setError(res.error); setState("idle"); }
  }

  const err = (name: string) => fieldError(error, name);

  return (
    <>
      <button type="button" className="btn btn-primary btn-block" onClick={open}>Request a demo class</button>

      <dialog ref={dialog} className={styles.dialog} aria-labelledby="request-title" onClose={() => state === "sent" && setState("idle")}>
        <div className={styles.top}>
          <h2 id="request-title">{state === "sent" ? "Request sent" : `Ask ${tutor.firstName} for a demo class`}</h2>
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
        </div>

        {state === "sent" ? (
          <div className={styles.sent}>
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className={styles.tick}>
              <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M13 22.5l6 6 12-13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>{tutor.firstName} will call you on the number you gave to fix a time for the demo class. You can see this request any time in your account if you&rsquo;re logged in.</p>
            <button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>Done</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate key={me ? "me" : "guest"}>
            <div className={styles.row}>
              <label className="field">
                <span>Your name</span>
                <input className="input" name="parentName" autoComplete="name" required defaultValue={me?.fullName ?? ""} aria-invalid={!!err("parentName")} />
                {err("parentName") && <span className="field-error">{err("parentName")}</span>}
              </label>
              <label className="field">
                <span>Mobile number</span>
                <input className="input" name="parentPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" required defaultValue={me?.phone ?? ""} aria-invalid={!!err("parentPhone")} />
                {err("parentPhone") && <span className="field-error">{err("parentPhone")}</span>}
              </label>
            </div>
            <div className={styles.row3}>
              <label className="field">
                <span>Class</span>
                <select className="input" name="classBand" required defaultValue={tutor.classBands.length === 1 ? tutor.classBands[0] : ""}>
                  <option value="" disabled>Choose</option>
                  {tutor.classBands.map((b) => <option key={b} value={b}>{bandLabel(b)}</option>)}
                </select>
                {err("classBand") && <span className="field-error">Choose a class.</span>}
              </label>
              <label className="field">
                <span>Subject</span>
                <select className="input" name="subject" required defaultValue={tutor.subjects.length === 1 ? tutor.subjects[0] : ""}>
                  <option value="" disabled>Choose</option>
                  {tutor.subjects.map((s) => <option key={s}>{s}</option>)}
                </select>
                {err("subject") && <span className="field-error">Choose a subject.</span>}
              </label>
              <label className="field">
                <span>Mode</span>
                <select className="input" name="mode" required defaultValue={tutor.modes.length === 1 ? tutor.modes[0] : ""}>
                  <option value="" disabled>Choose</option>
                  {tutor.modes.map((m) => <option key={m}>{m}</option>)}
                </select>
                {err("mode") && <span className="field-error">Choose a mode.</span>}
              </label>
            </div>
            <label className="field">
              <span>Anything {tutor.firstName} should know? <em className={styles.optional}>Optional</em></span>
              <textarea className="input" name="message" maxLength={1000} placeholder="Board, school, topics your child finds hard, preferred days" />
            </label>
            {/* Honeypot: hidden from people, bots fill it in */}
            <label className={styles.hp} aria-hidden="true">
              Website <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            {error && !error.fields && <p className="form-error" role="alert">{error.message}</p>}
            <button className="btn btn-primary btn-block" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send request"}
            </button>
            <p className={styles.note}>Your number goes only to {tutor.firstName}.</p>
          </form>
        )}
      </dialog>
    </>
  );
}
