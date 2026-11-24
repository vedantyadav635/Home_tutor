"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendJson, type ApiFailure } from "@/lib/client-api";

const FIELD_STEP: Record<string, string> = {
  fullName: "name", qualification: "qualification", phone: "mobile number", city: "city", area: "area",
  subjects: "subjects", classBands: "classes", modes: "teaching mode", languages: "language",
  bio: "short introduction", availability: "timings", fee: "fees",
};

/** Submit for review, or take the profile offline. */
export function ProfileAction({ action }: { action: "submit" | "unpublish" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<ApiFailure | null>(null);

  function run() {
    if (action === "unpublish" && !confirm("Take your profile offline? Parents won't find you until you submit it again.")) return;
    setError(null);
    start(async () => {
      const res = await sendJson(`/api/me/tutor-profile/${action}`);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem", justifyItems: "end" }}>
      <button type="button" className={action === "submit" ? "btn btn-primary" : "btn btn-quiet"} onClick={run} disabled={pending}>
        {action === "submit" ? (pending ? "Submitting…" : "Submit for review") : pending ? "Taking offline…" : "Take offline"}
      </button>
      {error && (
        <p className="field-error" role="alert" style={{ maxWidth: "34ch", textAlign: "right" }}>
          {error.code === "incomplete" && error.fields
            ? <>Still missing: {Object.keys(error.fields).map((f) => FIELD_STEP[f] ?? f).join(", ")}. <Link href="/dashboard/tutor/profile" className="link">Finish profile</Link></>
            : error.message}
        </p>
      )}
    </div>
  );
}

const NEXT: Record<string, { status: string; label: string; quiet?: boolean; danger?: boolean }[]> = {
  new: [
    { status: "accepted", label: "Accept" },
    { status: "contacted", label: "Mark as contacted", quiet: true },
    { status: "declined", label: "Decline", danger: true },
  ],
  contacted: [
    { status: "accepted", label: "Accept" },
    { status: "declined", label: "Decline", danger: true },
  ],
  accepted: [{ status: "closed", label: "Close", quiet: true }],
  declined: [],
  closed: [],
};

/** Status buttons and a private note for one request. */
export function RequestActions({ id, status, note }: { id: string; status: string; note: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note ?? "");

  function update(body: { status?: string; tutorNote?: string }) {
    setError(null);
    start(async () => {
      const res = await sendJson(`/api/demo-requests/${id}`, body, "PATCH");
      if (!res.ok) return setError(res.error.message);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.4rem" }}>
      {status === "accepted" && <p style={{ fontSize: "var(--t-xs)", color: "var(--ok)" }}>The parent can now see your mobile number.</p>}
      {editing ? (
        <div style={{ display: "grid", gap: "0.5rem", maxWidth: "48ch" }}>
          <textarea className="input" rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Only you can see this, e.g. demo fixed for Monday 6 pm" aria-label="Private note" />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => update({ tutorNote: text })}>Save note</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setEditing(false); setText(note ?? ""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        note && <p style={{ fontSize: "var(--t-sm)", color: "var(--ink-2)" }}><strong style={{ color: "var(--ink)" }}>Your note:</strong> {note}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {NEXT[status]?.map((a) => (
          <button key={a.status} type="button" disabled={pending} onClick={() => update({ status: a.status })}
            className={`btn btn-sm ${a.danger ? "btn-danger" : a.quiet ? "btn-quiet" : "btn-primary"}`}>
            {a.label}
          </button>
        ))}
        {!editing && status !== "declined" && status !== "closed" && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}>{note ? "Edit note" : "Add note"}</button>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
