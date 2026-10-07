import {
  applyShoppingFormToSnapshot,
  entriesToFormData,
  formDataToEntries,
  SHOPPING_OUTBOX_INTENTS,
} from "~/lib/offline/apply-mutation";
import { getIsOnline, notifyOutboxChanged } from "~/lib/offline/connectivity";
import { getOfflineDb, type OutboxEntry, recipeDetailKey } from "~/lib/offline/db";
import {
  getHomeSnapshot,
  type HomeLoaderSnapshot,
  updateHomeSnapshot,
} from "~/lib/offline/snapshot";

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
  if (!contentType.includes("application/json")) {
    return { ok: true };
  }

  try {
    const body = (await response.clone().json()) as { error?: unknown };
    if (typeof body?.error === "string" && body.error.length > 0) {
      return { ok: false, error: body.error };
    }
  } catch {
    // Non-JSON body with a JSON content-type — treat status as authoritative.
  }

  return { ok: true };
}

export async function drainOutbox(options?: { pantryId?: string }): Promise<{
  sent: number;
  failed: number;
}> {
  if (!getIsOnline() || draining) return { sent: 0, failed: 0 };
  draining = true;
  let sent = 0;
  let failed = 0;

  try {
    const pending = await listOutbox(options?.pantryId);
    for (const entry of pending) {
      try {
        const response = await fetch(entry.actionUrl, {
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
