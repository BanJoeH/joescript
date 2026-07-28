import type { Database } from "~/lib/db.server";

export type PantriContext = {
  db: Database;
  userId: string;
  pantryId: string;
  photosBucket: R2Bucket;
};

export function newId() {
  return crypto.randomUUID();
}

export function touchFields() {
  return { updatedAt: new Date() };
}
