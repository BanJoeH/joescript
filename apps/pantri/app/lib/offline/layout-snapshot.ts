import { LAYOUT_STORE, withStore } from "~/lib/offline/db";

/** Serializable pantry layout loader payload for offline hydrate/revalidate. */
export type PantryLayoutSnapshot = {
  pantryId: string;
  updatedAt: number;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  pantryName: string | null;
  pantries: Array<{ id: string; name: string }>;
};

export type PantryLayoutLoaderData = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  pantryId: string;
  pantryName: string | null;
  pantries: Array<{ id: string; name: string }>;
};

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

export async function readPantryLayoutSnapshot(
  pantryId: string,
): Promise<PantryLayoutLoaderData | null> {
  try {
    const row = await withStore<PantryLayoutSnapshot | undefined>(
      LAYOUT_STORE,
      "readonly",
      (store) => store.get(pantryId),
    );
    if (!row) return null;
    return {
      user: {
        ...row.user,
        createdAt: new Date(row.user.createdAt),
        updatedAt: new Date(row.user.updatedAt),
      },
      pantryId: row.pantryId,
      pantryName: row.pantryName,
      pantries: row.pantries,
    };
  } catch {
    return null;
  }
}

export async function writePantryLayoutSnapshot(data: PantryLayoutLoaderData): Promise<void> {
  const row: PantryLayoutSnapshot = {
    pantryId: data.pantryId,
    updatedAt: Date.now(),
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      image: data.user.image ?? null,
      emailVerified: data.user.emailVerified,
      createdAt: toIso(data.user.createdAt),
      updatedAt: toIso(data.user.updatedAt),
    },
    pantryName: data.pantryName,
    pantries: data.pantries.map((pantry) => ({ id: pantry.id, name: pantry.name })),
  };
  await withStore(LAYOUT_STORE, "readwrite", (store) => store.put(row));
}
