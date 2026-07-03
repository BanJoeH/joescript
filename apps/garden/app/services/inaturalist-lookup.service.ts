import { withCache } from "~/lib/cache.server";
import { fetchWithTimeout } from "~/lib/fetch.server";

const INATURALIST_API_BASE = "https://api.inaturalist.org/v1";
const INATURALIST_CACHE_NAMESPACE = "inaturalist";
export const INATURALIST_IMAGE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;
const PLANTAE_TAXON_ID = "47126";
const SPECIES_RANKS = new Set(["species", "subspecies", "variety", "hybrid", "form"]);
const ALLOWED_IMAGE_HOST_SUFFIXES = ["inaturalist-open-data.s3.amazonaws.com"];

export type TaxonImage = {
  imageUrl: string | null;
  imageAttribution: string | null;
};

type InaturalistPhoto = {
  square_url?: string | null;
  attribution?: string | null;
};

type InaturalistTaxon = {
  name?: string | null;
  matched_term?: string | null;
  rank?: string | null;
  default_photo?: InaturalistPhoto | null;
};

type InaturalistAutocompleteResponse = {
  results?: InaturalistTaxon[];
};

export function isAllowedImageUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_IMAGE_HOST_SUFFIXES.includes(hostname);
  } catch {
    return false;
  }
}

export function mapTaxonPhoto(taxon: InaturalistTaxon | null | undefined): TaxonImage {
  const rawUrl = taxon?.default_photo?.square_url?.trim() || null;
  const imageUrl = rawUrl && isAllowedImageUrl(rawUrl) ? rawUrl : null;
  const imageAttribution = imageUrl ? taxon?.default_photo?.attribution?.trim() || null : null;

  return { imageUrl, imageAttribution };
}

export function pickBestTaxon(taxa: InaturalistTaxon[] | undefined, query: string) {
  if (!taxa?.length) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();

  const withPhoto = taxa.filter((taxon) => mapTaxonPhoto(taxon).imageUrl);
  if (withPhoto.length === 0) {
    return null;
  }

  const exactNameMatch = withPhoto.find((taxon) => {
    const name = taxon.name?.trim().toLowerCase() ?? "";
    return name === normalizedQuery;
  });
  if (exactNameMatch) {
    return exactNameMatch;
  }

  const speciesMatch = withPhoto.find((taxon) => SPECIES_RANKS.has(taxon.rank ?? ""));
  if (speciesMatch) {
    return speciesMatch;
  }

  return withPhoto[0] ?? null;
}

function inaturalistCacheKey(query: string) {
  return `image:v1:${query.toLowerCase()}`;
}

async function fetchTaxonImage(query: string): Promise<TaxonImage> {
  const url = new URL(`${INATURALIST_API_BASE}/taxa/autocomplete`);
  url.searchParams.set("q", query);
  url.searchParams.set("taxon_id", PLANTAE_TAXON_ID);
  url.searchParams.set("rank", "species,subspecies,variety,hybrid,form");

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { imageUrl: null, imageAttribution: null };
    }

    const body = (await response.json()) as InaturalistAutocompleteResponse;
    return mapTaxonPhoto(pickBestTaxon(body.results, query));
  } catch {
    return { imageUrl: null, imageAttribution: null };
  }
}

export function createInaturalistLookupService() {
  return {
    async lookupImage(query: string): Promise<TaxonImage> {
      const trimmed = query.trim();
      if (!trimmed) {
        return { imageUrl: null, imageAttribution: null };
      }

      return withCache(
        INATURALIST_CACHE_NAMESPACE,
        inaturalistCacheKey(trimmed),
        INATURALIST_IMAGE_CACHE_TTL_SECONDS,
        () => fetchTaxonImage(trimmed),
      );
    },
  };
}

export type InaturalistLookupService = ReturnType<typeof createInaturalistLookupService>;
