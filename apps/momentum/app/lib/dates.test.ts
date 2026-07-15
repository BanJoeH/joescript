import { assert, describe, expect, it } from "vitest";

import {
  addZonedDays,
  calendarDaysBetween,
  endOfZonedDay,
  formatDate,
  formatDateInput,
  getZonedParts,
  parseDateInput,
  resolvePerformedAtForCreate,
  resolvePerformedAtForUpdate,
  startOfZonedDay,
  zonedLocalDateTimeToUtc,
} from "./dates";

describe("parseDateInput", () => {
  it("parses YYYY-MM-DD as noon in the given time zone", () => {
    const parsed = parseDateInput("2025-06-15", "America/Los_Angeles");
    assert(parsed);
    expect(formatDateInput(parsed, "America/Los_Angeles")).toBe("2025-06-15");
    expect(getZonedParts(parsed, "America/Los_Angeles").hour).toBe(12);
  });

  it("keeps the calendar day for positive-offset zones", () => {
    const parsed = parseDateInput("2026-07-14", "Pacific/Kiritimati");
    assert(parsed);
    expect(formatDateInput(parsed, "Pacific/Kiritimati")).toBe("2026-07-14");
    expect(formatDateInput(parsed, "UTC")).not.toBe("2026-07-15");
  });

  it("rejects invalid values", () => {
    expect(parseDateInput("15-06-2025")).toBeNull();
    expect(parseDateInput("")).toBeNull();
  });
});

describe("zoned day boundaries", () => {
  it("computes start/end of day in London across BST", () => {
    const mid = zonedLocalDateTimeToUtc(2026, 7, 14, 15, 0, 0, "Europe/London");
    const start = startOfZonedDay(mid, "Europe/London");
    const end = endOfZonedDay(mid, "Europe/London");

    expect(formatDateInput(start, "Europe/London")).toBe("2026-07-14");
    expect(getZonedParts(start, "Europe/London")).toMatchObject({ hour: 0, minute: 0 });
    expect(formatDateInput(end, "Europe/London")).toBe("2026-07-14");
    expect(getZonedParts(end, "Europe/London")).toMatchObject({ hour: 23, minute: 59 });
  });

  it("counts calendar days in the user zone", () => {
    const a = zonedLocalDateTimeToUtc(2026, 1, 1, 23, 0, 0, "America/New_York");
    const b = zonedLocalDateTimeToUtc(2026, 1, 3, 1, 0, 0, "America/New_York");
    expect(calendarDaysBetween(a, b, "America/New_York")).toBe(2);
  });

  it("adds days in the user zone", () => {
    const start = zonedLocalDateTimeToUtc(2026, 3, 10, 12, 0, 0, "America/New_York");
    const next = addZonedDays(start, -7, "America/New_York");
    expect(formatDateInput(next, "America/New_York")).toBe("2026-03-03");
  });
});

describe("formatDate", () => {
  it("formats with an explicit time zone", () => {
    // 2026-07-14 01:30 UTC is still 13 Jul evening in LA
    const instant = new Date(Date.UTC(2026, 6, 14, 1, 30, 0));
    expect(formatDate(instant, "America/Los_Angeles")).toContain("13");
    expect(formatDate(instant, "UTC")).toContain("14");
  });
});

describe("resolvePerformedAtForCreate", () => {
  it("uses the current time when the selected date is today in that zone", () => {
    const now = zonedLocalDateTimeToUtc(2026, 7, 14, 18, 30, 0, "Europe/London");
    const selected = parseDateInput("2026-07-14", "Europe/London");
    assert(selected);
    const resolved = resolvePerformedAtForCreate(selected, "Europe/London", now);
    expect(resolved.getTime()).toBe(now.getTime());
  });

  it("keeps noon for other dates", () => {
    const now = zonedLocalDateTimeToUtc(2026, 7, 14, 18, 30, 0, "Europe/London");
    const selected = parseDateInput("2020-01-10", "Europe/London");
    assert(selected);
    const resolved = resolvePerformedAtForCreate(selected, "Europe/London", now);
    expect(getZonedParts(resolved, "Europe/London").hour).toBe(12);
    expect(formatDateInput(resolved, "Europe/London")).toBe("2020-01-10");
  });
});

describe("resolvePerformedAtForUpdate", () => {
  it("preserves the existing timestamp when the date is unchanged", () => {
    const existing = zonedLocalDateTimeToUtc(2025, 6, 15, 9, 30, 0, "Europe/London");
    const next = parseDateInput("2025-06-15", "Europe/London");
    assert(next);
    const resolved = resolvePerformedAtForUpdate(next, existing, "Europe/London");
    expect(resolved.getTime()).toBe(existing.getTime());
  });
});
