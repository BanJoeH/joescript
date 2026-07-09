import type { JournalEntryStatus } from "~/db/schema";
import { journalEntryStatuses } from "~/db/schema";

export const WHOLE_GARDEN_LABEL = "Whole garden";

export const journalStatusLabels: Record<JournalEntryStatus, string> = {
  done: "Done",
  note: "Note",
  skipped: "Skipped",
};

export const journalStatusHint =
  "Done means you finished a task. Note is for observations. Skipped is when you passed this time.";

export function formatJournalStatus(status: string) {
  if (journalEntryStatuses.includes(status as JournalEntryStatus)) {
    return journalStatusLabels[status as JournalEntryStatus];
  }

  return status;
}

export function journalEntrySubjectLabel(plantName: string | null, areaName?: string | null) {
  return plantName ?? areaName ?? WHOLE_GARDEN_LABEL;
}
