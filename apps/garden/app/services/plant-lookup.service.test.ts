import { afterEach, describe, expect, it, vi } from "vitest";

import { clearMemoryCacheForTests } from "~/lib/cache.server";

import {
  createPlantLookupService,
  enrichWithImages,
  mapSpecies,
  normalizeSearchQuery,
  parseScientificName,
  perenualSearchError,
} from "./plant-lookup.service";

describe("perenualSearchError", () => {
  it("returns a rate-limit message for 429 responses", () => {
    expect(perenualSearchError(429).message).toBe(
      "Plant search daily limit reached. Try again tomorrow.",
    );
  });

  it("returns a generic message for other failures", () => {
    expect(perenualSearchError(500).message).toBe("Plant search failed.");
  });
});

describe("createPlantLookupService", () => {
  afterEach(() => {
    clearMemoryCacheForTests();
    vi.unstubAllGlobals();
  });

  it("surfaces Perenual rate-limit errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const service = createPlantLookupService("test-key");

    await expect(service.search("lavender")).rejects.toThrow(
      "Plant search daily limit reached. Try again tomorrow.",
    );
  });
});

describe("normalizeSearchQuery", () => {
  it("trims and caps query length", () => {
    expect(normalizeSearchQuery("  lavender  ")).toBe("lavender");
    expect(normalizeSearchQuery("a".repeat(120))).toHaveLength(100);
  });
});

describe("parseScientificName", () => {
  it("returns the binomial when no cultivar is present", () => {
    expect(parseScientificName(["Lavandula angustifolia"])).toEqual({
      latinName: "Lavandula angustifolia",
      cultivar: null,
    });
  });

  it("extracts cultivar from single-quoted epithets", () => {
    expect(parseScientificName(["Abies alba 'Pyramidalis'"])).toEqual({
      latinName: "Abies alba",
      cultivar: "Pyramidalis",
    });
  });

  it("extracts cultivar from double-quoted epithets", () => {
    expect(parseScientificName(['Rosa gallica "Officinalis"'])).toEqual({
      latinName: "Rosa gallica",
      cultivar: "Officinalis",
    });
  });

  it("extracts cultivar from cv. notation", () => {
    expect(parseScientificName(["Malus domestica cv. Bramley"])).toEqual({
      latinName: "Malus domestica",
      cultivar: "Bramley",
    });
  });
});

describe("mapSpecies", () => {
  it("maps perenual fields and prefers explicit cultivar", () => {
    expect(
      mapSpecies({
        id: 1,
        common_name: "lavender",
        scientific_name: ["Lavandula angustifolia 'Munstead'"],
        cultivar: "Hidcote",
      }),
    ).toEqual({
      id: 1,
      commonName: "lavender",
      latinName: "Lavandula angustifolia",
      cultivar: "Hidcote",
    });
  });

  it("returns null when no usable names are present", () => {
    expect(
      mapSpecies({
        id: 2,
        common_name: null,
        scientific_name: [],
        cultivar: null,
      }),
    ).toBeNull();
  });
});

describe("enrichWithImages", () => {
  it("dedupes lookups and caps enrichment calls", async () => {
    const lookupImage = vi.fn().mockImplementation(async (query: string) => ({
      imageUrl: `https://example.com/${query}.jpg`,
      imageAttribution: query,
    }));

    const results = await enrichWithImages(
      [
        { id: 1, commonName: "lavender", latinName: "Lavandula angustifolia", cultivar: null },
        { id: 2, commonName: "more lavender", latinName: "Lavandula angustifolia", cultivar: null },
        { id: 3, commonName: "rose", latinName: "Rosa gallica", cultivar: null },
        { id: 4, commonName: "mint", latinName: "Mentha spicata", cultivar: null },
        { id: 5, commonName: "sage", latinName: "Salvia officinalis", cultivar: null },
        { id: 6, commonName: "thyme", latinName: "Thymus vulgaris", cultivar: null },
        { id: 7, commonName: "oregano", latinName: "Origanum vulgare", cultivar: null },
      ],
      lookupImage,
    );

    expect(lookupImage).toHaveBeenCalledTimes(5);
    expect(results[0].imageUrl).toBe("https://example.com/Lavandula angustifolia.jpg");
    expect(results[1].imageUrl).toBe("https://example.com/Lavandula angustifolia.jpg");
    expect(results[6].imageUrl).toBeNull();
  });
});
