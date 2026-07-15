import type { Database } from "~/lib/db.server";

export type MomentumContext = {
  db: Database;
  userId: string;
};

export function newId() {
  return crypto.randomUUID();
}

export function auditTimestamps() {
  const now = new Date();
  return {
    createdAt: now,
    updatedAt: now,
  };
}

export function touchTimestamp() {
  return {
    updatedAt: new Date(),
  };
}
