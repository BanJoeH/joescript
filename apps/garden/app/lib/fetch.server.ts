export const UPSTREAM_FETCH_TIMEOUT_MS = 5000;

export async function fetchWithTimeout(
  url: string | URL,
  init?: RequestInit,
  timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
