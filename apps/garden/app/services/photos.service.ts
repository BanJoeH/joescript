import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { journalEntries, type PhotoRole, photoRoles, photos, plants } from "~/db/schema";
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  buildPhotoStorageKey,
  extensionForContentType,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ENTRY,
  normalizePhotoCaption,
  sniffPhotoContentType,
} from "~/lib/photos.server";
import { auditFields, type GardenContext, newId, touchFields } from "~/services/types";

export type PhotoRecord = {
  id: string;
  plantId: string | null;
  journalEntryId: string | null;
  storageKey: string;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  role: PhotoRole;
  sortOrder: number;
};

export type PhotoUploadInput = {
  file: File;
  role: PhotoRole;
  width?: number;
  height?: number;
  caption?: string | null;
};

export type PlantPhotoRecord = PhotoRecord & {
  performedAt: Date;
  taskType: string | null;
};

export type PlantLatestPhoto = PlantPhotoRecord & {
  plantId: string;
  plantName: string;
  areaId: string;
};

function groupPhotosByEntry(rows: PhotoRecord[]) {
  const grouped = new Map<string, PhotoRecord[]>();
  for (const row of rows) {
    if (!row.journalEntryId) continue;
    const existing = grouped.get(row.journalEntryId) ?? [];
    existing.push(row);
    grouped.set(row.journalEntryId, existing);
  }
  return grouped;
}

