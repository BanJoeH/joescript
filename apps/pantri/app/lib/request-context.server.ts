import type { Auth } from "~/lib/auth.server";
import type { Database } from "~/lib/db.server";
import type { createPantriService } from "~/services/pantri.service";
import type { createPantriesService, listPantriesForUser } from "~/services/pantries.service";

export type PantriSessionResult = {
  auth: Auth;
  session: NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
  db: Database;
};

export type PantriSessionContextResult = {
  session: PantriSessionResult["session"];
  db: Database;
  userId: string;
  userPantries: Awaited<ReturnType<typeof listPantriesForUser>>;
  pantries: ReturnType<typeof createPantriesService>;
};

export type PantriServiceResult = {
  pantri: ReturnType<typeof createPantriService>;
  session: PantriSessionResult["session"];
  context: import("~/services/types").PantriContext;
  userPantries: PantriSessionContextResult["userPantries"];
  pantryId: string;
  pantryName: string | null;
};

const sessionByRequest = new WeakMap<Request, Promise<PantriSessionResult | null>>();
const sessionContextByRequest = new WeakMap<Request, Promise<PantriSessionContextResult>>();
const pantriServiceByRequest = new WeakMap<Request, Map<string, Promise<PantriServiceResult>>>();

function getOrSet<T>(
  map: WeakMap<Request, Promise<T>>,
  request: Request,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = map.get(request);
  if (existing) {
    return existing;
  }

  const pending = factory();
  map.set(request, pending);
  return pending;
}

export function getCachedSession(
  request: Request,
  factory: () => Promise<PantriSessionResult | null>,
) {
  return getOrSet(sessionByRequest, request, factory);
}

export function getCachedSessionContext(
  request: Request,
  factory: () => Promise<PantriSessionContextResult>,
) {
  return getOrSet(sessionContextByRequest, request, factory);
}

export function getCachedPantriService(
  request: Request,
  pantryId: string,
  factory: () => Promise<PantriServiceResult>,
) {
  let servicesByPantryId = pantriServiceByRequest.get(request);
  if (!servicesByPantryId) {
    servicesByPantryId = new Map();
    pantriServiceByRequest.set(request, servicesByPantryId);
  }

  const existing = servicesByPantryId.get(pantryId);
  if (existing) {
    return existing;
  }

  const pending = factory();
  servicesByPantryId.set(pantryId, pending);
  return pending;
}
