import { UNSAFE_decodeViaTurboStream as decodeViaTurboStream } from "react-router";

import {
  applyShoppingFormToSnapshot,
  entriesToFormData,
  formDataToEntries,
  SHOPPING_OUTBOX_INTENTS,
} from "~/lib/offline/apply-mutation";
import { getIsOnline, notifyOutboxChanged, probeOnlineStatus } from "~/lib/offline/connectivity";
import { getOfflineDb, type OutboxEntry, recipeDetailKey } from "~/lib/offline/db";
import {
  getHomeSnapshot,
  type HomeLoaderSnapshot,
  updateHomeSnapshot,
} from "~/lib/offline/snapshot";

/**
 * React Router single-fetch posts actions to `path.data` (turbo-stream), not the
 * document URL. Document POSTs return HTML where `{ error }` is invisible to us —
 * we used to treat those 200s as success and drop the outbox entry.
 */
export function toSingleFetchActionUrl(actionUrl: string): string {
  const url = new URL(actionUrl, "https://pantri.local");
  if (url.pathname.endsWith(".data")) {
    return `${url.pathname}${url.search}`;
  }
  url.pathname = url.pathname.endsWith("/")
    ? `${url.pathname}_.data`
    : `${url.pathname}.data`;
  return `${url.pathname}${url.search}`;
}

export async function enqueueOutbox(options: {
  pantryId: string;
  actionUrl: string;
  formData: FormData;
}): Promise<OutboxEntry> {
  const formData = options.formData;
  const intent = String(formData.get("intent") ?? "");
  // Stable client id so later toggles/removes target the same row the server creates.
  if (intent === "add-to-shopping" && !String(formData.get("shoppingRecipeId") ?? "").trim()) {
    formData.set("shoppingRecipeId", crypto.randomUUID());
  }

  const entry: OutboxEntry = {
    id: crypto.randomUUID(),
    pantryId: options.pantryId,
    actionUrl: options.actionUrl,
    formEntries: formDataToEntries(formData),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  await getOfflineDb().outbox.add(entry);
  await applyOutboxEntryLocally(entry);
  notifyOutboxChanged();
  return entry;
}

export async function listOutbox(pantryId?: string) {
  const db = getOfflineDb();
  if (pantryId) {
    return db.outbox.where("pantryId").equals(pantryId).sortBy("createdAt");
  }
  return db.outbox.orderBy("createdAt").toArray();
}

export async function countOutbox(pantryId?: string) {
  const rows = await listOutbox(pantryId);
  return rows.length;
}

async function applyOutboxEntryLocally(entry: OutboxEntry) {
  const map = new Map(entry.formEntries);
  const intent = map.get("intent") ?? "";

  if (SHOPPING_OUTBOX_INTENTS.has(intent)) {
    await updateHomeSnapshot(entry.pantryId, (current) =>
      applyShoppingFormToSnapshot(current, entry.formEntries),
    );
  }
}

/**
 * After an online home snapshot write, re-apply queued mutations so the UI/IDB
 * keep pending optimism until drain succeeds.
 */
export async function applyPendingOutboxToHomeSnapshot(
  pantryId: string,
): Promise<HomeLoaderSnapshot | null> {
  const pending = await listOutbox(pantryId);
  if (pending.length === 0) {
    return getHomeSnapshot(pantryId);
  }

  await updateHomeSnapshot(pantryId, (current) => {
    let next = current;
    for (const entry of pending) {
      const intent = new Map(entry.formEntries).get("intent") ?? "";
      if (SHOPPING_OUTBOX_INTENTS.has(intent)) {
        next = applyShoppingFormToSnapshot(next, entry.formEntries);
      }
    }
    return next;
  });

  return getHomeSnapshot(pantryId);
}

let draining = false;

function isAuthRedirect(location: string | null): boolean {
  if (!location) return false;
  try {
    const path = new URL(location, "https://pantri.local").pathname;
    return path === "/login" || path.startsWith("/api/auth");
  } catch {
    return false;
  }
}

/** True when an action response means the mutation landed (not a login bounce). */
export function isSuccessfulOutboxResponse(response: Response): boolean {
  if (response.ok) return true;
  if (response.status < 300 || response.status >= 400) return false;

  // RR actions often redirect on success. Auth/session redirects must keep the entry.
  const location = response.headers.get("Location") ?? "";
  if (!location || isAuthRedirect(location)) return false;
  return true;
}

function actionPayloadError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const error = (data as { error?: unknown }).error;
  return typeof error === "string" && error.length > 0 ? error : null;
}

