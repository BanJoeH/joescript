import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { allowedEmails } from "~/db/schema";
import { normalizeEmail } from "~/lib/access.server";
import { isGardenAdmin } from "~/lib/admin";
import type { Database } from "~/lib/db.server";
import { newId } from "~/services/types";

const addEmailInput = z.object({
  email: z.string().trim().email(),
});

export function createAllowedEmailsService({ db }: { db: Database }) {
  return {
    async list() {
      return db
        .select({
          id: allowedEmails.id,
          email: allowedEmails.email,
          createdAt: allowedEmails.createdAt,
        })
        .from(allowedEmails)
        .where(isNull(allowedEmails.deletedAt))
        .orderBy(asc(allowedEmails.email));
    },

    async add(input: z.input<typeof addEmailInput>) {
      const data = addEmailInput.parse(input);
      const email = normalizeEmail(data.email);
      const now = new Date();

      const [existing] = await db
        .select({
          id: allowedEmails.id,
          deletedAt: allowedEmails.deletedAt,
        })
        .from(allowedEmails)
        .where(eq(allowedEmails.email, email))
        .limit(1);

      if (existing && !existing.deletedAt) {
        throw new Error("That email is already invited.");
      }

      if (existing?.deletedAt) {
        await db
          .update(allowedEmails)
          .set({ deletedAt: null, updatedAt: now })
          .where(eq(allowedEmails.id, existing.id));
        return email;
      }

      await db.insert(allowedEmails).values({
        id: newId(),
        email,
        createdAt: now,
        updatedAt: now,
      });

      return email;
    },

    async remove(id: string) {
      const [row] = await db
        .select({ id: allowedEmails.id, email: allowedEmails.email })
        .from(allowedEmails)
        .where(and(eq(allowedEmails.id, id), isNull(allowedEmails.deletedAt)))
        .limit(1);

      if (!row) {
        return false;
      }

      if (isGardenAdmin(row.email)) {
        throw new Error("You cannot remove your own admin access.");
      }

      await db
        .update(allowedEmails)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(allowedEmails.id, id));

      return true;
    },
  };
}
