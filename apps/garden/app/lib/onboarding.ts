import { SUGGESTED_AREA_NAMES } from "~/lib/suggested-areas";
import type { GardenStats } from "~/services/dashboard.service";

export type DuplicateSourcePlant = {
  areaId: string;
  cultivar: string | null;
  latinName: string | null;
  name: string;
};

export type PlantFormDefaults = {
  areaId: string;
  cultivar: string;
  latinName: string;
  name: string;
  notes: string;
  plantedAt: string;
  removedAt: string;
};

export type DuplicatePlantResolution = {
  defaultValues: PlantFormDefaults;
};

export function filterSuggestedAreaNames(
  existingNames: string[],
  suggestions: readonly string[] = SUGGESTED_AREA_NAMES,
): string[] {
  const existing = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  return suggestions.filter((name) => !existing.has(name.toLowerCase()));
}

export function resolveDuplicatePlantForm(
  source: DuplicateSourcePlant,
  areas: Array<{ id: string }>,
  preferredAreaId = "",
): DuplicatePlantResolution {
  const areaId =
    preferredAreaId ||
    source.areaId ||
    areas.find((area) => area.id === source.areaId)?.id ||
    areas[0]?.id ||
    "";

  return {
    defaultValues: {
      areaId,
      name: source.name,
      latinName: source.latinName ?? "",
      cultivar: source.cultivar ?? "",
      notes: "",
      plantedAt: "",
      removedAt: "",
    },
  };
}

export function isGettingStartedComplete(stats: GardenStats) {
  return stats.journalCount > 0 && stats.areaCount > 0 && stats.plantCount > 0;
}
