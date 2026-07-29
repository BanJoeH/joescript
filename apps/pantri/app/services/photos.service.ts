import { and, desc, eq, isNull } from "drizzle-orm";

import { recipePhotos } from "~/db/schema";
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  buildPhotoStorageKey,
  extensionForContentType,
  MAX_PHOTOS_PER_IMPORT,
  sniffPhotoContentType,
} from "~/lib/photos.server";
import type { PantriContext } from "~/services/types";
import { newId } from "~/services/types";

export type RecipePhotoRecord = {
  id: string;
  pantryId: string;
  recipeId: string | null;
  r2Key: string;
  createdAt: Date;
};

function toRecord(row: typeof recipePhotos.$inferSelect): RecipePhotoRecord {
  return {
    id: row.id,
    pantryId: row.pantryId,
    recipeId: row.recipeId,
    r2Key: row.r2Key,
    createdAt: row.createdAt,
  };
}

export function createPhotosService({ db, userId, pantryId, photosBucket }: PantriContext) {
  return {
    async upload(files: File[]): Promise<RecipePhotoRecord[]> {
      const usable = files.filter((file) => file.size > 0);
      if (usable.length === 0) {
        return [];
      }

      if (usable.length > MAX_PHOTOS_PER_IMPORT) {
        throw new Error(`At most ${MAX_PHOTOS_PER_IMPORT} photos at once.`);
      }

      const created: RecipePhotoRecord[] = [];

      for (const file of usable) {
        const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
        const sniffedType = sniffPhotoContentType(header);
        if (!sniffedType || !ALLOWED_PHOTO_CONTENT_TYPES.includes(sniffedType)) {
          throw new Error("Only JPEG, PNG, and WebP images are supported.");
        }

        const id = newId();
        const ext = extensionForContentType(sniffedType);
        const r2Key = buildPhotoStorageKey(pantryId, id, ext);
        const now = new Date();

        await photosBucket.put(r2Key, file.stream(), {
          httpMetadata: { contentType: sniffedType },
        });

        try {
          await db.insert(recipePhotos).values({
            id,
            pantryId,
            recipeId: null,
            r2Key,
            createdByUserId: userId,
            createdAt: now,
            updatedAt: now,
          });
        } catch (error) {
          await photosBucket.delete(r2Key);
          throw error;
        }

        created.push({ id, pantryId, recipeId: null, r2Key, createdAt: now });
      }

      return created;
    },

    async get(photoId: string): Promise<RecipePhotoRecord | null> {
      const [row] = await db
        .select()
        .from(recipePhotos)
        .where(and(eq(recipePhotos.id, photoId), eq(recipePhotos.pantryId, pantryId)))
        .limit(1);

      return row ? toRecord(row) : null;
    },

    async listByIds(photoIds: string[]): Promise<RecipePhotoRecord[]> {
      if (photoIds.length === 0) return [];
      const rows = await db
        .select()
        .from(recipePhotos)
        .where(eq(recipePhotos.pantryId, pantryId))
        .orderBy(desc(recipePhotos.createdAt));

      const byId = new Map(rows.map((row) => [row.id, toRecord(row)]));
      return photoIds
        .map((id) => byId.get(id))
        .filter((record): record is RecipePhotoRecord => Boolean(record));
    },

    async listPending(): Promise<RecipePhotoRecord[]> {
      const rows = await db
        .select()
        .from(recipePhotos)
        .where(and(eq(recipePhotos.pantryId, pantryId), isNull(recipePhotos.recipeId)))
        .orderBy(desc(recipePhotos.createdAt));

      return rows.map(toRecord);
    },

    async attachToRecipe(photoIds: string[], recipeId: string): Promise<void> {
      for (const photoId of photoIds) {
        await db
          .update(recipePhotos)
          .set({ recipeId, updatedAt: new Date() })
          .where(and(eq(recipePhotos.id, photoId), eq(recipePhotos.pantryId, pantryId)));
      }
    },

    async getObject(photoId: string) {
      const photo = await this.get(photoId);
      if (!photo) return null;

      const object = await photosBucket.get(photo.r2Key);
      if (!object) return null;

      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        etag: object.etag,
      };
    },

    async remove(photoId: string): Promise<boolean> {
      const photo = await this.get(photoId);
      if (!photo) return false;

      await db.delete(recipePhotos).where(eq(recipePhotos.id, photoId));
      await photosBucket.delete(photo.r2Key);
      return true;
    },
  };
}

export type PhotosService = ReturnType<typeof createPhotosService>;
