import { and, asc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import {
  ingredientCategories,
  oddBits,
  pantries,
  pantryMembers,
  recipePhotos,
  recipes,
  shoppingRecipes,
  user,
  userPreferences,
} from "~/db/schema";
import type { Database } from "~/lib/db.server";
import { normalizeEmail } from "~/services/pantry-members.server";
import { newId } from "~/services/types";

const createPantryInput = z.object({
  name: z.string().trim().min(1),
});

const updatePantryInput = z.object({
  name: z.string().trim().min(1),
});

const addMemberInput = z.object({
  email: z.string().trim().email(),
});

export function createPantriesService({ db, userId }: { db: Database; userId: string }) {
  async function assertMember(pantryId: string) {
    const [membership] = await db
      .select({ id: pantryMembers.id })
      .from(pantryMembers)
      .where(
        and(
          eq(pantryMembers.pantryId, pantryId),
          eq(pantryMembers.userId, userId),
          isNull(pantryMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new Error("You are not a member of this pantry");
    }
  }

  return {
    async listForUser() {
      return listPantriesForUser(db, userId);
    },

    async get(pantryId: string) {
      await assertMember(pantryId);

      const [pantry] = await db
        .select({ id: pantries.id, name: pantries.name, revision: pantries.revision })
        .from(pantries)
        .where(and(eq(pantries.id, pantryId), isNull(pantries.deletedAt)))
        .limit(1);

      return pantry ?? null;
    },

    async create(input: z.input<typeof createPantryInput>) {
      const data = createPantryInput.parse(input);
      const pantryId = newId();
      const membershipId = newId();
      const now = new Date();

      await db.insert(pantries).values({
        id: pantryId,
        name: data.name,
        createdAt: now,
        updatedAt: now,
      });

      const [creator] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      await db.insert(pantryMembers).values({
        id: membershipId,
        pantryId,
        userId,
        email: creator?.email ? normalizeEmail(creator.email) : null,
        createdAt: now,
        updatedAt: now,
      });

      return { id: pantryId, name: data.name };
    },

    async update(pantryId: string, input: z.input<typeof updatePantryInput>) {
      await assertMember(pantryId);
      const data = updatePantryInput.parse(input);

      await db
        .update(pantries)
        .set({ name: data.name, updatedAt: new Date() })
        .where(eq(pantries.id, pantryId));

      return this.get(pantryId);
    },

    async listMembers(pantryId: string) {
      await assertMember(pantryId);

      const rows = await db
        .select({
          membershipId: pantryMembers.id,
          userId: pantryMembers.userId,
          memberEmail: pantryMembers.email,
          name: user.name,
          userEmail: user.email,
        })
        .from(pantryMembers)
        .leftJoin(user, eq(pantryMembers.userId, user.id))
        .where(and(eq(pantryMembers.pantryId, pantryId), isNull(pantryMembers.deletedAt)))
        .orderBy(asc(user.name), asc(pantryMembers.email), asc(user.email));

      return rows.map((row) => ({
        membershipId: row.membershipId,
        userId: row.userId,
        email: row.userEmail ?? row.memberEmail ?? "",
        name: row.name ?? "Invited",
        pending: row.userId === null,
      }));
    },

    /** Open signup: anyone can be invited by email, no allowlist check. */
    async addMember(pantryId: string, input: z.input<typeof addMemberInput>) {
      await assertMember(pantryId);
      const data = addMemberInput.parse(input);
      const email = normalizeEmail(data.email);

      const [targetUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      const membershipMatch = targetUser
        ? or(eq(pantryMembers.userId, targetUser.id), eq(pantryMembers.email, email))
        : eq(pantryMembers.email, email);

      const [existing] = await db
        .select({
          id: pantryMembers.id,
          deletedAt: pantryMembers.deletedAt,
        })
        .from(pantryMembers)
        .where(and(eq(pantryMembers.pantryId, pantryId), membershipMatch))
        .limit(1);

      if (existing && !existing.deletedAt) {
        throw new Error("That person is already a member");
      }

      if (existing?.deletedAt) {
        await db
          .update(pantryMembers)
          .set({
            deletedAt: null,
            email,
            userId: targetUser?.id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(pantryMembers.id, existing.id));
      } else {
        await db.insert(pantryMembers).values({
          id: newId(),
          pantryId,
          userId: targetUser?.id ?? null,
          email,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return this.listMembers(pantryId);
    },

    async removeMember(pantryId: string, membershipId: string) {
      await assertMember(pantryId);

      const members = await this.listMembers(pantryId);
      const target = members.find((member) => member.membershipId === membershipId);

      if (!target) {
        throw new Error("Member not found");
      }

      if (members.length === 1) {
        throw new Error("Cannot remove the last member of a pantry");
      }

      await db
        .update(pantryMembers)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(pantryMembers.id, membershipId));

      if (target.userId) {
        await clearFavoritePantry(db, target.userId, pantryId);
      }

      return true;
    },

    async remove(pantryId: string) {
      await assertMember(pantryId);

      const pantry = await this.get(pantryId);
      if (!pantry) {
        return false;
      }

      const now = new Date();

      await db
        .update(recipes)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(recipes.pantryId, pantryId), isNull(recipes.deletedAt)));

      await db
        .update(shoppingRecipes)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(shoppingRecipes.pantryId, pantryId), isNull(shoppingRecipes.deletedAt)));

      await db.delete(oddBits).where(eq(oddBits.pantryId, pantryId));
      await db.delete(ingredientCategories).where(eq(ingredientCategories.pantryId, pantryId));
      await db.delete(recipePhotos).where(eq(recipePhotos.pantryId, pantryId));

      await db
        .update(pantryMembers)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(pantryMembers.pantryId, pantryId), isNull(pantryMembers.deletedAt)));

      await db
        .update(pantries)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(pantries.id, pantryId));

      await db
        .update(userPreferences)
        .set({ favoritePantryId: null, updatedAt: now })
        .where(eq(userPreferences.favoritePantryId, pantryId));

      return true;
    },

    async getFavoritePantryId() {
      return getFavoritePantryId(db, userId);
    },

    async setFavoritePantry(pantryId: string | null) {
      if (pantryId) {
        await assertMember(pantryId);
      }

      const now = new Date();

      if (!pantryId) {
        await db
          .update(userPreferences)
          .set({ favoritePantryId: null, updatedAt: now })
          .where(eq(userPreferences.userId, userId));
        return null;
      }

      await db
        .insert(userPreferences)
        .values({ userId, favoritePantryId: pantryId, updatedAt: now })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { favoritePantryId: pantryId, updatedAt: now },
        });

      return pantryId;
    },

    async toggleFavoritePantry(pantryId: string) {
      await assertMember(pantryId);
      const current = await getFavoritePantryId(db, userId);
      if (current === pantryId) {
        await this.setFavoritePantry(null);
        return null;
      }
      return this.setFavoritePantry(pantryId);
    },
  };
}

