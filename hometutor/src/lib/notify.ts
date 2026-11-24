import "server-only";

// ponytail: log only. Email/WhatsApp delivery is a later step; keep this the single entry point.
export async function notifyTutorOfRequest(request: { id: string; tutorId: string; subject: string; classBand: string; mode: string }) {
  // No parent name or phone in logs.
  console.info("[notify] new demo request", request);
}
