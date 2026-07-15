import { describe, expect, it } from "vitest";

import {
  formatJournalStatus,
  journalEntrySubjectLabel,
  journalStatusLabels,
  WHOLE_GARDEN_LABEL,
} from "~/lib/journal-labels";

describe("journal labels", () => {
  it("formats status values for display", () => {
    expect(formatJournalStatus("done")).toBe(journalStatusLabels.done);
    expect(formatJournalStatus("unknown")).toBe("unknown");
  });

  it("falls back to whole garden when no plant or area", () => {
    expect(journalEntrySubjectLabel(null, null)).toBe(WHOLE_GARDEN_LABEL);
    expect(journalEntrySubjectLabel("Lavender", null)).toBe("Lavender");
    expect(journalEntrySubjectLabel(null, "Patio")).toBe("Patio");
  });
});
