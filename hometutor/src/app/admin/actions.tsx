"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendJson } from "@/lib/client-api";

function usePatch(url: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const patch = (body: Record<string, unknown>, after?: () => void) => {
    setError(null);
    start(async () => {
      const res = await sendJson(url, body, "PATCH");
      if (!res.ok) return setError(res.error.fields ? Object.values(res.error.fields).flat()[0] : res.error.message);
      after?.();
      router.refresh();
    });
  };
  return { pending, error, patch };
}

/** Approve / send back / Verified / Featured for one tutor. */
export function TutorReview({ id, status, verified, featured }: { id: string; status: string; verified: boolean; featured: boolean }) {
  const { pending, error, patch } = usePatch(`/api/admin/tutors/${id}`);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div style={{ display: "grid", gap: "0.6rem", marginTop: "0.4rem" }}>
      {rejecting ? (
        <div style={{ display: "grid", gap: "0.5rem", maxWidth: "52ch" }}>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
            placeholder="What should the tutor fix? They'll see this note." aria-label="Note to the tutor" autoFocus />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-danger btn-sm" disabled={pending || !note.trim()} onClick={() => patch({ status: "rejected", reviewNote: note }, () => setRejecting(false))}>
              Send back to tutor
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(status === "pending" || status === "rejected") && (
            <>
              <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => patch({ status: "approved", verified: true, reviewNote: null })}>Approve and verify</button>
              <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => patch({ status: "approved", reviewNote: null })}>Approve without badge</button>
            </>
          )}
          {status === "approved" && (
            <>
              <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => patch({ verified: !verified })}>{verified ? "Remove Verified badge" : "Add Verified badge"}</button>
              <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => patch({ featured: !featured })}>{featured ? "Stop featuring" : "Feature on home page"}</button>
            </>
          )}
          {(status === "pending" || status === "approved") && (
            <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => setRejecting(true)}>
              {status === "approved" ? "Take down" : "Send back"}
            </button>
          )}
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function MessageAction({ id, handled }: { id: string; handled: boolean }) {
  const { pending, error, patch } = usePatch(`/api/admin/contact-messages/${id}`);
  return (
    <>
      <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => patch({ handled: !handled })}>
        {handled ? "Mark as not answered" : "Mark as answered"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}
