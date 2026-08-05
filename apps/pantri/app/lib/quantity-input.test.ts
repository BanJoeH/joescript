import { describe, expect, it } from "vitest";

import {
  commitQuantityString,
  completeUnitPrefix,
  formatQuantityString,
  getQuantityCompletion,
  parseQuantityString,
} from "./quantity-input";

describe("parseQuantityString", () => {
  it("parses attached and spaced units", () => {
    expect(parseQuantityString("300g")).toEqual({
      amount: 300,
      unit: "g",
      unitPrefix: "g",
      complete: true,
    });
    expect(parseQuantityString("3 cloves")).toEqual({
      amount: 3,
      unit: "clove",
      unitPrefix: "cloves",
      complete: true,
    });
    expect(parseQuantityString("1 cup")).toEqual({
      amount: 1,
      unit: "cup",
      unitPrefix: "cup",
      complete: true,
    });
  });

  it("parses fractions", () => {
    expect(parseQuantityString("1/2 tsp")).toEqual({
      amount: 0.5,
      unit: "tsp",
      unitPrefix: "tsp",
      complete: true,
    });
    expect(parseQuantityString("1 1/2 cup")).toEqual({
      amount: 1.5,
      unit: "cup",
      unitPrefix: "cup",
      complete: true,
    });
    expect(parseQuantityString("1 / 2 tsp")).toEqual({
      amount: 0.5,
      unit: "tsp",
      unitPrefix: "tsp",
      complete: true,
    });
    expect(parseQuantityString("1 1 / 2 cup")).toEqual({
      amount: 1.5,
      unit: "cup",
      unitPrefix: "cup",
      complete: true,
    });
  });

  it("parses kilograms and aliases", () => {
    expect(parseQuantityString("2 kilograms")).toEqual({
      amount: 2,
      unit: "kg",
      unitPrefix: "kilograms",
      complete: true,
    });
    expect(parseQuantityString("1.5 kg")).toEqual({
      amount: 1.5,
      unit: "kg",
      unitPrefix: "kg",
      complete: true,
    });
    expect(parseQuantityString("500g")).toEqual({
      amount: 500,
      unit: "g",
      unitPrefix: "g",
      complete: true,
    });
    expect(parseQuantityString("2 kilo")).toEqual({
      amount: 2,
      unit: "kg",
      unitPrefix: "kilo",
      complete: true,
    });
  });

  it("marks partial unit prefixes incomplete", () => {
    expect(parseQuantityString("1 c")).toEqual({
      amount: 1,
      unit: null,
      unitPrefix: "c",
      complete: false,
    });
    expect(parseQuantityString("1 cl")).toEqual({
      amount: 1,
      unit: null,
      unitPrefix: "cl",
      complete: false,
    });
  });

  it("allows unitless counts", () => {
    expect(parseQuantityString("3")).toEqual({
      amount: 3,
      unit: null,
      unitPrefix: "",
      complete: true,
    });
  });

  it("parses decimal shorthand", () => {
    expect(parseQuantityString(".5")).toEqual({
      amount: 0.5,
      unit: null,
      unitPrefix: "",
      complete: true,
    });
    expect(parseQuantityString(".5 tsp")).toEqual({
      amount: 0.5,
      unit: "tsp",
      unitPrefix: "tsp",
      complete: true,
    });
    expect(parseQuantityString("1.")).toEqual({
      amount: 1,
      unit: null,
      unitPrefix: "",
      complete: true,
    });
    expect(parseQuantityString("1. cup")).toEqual({
      amount: 1,
      unit: "cup",
      unitPrefix: "cup",
      complete: true,
    });
  });
});

describe("completeUnitPrefix", () => {
  it("disambiguates short prefixes", () => {
    expect(completeUnitPrefix("c")).toEqual(expect.arrayContaining(["cup", "clove", "can"]));
    expect(completeUnitPrefix("cl")).toEqual(["clove"]);
    expect(completeUnitPrefix("cu")).toEqual(["cup"]);
  });
});

describe("getQuantityCompletion", () => {
  it("returns ghost suffix for unique prefixes", () => {
    expect(getQuantityCompletion("1 cl")).toEqual({
      suggestions: ["clove"],
      amount: 1,
      suggestionLabels: ["1 clove"],
      completionSuffix: "ove",
      completedValue: "1 clove",
    });
  });

  it("returns multiple suggestions for ambiguous prefixes", () => {
    const completion = getQuantityCompletion("1 c");
    expect(completion?.suggestions).toEqual(expect.arrayContaining(["cup", "clove", "can"]));
    expect(completion?.completionSuffix).toBe("up");
  });

  it("completes kilogram prefixes via aliases", () => {
    expect(getQuantityCompletion("1 kil")).toEqual({
      suggestions: ["kg"],
      amount: 1,
      suggestionLabels: ["1kg"],
      completionSuffix: "ogram",
      completedValue: "1kg",
    });
    expect(getQuantityCompletion("1 k")).toEqual({
      suggestions: ["kg"],
      amount: 1,
      suggestionLabels: ["1kg"],
      completionSuffix: "g",
      completedValue: "1kg",
    });
  });
});

describe("commitQuantityString", () => {
  it("auto-resolves a unique partial prefix", () => {
    expect(commitQuantityString("1 cl")).toEqual({ amount: 1, unit: "clove" });
  });

  it("keeps ambiguous prefixes unresolved", () => {
    expect(commitQuantityString("1 c")).toEqual({ amount: 1, unit: null });
  });
});

describe("formatQuantityString", () => {
  it("formats structured values for the input", () => {
    expect(formatQuantityString(300, "g")).toBe("300g");
    expect(formatQuantityString(3, "clove")).toBe("3 cloves");
    expect(formatQuantityString(1, "cup")).toBe("1 cup");
  });
});
