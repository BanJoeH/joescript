import { parseDateInput } from "~/lib/dates";
import { getOptionalString, getString } from "~/lib/forms.server";
import { parsePhotoRole } from "~/lib/photos.server";
import type { PhotoUploadInput } from "~/services/photos.service";

export function parsePhotoUploads(formData: FormData): PhotoUploadInput[] {
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const roles = formData.getAll("photoRoles").map((value) => parsePhotoRole(String(value)));
  const captions = formData.getAll("photoCaptions").map((value) => String(value));
  const widths = formData.getAll("photoWidths").map((value) => Number(value));
  const heights = formData.getAll("photoHeights").map((value) => Number(value));

  return files.map((file, index) => ({
    file,
    role: roles[index] ?? "general",
    caption: captions[index] ?? null,
    width: Number.isFinite(widths[index]) ? widths[index] : undefined,
    height: Number.isFinite(heights[index]) ? heights[index] : undefined,
  }));
}

export function parsePlantCreateFormData(formData: FormData) {
  const plantedAt = getOptionalString(formData, "plantedAt");

  return {
    areaId: getString(formData, "areaId"),
    name: getString(formData, "name"),
    latinName: getOptionalString(formData, "latinName"),
    cultivar: getOptionalString(formData, "cultivar"),
    notes: getOptionalString(formData, "notes"),
    ...(plantedAt ? { plantedAt: parseDateInput(plantedAt) ?? undefined } : {}),
  };
}

export function parsePlantUpdateFormData(formData: FormData) {
  const plantedAt = getOptionalString(formData, "plantedAt");
  const removedAt = getOptionalString(formData, "removedAt");

  return {
    areaId: getString(formData, "areaId"),
    name: getString(formData, "name"),
    latinName: getOptionalString(formData, "latinName"),
    cultivar: getOptionalString(formData, "cultivar"),
    notes: getOptionalString(formData, "notes"),
    plantedAt: plantedAt ? (parseDateInput(plantedAt) ?? undefined) : null,
    removedAt: removedAt ? parseDateInput(removedAt) : null,
  };
}

export function parseJournalFormData(formData: FormData) {
  const performedAt = parseDateInput(getString(formData, "performedAt"));

  return {
    plantId: getOptionalString(formData, "plantId"),
    areaId: getOptionalString(formData, "areaId"),
    careRuleId: getOptionalString(formData, "careRuleId"),
    taskType: getOptionalString(formData, "taskType"),
    status: getString(formData, "status"),
    notes: getOptionalString(formData, "notes"),
    performedAt,
  };
}
