import { describe, expect, it } from "vitest";

import { isAllowedImageUrl, mapTaxonPhoto, pickBestTaxon } from "./inaturalist-lookup.service";

describe("isAllowedImageUrl", () => {
  it("allows iNaturalist open-data hosts", () => {
    expect(
      isAllowedImageUrl("https://inaturalist-open-data.s3.amazonaws.com/photos/157057/square.jpg"),
    ).toBe(true);
  });

  it("rejects unexpected hosts", () => {
    expect(isAllowedImageUrl("https://evil.example/photo.jpg")).toBe(false);
  });
});

describe("mapTaxonPhoto", () => {
  it("maps square_url and attribution from default_photo", () => {
    expect(
      mapTaxonPhoto({
        default_photo: {
          square_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg",
          attribution: "(c) epicnom, some rights reserved (CC BY-NC)",
        },
      }),
    ).toEqual({
      imageUrl: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg",
      imageAttribution: "(c) epicnom, some rights reserved (CC BY-NC)",
    });
  });

  it("returns nulls when no photo is present", () => {
    expect(mapTaxonPhoto({ default_photo: null })).toEqual({
      imageUrl: null,
      imageAttribution: null,
    });
  });

  it("rejects photos from untrusted hosts", () => {
    expect(
      mapTaxonPhoto({
        default_photo: {
          square_url: "https://evil.example/photo.jpg",
          attribution: "nope",
        },
      }),
    ).toEqual({
      imageUrl: null,
      imageAttribution: null,
    });
  });
});

describe("pickBestTaxon", () => {
  it("prefers an exact species name match with a photo", () => {
    expect(
      pickBestTaxon(
        [
          {
            name: "Lavandula",
            rank: "genus",
            default_photo: {
              square_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg",
            },
          },
          {
            name: "Lavandula angustifolia",
            rank: "species",
            default_photo: {
              square_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/2/square.jpg",
            },
          },
        ],
        "Lavandula angustifolia",
      )?.name,
    ).toBe("Lavandula angustifolia");
  });
});
