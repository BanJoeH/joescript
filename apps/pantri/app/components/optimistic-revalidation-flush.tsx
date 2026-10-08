/**
 * No-op: batched optimistic revalidation is disabled. Kept mounted so the
 * pantry layout import stays stable.
 */
export function OptimisticRevalidationFlush() {
  return null;
}
