import { and, count, desc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";

import { areas, careRules, journalEntries, plants } from "~/db/schema";
import { parseCareRuleMonths } from "~/lib/care-rules";
import { getMonthRange } from "~/lib/dates";
import type { GardenContext } from "~/services/types";

export type GardenJob = {
  careRuleId: string;
  plantId: string;
  plantName: string;
  taskType: string;
  instructions: string | null;
};

export type JournalSummary = {
  id: string;
  plantName: string | null;
  taskType: string | null;
  status: string;
  notes: string | null;
  performedAt: Date;
};

export type CompletedSummary = {
  id: string;
  plantName: string | null;
  taskType: string | null;
  notes: string | null;
  performedAt: Date;
};

export type GardenStats = {
  areaCount: number;
  plantCount: number;
  journalCount: number;
};

export function createDashboardService({ db, householdId }: GardenContext) {
  return {
    async getGardenStats(): Promise<GardenStats> {
      const [[areaRow], [plantRow], [journalRow]] = await Promise.all([
        db
          .select({ value: count() })
          .from(areas)
          .where(and(eq(areas.householdId, householdId), isNull(areas.deletedAt))),
        db
          .select({ value: count() })
          .from(plants)
          .where(and(eq(plants.householdId, householdId), isNull(plants.deletedAt))),
        db
          .select({ value: count() })
          .from(journalEntries)
          .where(
            and(eq(journalEntries.householdId, householdId), isNull(journalEntries.deletedAt)),
          ),
      ]);

      return {
        areaCount: areaRow?.value ?? 0,
        plantCount: plantRow?.value ?? 0,
        journalCount: journalRow?.value ?? 0,
      };
    },

    async getCurrentJobs(
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
    ): Promise<GardenJob[]> {
      const rules = await db
        .select({
          careRuleId: careRules.id,
          plantId: plants.id,
          plantName: plants.name,
          taskType: careRules.taskType,
          instructions: careRules.instructions,
          monthsJson: careRules.monthsJson,
          active: careRules.active,
        })
        .from(careRules)
        .innerJoin(plants, eq(careRules.plantId, plants.id))
        .where(
          and(
            eq(plants.householdId, householdId),
            isNull(plants.deletedAt),
            isNull(careRules.deletedAt),
            eq(careRules.active, true),
          ),
        );

      const monthJobs = rules.filter((rule) =>
        parseCareRuleMonths(rule.monthsJson).includes(month),
      );
      const { start, end } = getMonthRange(month, year);

      const loggedThisMonth = await db
        .selectDistinct({ careRuleId: journalEntries.careRuleId })
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.householdId, householdId),
            eq(journalEntries.status, "done"),
            isNull(journalEntries.deletedAt),
            isNotNull(journalEntries.careRuleId),
            gte(journalEntries.performedAt, start),
            lt(journalEntries.performedAt, end),
          ),
        );

      const loggedCareRuleIds = new Set(
        loggedThisMonth
          .map((entry) => entry.careRuleId)
          .filter((careRuleId): careRuleId is string => careRuleId !== null),
      );

      return monthJobs
        .filter((rule) => !loggedCareRuleIds.has(rule.careRuleId))
        .map((rule) => ({
          careRuleId: rule.careRuleId,
          plantId: rule.plantId,
          plantName: rule.plantName,
          taskType: rule.taskType,
          instructions: rule.instructions,
        }));
    },

    async getRecentJournalEntries(limit = 5) {
      return db
        .select({
          id: journalEntries.id,
          plantName: plants.name,
          taskType: journalEntries.taskType,
          status: journalEntries.status,
          notes: journalEntries.notes,
          performedAt: journalEntries.performedAt,
        })
        .from(journalEntries)
        .leftJoin(plants, eq(journalEntries.plantId, plants.id))
        .where(and(eq(journalEntries.householdId, householdId), isNull(journalEntries.deletedAt)))
        .orderBy(desc(journalEntries.performedAt), desc(journalEntries.createdAt))
        .limit(limit);
    },

    async getRecentlyCompleted(limit = 5) {
      return db
        .select({
          id: journalEntries.id,
          plantName: plants.name,
          taskType: journalEntries.taskType,
          notes: journalEntries.notes,
          performedAt: journalEntries.performedAt,
        })
        .from(journalEntries)
        .leftJoin(plants, eq(journalEntries.plantId, plants.id))
        .where(
          and(
            eq(journalEntries.householdId, householdId),
            eq(journalEntries.status, "done"),
            isNull(journalEntries.deletedAt),
          ),
        )
        .orderBy(desc(journalEntries.performedAt), desc(journalEntries.createdAt))
        .limit(limit);
    },
  };
}
