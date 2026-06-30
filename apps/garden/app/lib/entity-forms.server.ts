import { parseDateInput } from "~/lib/dates";
import { getOptionalString, getString } from "~/lib/forms.server";

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