/** 200 + `{ error }` still means the mutation did not land — keep the outbox entry. */
export async function interpretOutboxResponse(response: Response): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSuccessfulOutboxResponse(response)) {
    const location = response.headers.get("Location");
    const detail =
      response.status >= 300 && response.status < 400 && location
        ? `HTTP ${response.status} → ${location}`
        : `HTTP ${response.status}`;
    return { ok: false, error: detail };
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  // Document HTML hides returned `{ error }` — never treat as a confirmed mutation.
  if (contentType.includes("text/html")) {
    return { ok: false, error: "Unexpected HTML response from action" };
  }

  if (contentType.includes("application/json")) {
    try {
      const body = (await response.clone().json()) as unknown;
      const error = actionPayloadError(body);
      if (error) return { ok: false, error };
    } catch {
      // Non-JSON body with a JSON content-type — treat status as authoritative.
    }
    return { ok: true };
  }

  // Single-fetch actions: turbo-stream `{ data: T }`, `{ error }`, or `{ redirect }`.
  if (contentType.includes("text/x-script") && response.body) {
    try {
      const decoded = await decodeViaTurboStream(response.body, globalThis);
      const value = decoded.value as {
        data?: unknown;
        error?: unknown;
        redirect?: unknown;
      };
      if (value && typeof value === "object") {
        if ("redirect" in value && value.redirect != null) {
          const location =
            typeof value.redirect === "string"
              ? value.redirect
              : typeof value.redirect === "object" &&
                  value.redirect &&
                  "redirect" in value.redirect
                ? String((value.redirect as { redirect: unknown }).redirect)
                : String(value.redirect);
          if (isAuthRedirect(location)) {
            return { ok: false, error: `HTTP ${response.status} → ${location}` };
          }
          return { ok: true };
        }
        if ("error" in value && value.error != null) {
          const err = value.error;
          return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
        const payloadError = actionPayloadError(value.data);
        if (payloadError) return { ok: false, error: payloadError };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not decode action response" };
    }
  }

  // Unknown success body (e.g. empty 204) — status already passed.
  return { ok: true };
}

export async function drainOutbox(options?: { pantryId?: string }): Promise<{
  sent: number;
  failed: number;
}> {
  // Online event can fire before the probe flips effectiveOnline — wait for it.
  if (typeof window !== "undefined") {
    await probeOnlineStatus();
  }
  if (!getIsOnline() || draining) return { sent: 0, failed: 0 };
  draining = true;
  let sent = 0;
  let failed = 0;

  try {
    const pending = await listOutbox(options?.pantryId);
    for (const entry of pending) {
      try {
        const response = await fetch(toSingleFetchActionUrl(entry.actionUrl), {
          method: "POST",
          body: entriesToFormData(entry.formEntries),
          credentials: "same-origin",
          redirect: "manual",
        });
        const result = await interpretOutboxResponse(response);
        if (result.ok) {
          await getOfflineDb().outbox.delete(entry.id);
          sent += 1;
        } else {
          failed += 1;
          await getOfflineDb().outbox.update(entry.id, {
            attempts: entry.attempts + 1,
            lastError: result.error ?? `HTTP ${response.status}`,
          });
          // Auth failures won't succeed on retry until the user signs in again.
          if (isAuthRedirect(response.headers.get("Location"))) break;
        }
      } catch (error) {
        failed += 1;
        await getOfflineDb().outbox.update(entry.id, {
          attempts: entry.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }
  } finally {
    draining = false;
    // Only notify when the queue changed — avoids OutboxDrain ↔ drain feedback loops.
    if (sent > 0 || failed > 0) {
      notifyOutboxChanged({ sent, failed });
    }
  }

  return { sent, failed };
}

export function shouldQueueIntent(intent: string) {
  return SHOPPING_OUTBOX_INTENTS.has(intent);
}

/**
 * Submit a pantry action online, or queue when the browser reports offline.
 * Uses fetcher when online (optimistic UI); outbox when `navigator.onLine` is false.
 */
export async function submitOrQueue(options: {
  pantryId: string;
  actionUrl: string;
  formData: FormData;
  fetcherSubmit?: (formData: FormData, opts: { method: "post"; action: string }) => void;
}): Promise<"queued" | "sent"> {
  const intent = String(options.formData.get("intent") ?? "");
  if (!getIsOnline() && shouldQueueIntent(intent)) {
    await enqueueOutbox(options);
    return "queued";
  }

  if (options.fetcherSubmit) {
    options.fetcherSubmit(options.formData, { method: "post", action: options.actionUrl });
    return "sent";
  }

  const response = await fetch(options.actionUrl, {
    method: "POST",
    body: options.formData,
    credentials: "same-origin",
    redirect: "follow",
  });
  if (!response.ok && response.status !== 0) {
    throw new Error(`Action failed (${response.status})`);
  }
  return "sent";
}

/** Start listening for online/focus to drain the outbox. Returns cleanup. */
export function startOutboxDrainLoop() {
  if (typeof window === "undefined") return () => {};

  const run = () => {
    void drainOutbox();
  };

  window.addEventListener("online", run);
  window.addEventListener("focus", run);
  const interval = window.setInterval(run, 15_000);
  run();

  return () => {
    window.removeEventListener("online", run);
    window.removeEventListener("focus", run);
    window.clearInterval(interval);
  };
}

export async function cacheSharePayload(token: string, payload: unknown) {
  await getOfflineDb().shareCache.put({
    token,
    fetchedAt: new Date().toISOString(),
    payload,
  });
}

export async function getCachedSharePayload(token: string) {
  return getOfflineDb().shareCache.get(token);
}

export async function rememberPhotoUrl(url: string) {
  await getOfflineDb().photoMeta.put({
    url,
    fetchedAt: new Date().toISOString(),
  });
}

export function recipeDetailCacheKey(pantryId: string, recipeId: string) {
  return recipeDetailKey(pantryId, recipeId);
}
