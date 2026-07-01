import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDateInput,
  parseDateInput,
  resolvePerformedAtForCreate,
  resolvePerformedAtForUpdate,
} from "./dates.ts";

describe("parseDateInput", () => {
  it("parses YYYY-MM-DD as local noon", () => {
    const parsed = parseDateInput("2025-06-15");
    assert.equal(parsed?.getHours(), 12);
    assert.equal(formatDateInput(parsed!), "2025-06-15");
  });

  it("rejects invalid values", () => {
    assert.equal(parseDateInput("15-06-2025"), null);
    assert.equal(parseDateInput(""), null);
  });
});

describe("resolvePerformedAtForCreate", () => {
  it("uses the current time when the selected date is today", () => {
    const before = Date.now();
    const resolved = resolvePerformedAtForCreate(parseDateInput(formatDateInput(new Date()))!);
    const after = Date.now();

    assert.ok(resolved.getTime() >= before);
    assert.ok(resolved.getTime() <= after);
  });

  it("keeps noon for other dates", () => {
    const resolved = resolvePerformedAtForCreate(parseDateInput("2020-01-10")!);
    assert.equal(resolved.getHours(), 12);
    assert.equal(formatDateInput(resolved), "2020-01-10");
  });
});

describe("resolvePerformedAtForUpdate", () => {
  it("preserves the existing timestamp when the date is unchanged", () => {
    const existing = new Date("2025-06-15T09:30:00");
    const resolved = resolvePerformedAtForUpdate(parseDateInput("2025-06-15")!, existing);

    assert.equal(resolved.getTime(), existing.getTime());
  });

  it("resolves a new date through create rules", () => {
    const existing = new Date("2025-06-14T09:30:00");
    const resolved = resolvePerformedAtForUpdate(parseDateInput("2020-01-10")!, existing);

    assert.equal(resolved.getHours(), 12);
    assert.equal(formatDateInput(resolved), "2020-01-10");
  });
});
