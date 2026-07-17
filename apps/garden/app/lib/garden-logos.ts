import { getHouseholdIdFromPath } from "./household-path";

export const GARDEN_LOGOS = [
  "/happy_plant_01.png",
  "/happy_plant_02.png",
  "/happy_plant_03.png",
  "/happy_plant_04.png",
  "/happy_plant_05.png",
  "/happy_plant_06.png",
  "/happy_plant_07.png",
  "/happy_plant_08.png",
  "/happy_plant_09.png",
] as const;

const LOGO = {
  dashboard: "/happy_plant_01.png",
  plants: "/happy_plant_02.png",
  areas: "/happy_plant_03.png",
  journal: "/happy_plant_04.png",
  settings: "/happy_plant_05.png",
  login: "/happy_plant_06.png",
  households: "/happy_plant_07.png",
  admin: "/happy_plant_08.png",
  fallback: "/happy_plant_09.png",
} as const;

type GardenLogoLocation = {
  pathname: string;
  settingsOpen?: boolean;
};

/** Resolve a stable plant logo for the current section (see garden-logos plan). */
export function gardenLogoForLocation({
  pathname,
  settingsOpen = false,
}: GardenLogoLocation): string {
  if (settingsOpen) {
    return LOGO.settings;
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first === "login") {
    return LOGO.login;
  }
  if (first === "households") {
    return LOGO.households;
  }
  if (first === "admin") {
    return LOGO.admin;
  }

  const householdId = getHouseholdIdFromPath(pathname);
  if (householdId) {
    const section = segments[1];
    if (!section) {
      return LOGO.dashboard;
    }
    if (section === "plants") {
      return LOGO.plants;
    }
    if (section === "areas") {
      return LOGO.areas;
    }
    if (section === "journal") {
      return LOGO.journal;
    }
    if (section === "settings") {
      return LOGO.settings;
    }
  }

  return LOGO.fallback;
}