export async function listPantriesForUser(db: Database, userId: string) {
  return db
    .select({
      id: pantries.id,
      name: pantries.name,
    })
    .from(pantries)
    .innerJoin(pantryMembers, eq(pantries.id, pantryMembers.pantryId))
    .where(
      and(
        eq(pantryMembers.userId, userId),
        isNull(pantryMembers.deletedAt),
        isNull(pantries.deletedAt),
      ),
    )
    .orderBy(asc(pantries.name));
}

export async function getFavoritePantryId(db: Database, userId: string) {
  const [preferences] = await db
    .select({ favoritePantryId: userPreferences.favoritePantryId })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return preferences?.favoritePantryId ?? null;
}

export async function resolveHomePantryId(db: Database, userId: string) {
  const pantriesForUser = await listPantriesForUser(db, userId);

  if (pantriesForUser.length === 0) {
    return null;
  }

  const favoriteId = await getFavoritePantryId(db, userId);
  if (favoriteId && pantriesForUser.some((pantry) => pantry.id === favoriteId)) {
    return favoriteId;
  }

  if (pantriesForUser.length === 1) {
    return pantriesForUser[0].id;
  }

  return null;
}

async function clearFavoritePantry(db: Database, userId: string, pantryId: string) {
  await db
    .update(userPreferences)
    .set({ favoritePantryId: null, updatedAt: new Date() })
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.favoritePantryId, pantryId)));
}
