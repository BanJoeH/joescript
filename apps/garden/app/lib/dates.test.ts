import { describe, expect, it } from "vitest";

import {
  formatDateInput,
  parseDateInput,
  resolvePerformedAtForCreate,
  resolvePerformedAtForUpdate,
} from "./dates";

function parseDate(value: string) {
  const parsed = parseDateInput(value);
  expect(parsed).not.toBeNull();
  if (parsed === null) {
    throw new Error(`expected valid date: ${value}`);
  }
  return parsed;
}

describe("parseDateInput", () => {
  it("parses YYYY-MM-DD as local noon", () => {
    const parsed = parseDate("2025-06-15");
    expect(parsed.getHours()).toBe(12);
    expect(formatDateInput(parsed)).toBe("2025-06-15");
  });

  it("rejects invalid values", () => {
    expect(parseDateInput("15-06-2025")).toBeNull();
    expect(parseDateInput("")).toBeNull();
  });
});

describe("resolvePerformedAtForCreate", () => {
  it("uses the current time when the selected date is today", () => {
    const before = Date.now();
    const resolved = resolvePerformedAtForCreate(parseDate(formatDateInput(new Date())));
    const after = Date.now();

    expect(resolved.getTime()).toBeGreaterThanOrEqual(before);
    expect(resolved.getTime()).toBeLessThanOrEqual(after);
  });

  it("keeps noon for other dates", () => {
    const resolved = resolvePerformedAtForCreate(parseDate("2020-01-10"));
    expect(resolved.getHours()).toBe(12);
    expect(formatDateInput(resolved)).toBe("2020-01-10");
  });
});

describe("resolvePerformedAtForUpdate", () => {
  it("preserves the existing timestamp when the date is unchanged", () => {
    const existing = new Date("2025-06-15T09:30:00");
    const resolved = resolvePerformedAtForUpdate(parseDate("2025-06-15"), existing);

    expect(resolved.getTime()).toBe(existing.getTime());
  });

  it("resolves a new date through create rules", () => {
    const existing = new Date("2025-06-14T09:30:00");
    const resolved = resolvePerformedAtForUpdate(parseDate("2020-01-10"), existing);

    expect(resolved.getHours()).toBe(12);
    expect(formatDateInput(resolved)).toBe("2020-01-10");
  });
});
