import type { OutboxEntry } from "~/lib/offline/types";

/** Short human label for an outbox row (banner / inspector). */
export function outboxEntryLabel(entry: OutboxEntry): string {
  const intent = entry.fields.intent ?? "unknown";
  const name = (entry.fields.name ?? "").trim();

  switch (intent) {
    case "add-from-recipe":
      return name ? `Add recipe “${name}”` : "Add recipe to shopping";
    case "add-odd-bit":
      return name ? `Add odd bit “${name}”` : "Add odd bit";
    case "toggle-odd-bit":
      return entry.fields.purchased === "true" ? "Check odd bit" : "Uncheck odd bit";
    case "remove-odd-bit":
      return "Remove odd bit";
    case "clear-odd-bits-purchased":
      return "Clear odd-bit checks";
    case "toggle-ingredient":
      return entry.fields.purchased === "true" ? "Check ingredient" : "Uncheck ingredient";
    case "remove-recipe":
      return "Remove recipe from list";
    case "clear-recipe-purchased":
      return "Clear recipe checks";
    case "toggle":
      return name
        ? entry.fields.purchased === "true"
          ? `Check “${name}”`
          : `Uncheck “${name}”`
        : entry.fields.purchased === "true"
          ? "Check sorted item"
          : "Uncheck sorted item";
    case "clear-all":
      return "Clear all sorted checks";
    case "set-category":
      return name ? `Move “${name}” to ${entry.fields.section ?? "aisle"}` : "Set sorted category";
    default:
      return intent;
  }
}
