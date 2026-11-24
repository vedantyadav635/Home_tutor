// Browser-side helper for our JSON API. Errors come back in the shared shape: { error: { code, message, fields? } }.
export type ApiFailure = { code: string; message: string; fields?: Record<string, string[]> };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiFailure };

export async function sendJson<T = unknown>(url: string, body?: unknown, method = "POST"): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, status: res.status, error: json?.error ?? { code: "server_error", message: "Something went wrong. Please try again." } };
  } catch {
    return { ok: false, status: 0, error: { code: "network", message: "You seem to be offline. Check your connection and try again." } };
  }
}

/** First error message for a field, if any. */
export const fieldError = (err: ApiFailure | null, name: string) => err?.fields?.[name]?.[0];
