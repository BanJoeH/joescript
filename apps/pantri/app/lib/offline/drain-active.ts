/** In-memory drain cursor so SPA remounts still finalize the active outbox row. */
const activeByPantry = new Map<string, string>();

export function setActiveDrainEntry(pantryId: string, entryId: string) {
  activeByPantry.set(pantryId, entryId);
}

export function clearActiveDrainEntry(pantryId: string, entryId?: string) {
  const current = activeByPantry.get(pantryId);
  if (entryId != null && current !== entryId) return;
  activeByPantry.delete(pantryId);
}

export function getActiveDrainEntry(pantryId: string): string | null {
  return activeByPantry.get(pantryId) ?? null;
}
