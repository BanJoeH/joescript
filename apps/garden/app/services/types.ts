import type { Database } from "~/lib/db.server";

export type GardenContext = {
  db: Database;
  userId: string;
  householdId: string;
};

export function newId() {
  return crypto.randomUUID();
}

export function auditFields(userId: string) {
  const now = new Date();
  return {
    createdAt: now,
    updatedAt: now,
    createdByUserId: userId,
    updatedByUserId: userId,
  };
}

export function touchFields(userId: string) {
  return {
    updatedAt: new Date(),
    updatedByUserId: userId,
  };
}
