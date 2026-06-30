import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import {
  createdAtColumn,
  deletedAtColumn,
  idColumn,
  updatedAtColumn,
} from "./columns";
import { households } from "./domain";

export const areas = sqliteTable("areas", {
  id: idColumn(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  updatedByUserId: text("updated_by_user_id")
    .notNull()
    .references(() => user.id),
});

export const plants = sqliteTable("plants", {
  id: idColumn(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  areaId: text("area_id")
    .notNull()
    .references(() => areas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  latinName: text("latin_name"),
  cultivar: text("cultivar"),
  notes: text("notes"),
  plantedAt: integer("planted_at", { mode: "timestamp_ms" }),
  removedAt: integer("removed_at", { mode: "timestamp_ms" }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  updatedByUserId: text("updated_by_user_id")
    .notNull()
    .references(() => user.id),
});

export const careRules = sqliteTable("care_rules", {
  id: idColumn(),
  plantId: text("plant_id")
    .notNull()
    .references(() => plants.id, { onDelete: "cascade" }),
  taskType: text("task_type").notNull(),
  monthsJson: text("months_json").notNull(),
  instructions: text("instructions"),
  source: text("source"),
  confidence: text("confidence"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  updatedByUserId: text("updated_by_user_id")
    .notNull()
    .references(() => user.id),
});

export const journalEntryStatuses = ["done", "skipped", "note"] as const;
export type JournalEntryStatus = (typeof journalEntryStatuses)[number];

export const journalEntries = sqliteTable("journal_entries", {
  id: idColumn(),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  plantId: text("plant_id").references(() => plants.id, { onDelete: "set null" }),
  areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
  careRuleId: text("care_rule_id").references(() => careRules.id, { onDelete: "set null" }),
  taskType: text("task_type"),
  status: text("status").$type<JournalEntryStatus>().notNull().default("note"),
  notes: text("notes"),
  performedAt: integer("performed_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  updatedByUserId: text("updated_by_user_id")
    .notNull()
    .references(() => user.id),
});
