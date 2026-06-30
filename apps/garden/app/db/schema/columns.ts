import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";

/** SQLite expression: current time in milliseconds. */
export const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export function idColumn(name = "id") {
  return text(name).primaryKey().$defaultFn(() => crypto.randomUUID());
}

export function createdAtColumn(name = "created_at") {
  return integer(name, { mode: "timestamp_ms" }).notNull().default(nowMs);
}

export function updatedAtColumn(name = "updated_at") {
  return integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(nowMs)
    .$onUpdate(() => new Date());
}

export function deletedAtColumn(name = "deleted_at") {
  return integer(name, { mode: "timestamp_ms" });
}

export function optionalTimestampColumn(name: string) {
  return integer(name, { mode: "timestamp_ms" }).default(nowMs);
}
