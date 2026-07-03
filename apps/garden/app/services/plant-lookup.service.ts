import { withCache } from "~/lib/cache.server";
import { fetchWithTimeout } from "~/lib/fetch.server";

import { createInaturalistLookupService, type TaxonImage } from "./inaturalist-lookup.service";

const PERENUAL_API_BASE = "https://perenual.com/api/v2";
const PERENUAL_CACHE_NAMESPACE = "perenual";
export const PERENUAL_SEARCH_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const MAX_IMAGE_ENRICHMENTS = 5;

export type PlantSpeciesSuggestion = {
  id: number;
  commonName: string;
  latinName: string;
  cultivar: string | null;
  imageUrl: string | null;
  imageAttribution: string | null;
};

type PerenualSpecies = {
  id: number;
  common_name: string | null;
  scientific_name: string[] | null;
  cultivar: string | null;
};

type PerenualSpeciesListResponse = {
  data?: PerenualSpecies[];
};

export function normalizeSearchQuery(query: string) {
  return query.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function parseScientificName(scientificNames: string[]) {
  const primary = scientificNames[0]?.trim() ?? "";
  if (!primary) {
    return { latinName: "", cultivar: null as string | null };
  }

  const quotedCultivar = primary.match(/\s+['"]([^'"]+)['"]\s*$/);
  const cvCultivar = primary.match(/\s+cv\.?\s+(.+)$/i);

  let latinName = primary;
  let cultivar: string | null = null;

  if (quotedCultivar) {
    cultivar = quotedCultivar[1];
    latinName = primary.replace(/\s+['"][^'"]+['"]\s*$/, "").trim();
  } else if (cvCultivar) {
    cultivar = cvCultivar[1].trim();
    latinName = primary.replace(/\s+cv\.?\s+.+$/i, "").trim();
  }

  return {
    latinName: latinName || primary,
    cultivar,
  };
}

export function mapSpecies(
  species: PerenualSpecies,
): Omit<PlantSpeciesSuggestion, "imageUrl" | "imageAttribution"> | null {
  const scientificNames = species.scientific_name?.filter(Boolean) ?? [];
  const { latinName, cultivar } = parseScientificName(scientificNames);
  const commonName = species.common_name?.trim() ?? "";

  if (!commonName && !latinName) {
    return null;
  }

  return {
    id: species.id,
    commonName,
    latinName,
    cultivar: species.cultivar?.trim() || cultivar,
  };
}

function imageLookupKey(result: Omit<PlantSpeciesSuggestion, "imageUrl" | "imageAttribution">) {
  const query = result.latinName || result.commonName;
  return query ? query.toLowerCase() : null;
}

export async function enrichWithImages(
  results: Array<Omit<PlantSpeciesSuggestion, "imageUrl" | "imageAttribution">>,
  lookupImage: (query: string) => Promise<TaxonImage>,
) {
  const imageCache = new Map<string, TaxonImage>();
  const queriesToFetch: string[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const key = imageLookupKey(result);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    if (queriesToFetch.length < MAX_IMAGE_ENRICHMENTS) {
      queriesToFetch.push(result.latinName || result.commonName);
    }
  }

  await Promise.all(
    queriesToFetch.map(async (query) => {
      const image = await lookupImage(query);
      imageCache.set(query.toLowerCase(), image);
    }),
  );

  return results.map((result) => {
    const key = imageLookupKey(result);
    const image = key ? imageCache.get(key) : undefined;

    return {
      ...result,
      imageUrl: image?.imageUrl ?? null,
      imageAttribution: image?.imageAttribution ?? null,
    };
  });
}

type NameOnlySuggestion = Omit<PlantSpeciesSuggestion, "imageUrl" | "imageAttribution">;

function perenualCacheKey(query: string, limit: number) {
  return `search:v1:${query.toLowerCase()}:limit=${limit}`;
}

export function perenualSearchError(status: number) {
  if (status === 429) {
    return new Error("Plant search daily limit reached. Try again tomorrow.");
  }

  return new Error("Plant search failed.");
}

async function fetchPerenualSpecies(
  apiKey: string,
  query: string,
  limit: number,
): Promise<NameOnlySuggestion[]> {
  return withCache(
    PERENUAL_CACHE_NAMESPACE,
    perenualCacheKey(query, limit),
    PERENUAL_SEARCH_CACHE_TTL_SECONDS,
    async () => {
      const url = new URL(`${PERENUAL_API_BASE}/species-list`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("q", query);

      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw perenualSearchError(response.status);
      }

      const body = (await response.json()) as PerenualSpeciesListResponse;
      const results: NameOnlySuggestion[] = [];

      for (const species of body.data ?? []) {
        const mapped = mapSpecies(species);
        if (mapped) {
          results.push(mapped);
        }
        if (results.length >= limit) {
          break;
        }
      }

      return results;
    },
  );
}

export function createPlantLookupService(apiKey: string | undefined) {
  const inaturalist = createInaturalistLookupService();

  return {
    isConfigured() {
      return Boolean(apiKey);
    },

    async search(query: string, limit = 10): Promise<PlantSpeciesSuggestion[]> {
      if (!apiKey) {
        throw new Error("Plant lookup is not configured.");
      }

      const trimmed = normalizeSearchQuery(query);
      if (trimmed.length < 2) {
        return [];
      }

      const results = await fetchPerenualSpecies(apiKey, trimmed, limit);
      return enrichWithImages(results, (imageQuery) => inaturalist.lookupImage(imageQuery));
    },
  };
}

export type PlantLookupService = ReturnType<typeof createPlantLookupService>;
