import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { householdMembers, households, user, userPreferences } from "~/db/schema";
import { areas, careRules, journalEntries, plants } from "~/db/schema/garden";
import { isEmailAllowed } from "~/lib/access.server";
import type { Database } from "~/lib/db.server";
import { auditFields, newId, touchFields } from "~/services/types";

const createHouseholdInput = z.object({
  name: z.string().trim().min(1),
});

const updateHouseholdInput = z.object({
  name: z.string().trim().min(1),
});

const addMemberInput = z.object({
  email: z.string().trim().email(),
});

export function createHouseholdsService({ db, userId }: { db: Database; userId: string }) {
  async function assertMember(householdId: string) {
    const [membership] = await db
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
          isNull(householdMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new Error("You are not a member of this household");
    }
  }

  return {
    async listForUser() {
      return listHouseholdsForUser(db, userId);
    },

    async get(householdId: string) {
      await assertMember(householdId);

      const [household] = await db
        .select({ id: households.id, name: households.name })
        .from(households)
        .where(and(eq(households.id, householdId), isNull(households.deletedAt)))
        .limit(1);

      return household ?? null;
    },

    async create(input: z.input<typeof createHouseholdInput>) {
      const data = createHouseholdInput.parse(input);
      const householdId = newId();
      const membershipId = newId();
      const audit = auditFields(userId);
      const now = new Date();

      await db.insert(households).values({
        id: householdId,
        name: data.name,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(householdMembers).values({
        id: membershipId,
        householdId,
        userId,
        ...audit,
      });

      return { id: householdId, name: data.name };
    },

    async update(householdId: string, input: z.input<typeof updateHouseholdInput>) {
      await assertMember(householdId);
      const data = updateHouseholdInput.parse(input);

      await db
        .update(households)
        .set({ name: data.name, updatedAt: new Date() })
        .where(eq(households.id, householdId));

      return this.get(householdId);
    },

    async listMembers(householdId: string) {
      await assertMember(householdId);

      return db
        .select({
          membershipId: householdMembers.id,
          userId: user.id,
          name: user.name,
          email: user.email,
        })
        .from(householdMembers)
        .innerJoin(user, eq(householdMembers.userId, user.id))
        .where(
          and(eq(householdMembers.householdId, householdId), isNull(householdMembers.deletedAt)),
        )
        .orderBy(asc(user.name), asc(user.email));
    },

    async addMember(householdId: string, input: z.input<typeof addMemberInput>) {
      await assertMember(householdId);
      const data = addMemberInput.parse(input);
      const email = data.email.trim().toLowerCase();

      if (!(await isEmailAllowed(db, email))) {
        throw new Error("That email is not on the garden allowlist");
      }

      const [targetUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (!targetUser) {
        throw new Error("That person needs to sign in once before they can be added");
      }

      const [existing] = await db
        .select({
          id: householdMembers.id,
          deletedAt: householdMembers.deletedAt,
        })
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, householdId),
            eq(householdMembers.userId, targetUser.id),
          ),
        )
        .limit(1);

      if (existing && !existing.deletedAt) {
        throw new Error("That person is already a member");
      }

      if (existing?.deletedAt) {
        await db
          .update(householdMembers)
          .set({ deletedAt: null, ...touchFields(userId) })
          .where(eq(householdMembers.id, existing.id));
      } else {
        await db.insert(householdMembers).values({
          id: newId(),
          householdId,
          userId: targetUser.id,
          ...auditFields(userId),
        });
      }

      return this.listMembers(householdId);
    },

    async removeMember(householdId: string, memberUserId: string) {
      await assertMember(householdId);

      const members = await this.listMembers(householdId);
      const target = members.find((member) => member.userId === memberUserId);

      if (!target) {
        throw new Error("Member not found");
      }

      if (members.length === 1) {
        throw new Error("Cannot remove the last member of a household");
      }

      await db
        .update(householdMembers)
        .set({ deletedAt: new Date(), ...touchFields(userId) })
        .where(eq(householdMembers.id, target.membershipId));

      await clearFavoriteHousehold(db, memberUserId, householdId);

      return true;
    },

    async remove(householdId: string) {
      await assertMember(householdId);

      const household = await this.get(householdId);
      if (!household) {
        return false;
      }

      const now = new Date();
      const touch = touchFields(userId);

      const plantRows = await db
        .select({ id: plants.id })
        .from(plants)
        .where(and(eq(plants.householdId, householdId), isNull(plants.deletedAt)));

      const plantIds = plantRows.map((plant) => plant.id);

      if (plantIds.length > 0) {
        await db
          .update(careRules)
          .set({ deletedAt: now, ...touch })
          .where(and(inArray(careRules.plantId, plantIds), isNull(careRules.deletedAt)));
      }

      await db
        .update(plants)
        .set({ deletedAt: now, ...touch })
        .where(and(eq(plants.householdId, householdId), isNull(plants.deletedAt)));

      await db
        .update(areas)
        .set({ deletedAt: now, ...touch })
        .where(and(eq(areas.householdId, householdId), isNull(areas.deletedAt)));

      await db
        .update(journalEntries)
        .set({ deletedAt: now, ...touch })
        .where(and(eq(journalEntries.householdId, householdId), isNull(journalEntries.deletedAt)));

      await db
        .update(householdMembers)
        .set({ deletedAt: now, ...touch })
        .where(
          and(eq(householdMembers.householdId, householdId), isNull(householdMembers.deletedAt)),
        );

      await db
        .update(households)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(households.id, householdId));

      await db
        .update(userPreferences)
        .set({ favoriteHouseholdId: null, updatedAt: now })
        .where(eq(userPreferences.favoriteHouseholdId, householdId));

      return true;
    },

    async getFavoriteHouseholdId() {
      return getFavoriteHouseholdId(db, userId);
    },

    async setFavoriteHousehold(householdId: string | null) {
      if (householdId) {
        await assertMember(householdId);
      }

      const now = new Date();

      if (!householdId) {
        await db
          .update(userPreferences)
          .set({ favoriteHouseholdId: null, updatedAt: now })
          .where(eq(userPreferences.userId, userId));
        return null;
      }

      await db
        .insert(userPreferences)
        .values({ userId, favoriteHouseholdId: householdId, updatedAt: now })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { favoriteHouseholdId: householdId, updatedAt: now },
        });

      return householdId;
    },

    async toggleFavoriteHousehold(householdId: string) {
      await assertMember(householdId);
      const current = await getFavoriteHouseholdId(db, userId);
      if (current === householdId) {
        await this.setFavoriteHousehold(null);
        return null;
      }
      return this.setFavoriteHousehold(householdId);
    },
  };
}