export function groupPlantPhotosByEntry(photos: PlantPhotoRecord[]) {
  const grouped: Record<string, PlantPhotoRecord[]> = {};

  for (const photo of photos) {
    if (!photo.journalEntryId) continue;
    const entryPhotos = grouped[photo.journalEntryId] ?? [];
    entryPhotos.push(photo);
    grouped[photo.journalEntryId] = entryPhotos;
  }

  for (const entryPhotos of Object.values(grouped)) {
    entryPhotos.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return grouped;
}

export function createPhotosService({ db, userId, householdId, photosBucket }: GardenContext) {
  const householdScope = and(eq(photos.householdId, householdId), isNull(photos.deletedAt));

  async function assertPlantInHousehold(plantId: string) {
    const [plant] = await db
      .select({ id: plants.id })
      .from(plants)
      .where(
        and(eq(plants.id, plantId), eq(plants.householdId, householdId), isNull(plants.deletedAt)),
      )
      .limit(1);

    if (!plant) {
      throw new Error("Plant not found");
    }
  }

  async function assertEntryInHousehold(entryId: string) {
    const [entry] = await db
      .select({ id: journalEntries.id })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.id, entryId),
          eq(journalEntries.householdId, householdId),
          isNull(journalEntries.deletedAt),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new Error("Journal entry not found");
    }
  }

  async function listEntryPhotoCount(entryId: string) {
    const rows = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.journalEntryId, entryId), householdScope));

    return rows.length;
  }

  async function uploadOne({
    upload,
    journalEntryId,
    plantId,
    sortOrder,
  }: {
    upload: PhotoUploadInput;
    journalEntryId: string | null;
    plantId: string | null;
    sortOrder: number;
  }): Promise<PhotoRecord | null> {
    if (upload.file.size === 0) {
      return null;
    }

    if (upload.file.size > MAX_PHOTO_BYTES) {
      throw new Error(`Each photo must be ${MAX_PHOTO_BYTES / (1024 * 1024)} MB or smaller.`);
    }

    const header = new Uint8Array(await upload.file.slice(0, 16).arrayBuffer());
    const sniffedType = sniffPhotoContentType(header);
    if (!sniffedType || !ALLOWED_PHOTO_CONTENT_TYPES.includes(sniffedType)) {
      throw new Error("Only JPEG, PNG, and WebP images are supported.");
    }

    if (!upload.file.type.startsWith("image/")) {
      throw new Error("Only image uploads are supported.");
    }

    const role = photoRoles.includes(upload.role) ? upload.role : "general";
    const caption = normalizePhotoCaption(upload.caption);
    const photoId = newId();
    const ext = extensionForContentType(sniffedType);
    const storageKey = buildPhotoStorageKey(householdId, photoId, ext);
    const audit = auditFields(userId);

    await photosBucket.put(storageKey, upload.file.stream(), {
      httpMetadata: { contentType: sniffedType },
    });

    try {
      await db.insert(photos).values({
        id: photoId,
        householdId,
        plantId,
        journalEntryId,
        storageKey,
        contentType: sniffedType,
        byteSize: upload.file.size,
        width: upload.width ?? null,
        height: upload.height ?? null,
        caption,
        role,
        sortOrder,
        ...audit,
      });
    } catch (error) {
      await photosBucket.delete(storageKey);
      throw error;
    }

    return {
      id: photoId,
      plantId,
      journalEntryId,
      storageKey,
      contentType: sniffedType,
      byteSize: upload.file.size,
      width: upload.width ?? null,
      height: upload.height ?? null,
      caption,
      role,
      sortOrder,
    };
  }

  return {
    async listForEntry(entryId: string): Promise<PhotoRecord[]> {
      await assertEntryInHousehold(entryId);

      return db
        .select({
          id: photos.id,
          plantId: photos.plantId,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
        })
        .from(photos)
        .where(and(eq(photos.journalEntryId, entryId), householdScope))
        .orderBy(asc(photos.sortOrder), asc(photos.createdAt));
    },

    async listForEntries(entryIds: string[]) {
      if (entryIds.length === 0) {
        return new Map<string, PhotoRecord[]>();
      }

      const rows = await db
        .select({
          id: photos.id,
          plantId: photos.plantId,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
        })
        .from(photos)
        .where(and(inArray(photos.journalEntryId, entryIds), householdScope))
        .orderBy(asc(photos.sortOrder), asc(photos.createdAt));

      return groupPhotosByEntry(rows);
    },

    async getForPlant(plantId: string): Promise<PhotoRecord | null> {
      await assertPlantInHousehold(plantId);

      const [photo] = await db
        .select({
          id: photos.id,
          plantId: photos.plantId,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
        })
        .from(photos)
        .where(and(eq(photos.plantId, plantId), householdScope))
        .orderBy(desc(photos.createdAt))
        .limit(1);

      return photo ?? null;
    },

    async listForPlant(plantId: string): Promise<PlantPhotoRecord[]> {
      const [plant] = await db
        .select({ id: plants.id })
        .from(plants)
        .where(
          and(
            eq(plants.id, plantId),
            eq(plants.householdId, householdId),
            isNull(plants.deletedAt),
          ),
        )
        .limit(1);

      if (!plant) {
        throw new Error("Plant not found");
      }

      return db
        .select({
          id: photos.id,
          plantId: photos.plantId,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
          performedAt: journalEntries.performedAt,
          taskType: journalEntries.taskType,
        })
        .from(photos)
        .innerJoin(journalEntries, eq(photos.journalEntryId, journalEntries.id))
        .where(
          and(
            eq(journalEntries.plantId, plantId),
            eq(journalEntries.householdId, householdId),
            isNull(journalEntries.deletedAt),
            householdScope,
          ),
        )
        .orderBy(
          desc(journalEntries.performedAt),
          desc(journalEntries.createdAt),
          asc(photos.sortOrder),
          asc(photos.createdAt),
        );
    },

    async listLatestPerPlant(): Promise<PlantLatestPhoto[]> {
      const profileRows = await db
        .select({
          id: photos.id,
          plantId: plants.id,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
          performedAt: photos.createdAt,
          taskType: photos.caption,
          plantName: plants.name,
          areaId: plants.areaId,
        })
        .from(photos)
        .innerJoin(plants, eq(photos.plantId, plants.id))
        .where(and(eq(plants.householdId, householdId), isNull(plants.deletedAt), householdScope))
        .orderBy(desc(photos.createdAt));

      const journalRows = await db
        .select({
          id: photos.id,
          plantId: plants.id,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
          performedAt: journalEntries.performedAt,
          taskType: journalEntries.taskType,
          plantName: plants.name,
          areaId: plants.areaId,
        })
        .from(photos)
        .innerJoin(journalEntries, eq(photos.journalEntryId, journalEntries.id))
        .innerJoin(plants, eq(journalEntries.plantId, plants.id))
        .where(
          and(
            eq(plants.householdId, householdId),
            isNull(plants.deletedAt),
            eq(journalEntries.householdId, householdId),
            isNull(journalEntries.deletedAt),
            householdScope,
          ),
        )
        .orderBy(
          desc(journalEntries.performedAt),
          desc(journalEntries.createdAt),
          asc(photos.sortOrder),
          asc(photos.createdAt),
        );

      const seen = new Set<string>();
      const result: PlantLatestPhoto[] = [];

      for (const row of [...profileRows, ...journalRows]) {
        if (seen.has(row.plantId)) {
          continue;
        }
        seen.add(row.plantId);
        result.push(row);
      }

      return result;
    },

    async get(photoId: string): Promise<PhotoRecord | null> {
      const [photo] = await db
        .select({
          id: photos.id,
          plantId: photos.plantId,
          journalEntryId: photos.journalEntryId,
          storageKey: photos.storageKey,
          contentType: photos.contentType,
          byteSize: photos.byteSize,
          width: photos.width,
          height: photos.height,
          caption: photos.caption,
          role: photos.role,
          sortOrder: photos.sortOrder,
        })
        .from(photos)
        .where(and(eq(photos.id, photoId), householdScope))
        .limit(1);

      return photo ?? null;
    },

    async upload(entryId: string, uploads: PhotoUploadInput[]) {
      if (uploads.length === 0) {
        return [];
      }

      await assertEntryInHousehold(entryId);

      const existingCount = await listEntryPhotoCount(entryId);
      if (existingCount + uploads.length > MAX_PHOTOS_PER_ENTRY) {
        throw new Error(`Each journal entry can have at most ${MAX_PHOTOS_PER_ENTRY} photos.`);
      }

      const created: PhotoRecord[] = [];
      let sortOrder = existingCount;

      for (const upload of uploads) {
        const photo = await uploadOne({
          upload,
          journalEntryId: entryId,
          plantId: null,
          sortOrder,
        });
        if (photo) {
          created.push(photo);
          sortOrder += 1;
        }
      }

      return created;
    },

    async uploadForPlant(plantId: string, upload: PhotoUploadInput) {
      await assertPlantInHousehold(plantId);
      const existing = await this.getForPlant(plantId);
      const created = await uploadOne({
        upload: { ...upload, role: "general", caption: null },
        journalEntryId: null,
        plantId,
        sortOrder: 0,
      });

      if (created && existing) {
        await this.remove(existing.id);
      }

      return created;
    },

    async updateCaption(photoId: string, caption: string | null) {
      const photo = await this.get(photoId);
      if (!photo) {
        return false;
      }

      await db
        .update(photos)
        .set({ caption: normalizePhotoCaption(caption), ...touchFields(userId) })
        .where(eq(photos.id, photoId));

      return true;
    },

    async updateRole(photoId: string, role: PhotoRole) {
      const photo = await this.get(photoId);
      if (!photo) {
        return false;
      }

      const nextRole = photoRoles.includes(role) ? role : photo.role;

      await db
        .update(photos)
        .set({ role: nextRole, ...touchFields(userId) })
        .where(eq(photos.id, photoId));

      return true;
    },

    async remove(photoId: string) {
      const photo = await this.get(photoId);
      if (!photo) {
        return false;
      }

      await db
        .update(photos)
        .set({ deletedAt: new Date(), ...touchFields(userId) })
        .where(eq(photos.id, photoId));

      await photosBucket.delete(photo.storageKey);
      return true;
    },

    async removeForEntry(entryId: string) {
      const entryPhotos = await this.listForEntry(entryId);
      for (const photo of entryPhotos) {
        await this.remove(photo.id);
      }
    },

    async removeForPlant(plantId: string) {
      const photo = await this.getForPlant(plantId);
      if (photo) {
        await this.remove(photo.id);
      }
    },

    async getObject(photoId: string) {
      const photo = await this.get(photoId);
      if (!photo) {
        return null;
      }

      const object = await photosBucket.get(photo.storageKey);
      if (!object) {
        return null;
      }

      return {
        body: object.body,
        contentType: photo.contentType,
        etag: object.etag,
        byteSize: photo.byteSize,
      };
    },
  };
}

export type PhotosService = ReturnType<typeof createPhotosService>;
