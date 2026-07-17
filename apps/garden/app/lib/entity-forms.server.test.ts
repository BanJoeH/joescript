import { describe, expect, it } from "vitest";

import { parsePlantPhotoUpload } from "./entity-forms.server";

describe("parsePlantPhotoUpload", () => {
  it("returns null when no image was selected", () => {
    expect(parsePlantPhotoUpload(new FormData())).toBeNull();
  });

  it("parses the image and resized dimensions", () => {
    const formData = new FormData();
    const file = new File(["image-bytes"], "plant.jpg", { type: "image/jpeg" });
    formData.set("plantPhoto", file);
    formData.set("plantPhotoWidth", "1200");
    formData.set("plantPhotoHeight", "900");

    expect(parsePlantPhotoUpload(formData)).toEqual({
      file,
      role: "general",
      width: 1200,
      height: 900,
    });
  });
});