export async function listHouseholdsForUser(db: Database, userId: string) {
  return db
    .select({
      id: households.id,
      name: households.name,
    })
    .from(households)
    .innerJoin(householdMembers, eq(households.id, householdMembers.householdId))
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
        isNull(households.deletedAt),
      ),
    )
    .orderBy(asc(households.name));
}

export async function getFavoriteHouseholdId(db: Database, userId: string) {
  const [preferences] = await db
    .select({ favoriteHouseholdId: userPreferences.favoriteHouseholdId })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return preferences?.favoriteHouseholdId ?? null;
}

export async function resolveHomeHouseholdId(db: Database, userId: string) {
  const households = await listHouseholdsForUser(db, userId);

  if (households.length === 0) {
    return null;
  }

  const favoriteId = await getFavoriteHouseholdId(db, userId);
  if (favoriteId && households.some((household) => household.id === favoriteId)) {
    return favoriteId;
  }

  if (households.length === 1) {
    return households[0].id;
  }

  return null;
}

async function clearFavoriteHousehold(db: Database, userId: string, householdId: string) {
  await db
    .update(userPreferences)
    .set({ favoriteHouseholdId: null, updatedAt: new Date() })
    .where(
      and(eq(userPreferences.userId, userId), eq(userPreferences.favoriteHouseholdId, householdId)),
    );
}
