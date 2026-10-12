/**
 * Strict success detection for shopping action JSON / fetcher.data.
 * Never treats HTML, redirects, or `{ error }` as success.
 */
export type ActionInterpretResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: string };

export function interpretActionData(data: unknown): ActionInterpretResult {
  if (data == null) {
    return { ok: false, reason: "Empty action response." };
  }
  if (typeof data !== "object") {
    return { ok: false, reason: "Action response was not JSON." };
  }

  const record = data as Record<string, unknown>;

  if ("error" in record && record.error != null && String(record.error).length > 0) {
    return { ok: false, reason: String(record.error) };
  }

  if (record.ok === true) {
    return { ok: true, data: record };
  }

  return { ok: false, reason: "Action response missing ok:true." };
}

export function interpretFetchResponseMeta(response: Response): ActionInterpretResult | null {
  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: "Not authenticated." };
  }
  if (response.redirected && /\/login\b/i.test(response.url)) {
    return { ok: false, reason: "Redirected to login." };
  }
  if (response.type === "opaqueredirect") {
    return { ok: false, reason: "Opaque redirect." };
  }
  // null = continue to body parsing (used if we ever drain via raw fetch)
  return null;
}
