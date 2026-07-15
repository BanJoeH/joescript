import { householdPath } from "~/lib/household-path";

export type AreaCreateIntent = "save" | "saveAndAddAnother" | "saveAndAddPlants";

export type QuickAddFlash =
  | { kind: "area-repeat" }
  | { kind: "plant-repeat" }
  | { kind: "plants-after-area"; areaName: string | null };

const SAVED_PARAM = "saved";
const FROM_PARAM = "from";
const FORM_KEY_PARAM = "t";

export function quickAddFlashMessage(flash: QuickAddFlash): string {
  switch (flash.kind) {
    case "area-repeat":
      return "Area saved. Add the next one below.";
    case "plant-repeat":
      return "Plant saved. Add the next one below.";
    case "plants-after-area":
      return flash.areaName
        ? `${flash.areaName} is ready. Add plants below.`
        : "Area saved. Add plants below.";
  }
}

export function parseAreaNewFlash(searchParams: URLSearchParams): QuickAddFlash | null {
  if (searchParams.get(SAVED_PARAM) === "area") {
    return { kind: "area-repeat" };
  }

  return null;
}

export function parsePlantNewFlash(
  searchParams: URLSearchParams,
  areas: Array<{ id: string; name: string }>,
  areaId: string,
): QuickAddFlash | null {
  if (searchParams.get(SAVED_PARAM) === "plant") {
    return { kind: "plant-repeat" };
  }

  if (searchParams.get(FROM_PARAM) === "area") {
    const areaName = areas.find((area) => area.id === areaId)?.name ?? null;
    return { kind: "plants-after-area", areaName };
  }

  return null;
}

export function parseQuickAddFormKey(searchParams: URLSearchParams, fallback = "initial") {
  return searchParams.get(FORM_KEY_PARAM) ?? fallback;
}

export function areaCreateRedirectPath(
  householdId: string,
  intent: AreaCreateIntent,
  areaId: string,
): string {
  const base = householdPath(householdId, "areas/new");

  if (intent === "saveAndAddAnother") {
    const search = new URLSearchParams({
      [SAVED_PARAM]: "area",
      [FORM_KEY_PARAM]: String(Date.now()),
    });
    return `${base}?${search}`;
  }

  if (intent === "saveAndAddPlants") {
    const search = new URLSearchParams({
      areaId,
      [FROM_PARAM]: "area",
      [FORM_KEY_PARAM]: String(Date.now()),
    });
    return `${householdPath(householdId, "plants/new")}?${search}`;
  }

  return householdPath(householdId, "areas");
}

export function plantCreateContinuePath(householdId: string, areaId: string): string {
  const search = new URLSearchParams({
    areaId,
    [SAVED_PARAM]: "plant",
    [FORM_KEY_PARAM]: String(Date.now()),
  });
  return `${householdPath(householdId, "plants/new")}?${search}`;
}
