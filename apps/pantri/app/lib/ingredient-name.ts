const KEEP_AS_IS = new Set(["asparagus", "couscous"]);

function singularizeWord(word: string): string {
  if (KEEP_AS_IS.has(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes") && word.length > 4) return word.slice(0, -2);
  if (/(ches|shes|xes|zes|ses)$/.test(word) && word.length > 4) {
    return word.slice(0, -2);
  }
  if (
    word.endsWith("s") &&
    word.length > 3 &&
    !word.endsWith("ss") &&
    !word.endsWith("us") &&
    !word.endsWith("is")
  ) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Canonical name used for grouping/toggling ingredients across recipes. Only
 * the final word is singularized so phrases like "red onions" and "red onion"
 * group together without aggressively rewriting the whole ingredient text.
 */
export function getCanonicalIngredientName(name: string): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, " ");
  const words = normalized.split(" ");
  const lastWord = words.at(-1);
  if (!lastWord) return normalized;
  return [...words.slice(0, -1), singularizeWord(lastWord)].join(" ");
}

export function ingredientNamesMatch(a: string | undefined, b: string | undefined): boolean {
  return getCanonicalIngredientName(a ?? "") === getCanonicalIngredientName(b ?? "");
}
