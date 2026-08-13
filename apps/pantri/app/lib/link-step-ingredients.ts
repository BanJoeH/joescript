import { getCanonicalIngredientName } from "~/lib/ingredient-name";

/** Words that are too generic to match on their own inside step text. */
const STANDALONE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "broth",
  "butter",
  "cheese",
  "chopped",
  "cream",
  "dried",
  "extract",
  "flakes",
  "flour",
  "fresh",
  "ground",
  "juice",
  "large",
  "leaves",
  "medium",
  "milk",
  "minced",
  "mix",
  "of",
  "oil",
  "or",
  "paste",
  "powder",
  "puree",
  "purée",
  "sauce",
  "seasoning",
  "seeds",
  "small",
  "spice",
  "spices",
  "stock",
  "the",
  "vinegar",
  "water",
  "with",
  "yoghurt",
  "yogurt",
]);

export type StepTextSegment =
  | { type: "text"; text: string }
  | { type: "ingredient"; text: string; ingredientIndex: number };

type MatchPhrase = {
  phrase: string;
  ingredientIndex: number;
  isFullName: boolean;
};

type MatchSpan = {
  start: number;
  end: number;
  ingredientIndex: number;
};

function normalizeSpaces(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function pluralizeWord(word: string): string {
  if (word.endsWith("s")) return word;
  if (word.endsWith("y") && word.length > 2 && !/[aeiou]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (/(x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
}

function phraseVariants(phrase: string): string[] {
  const normalized = normalizeSpaces(phrase);
  if (!normalized) return [];

  const words = normalized.split(" ");
  const last = words.at(-1);
  if (!last) return [normalized];

  const pluralLast = pluralizeWord(last);
  const pluralPhrase = [...words.slice(0, -1), pluralLast].join(" ");

  return normalized === pluralPhrase ? [normalized] : [normalized, pluralPhrase];
}

function isQualifierWord(word: string): boolean {
  return STANDALONE_STOPWORDS.has(word) || STANDALONE_STOPWORDS.has(pluralizeWord(word));
}

function canUseStandalone(word: string): boolean {
  return word.length >= 3 && !isQualifierWord(word);
}

function addPhrases(target: Set<string>, phrase: string) {
  for (const variant of phraseVariants(phrase)) {
    if (variant.length >= 3) target.add(variant);
  }
}

/**
 * Build searchable phrases for an ingredient, longest-first later.
 * Includes full name plus safe single-token aliases (e.g. "cumin" from "cumin powder").
 */
export function getIngredientMatchPhrases(name: string): string[] {
  const canonical = getCanonicalIngredientName(name);
  const original = normalizeSpaces(name);
  const phrases = new Set<string>();

  addPhrases(phrases, canonical);
  addPhrases(phrases, original);

  const words = canonical.split(" ").filter(Boolean);
  if (words.length > 1) {
    const last = words.at(-1);
    const lastIsQualifier = Boolean(last && isQualifierWord(last));

    for (let end = words.length - 1; end >= 1; end -= 1) {
      const prefixWords = words.slice(0, end);
      // Only strip trailing qualifiers like "powder"/"stock"; keep "red" from matching alone.
      if (prefixWords.length === 1 && !lastIsQualifier) continue;
      if (prefixWords.length === 1 && !canUseStandalone(prefixWords[0] ?? "")) continue;
      addPhrases(phrases, prefixWords.join(" "));
    }

    if (lastIsQualifier && words.length >= 3) {
      const head = words[words.length - 2];
      if (head && canUseStandalone(head)) {
        addPhrases(phrases, head);
      }
      // e.g. "chilli flakes" from "dried chilli flakes"
      addPhrases(phrases, words.slice(-2).join(" "));
    }

    if (last && canUseStandalone(last)) {
      addPhrases(phrases, last);
    }
  }

  return [...phrases].sort((left, right) => right.length - left.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectMatchPhrases(ingredients: Array<{ name: string }>): MatchPhrase[] {
  const phrases: MatchPhrase[] = [];

  ingredients.forEach((ingredient, ingredientIndex) => {
    const canonical = getCanonicalIngredientName(ingredient.name);
    const original = normalizeSpaces(ingredient.name);
    const fullNames = new Set([...phraseVariants(canonical), ...phraseVariants(original)]);

    for (const phrase of getIngredientMatchPhrases(ingredient.name)) {
      phrases.push({
        phrase,
        ingredientIndex,
        isFullName: fullNames.has(phrase),
      });
    }
  });

  phrases.sort((left, right) => {
    const lengthDiff = right.phrase.length - left.phrase.length;
    if (lengthDiff !== 0) return lengthDiff;
    if (left.isFullName !== right.isFullName) return left.isFullName ? -1 : 1;
    return left.ingredientIndex - right.ingredientIndex;
  });

  return phrases;
}

function overlaps(start: number, end: number, spans: MatchSpan[]): boolean {
  return spans.some((span) => start < span.end && end > span.start);
}

function findMatchSpans(stepText: string, ingredients: Array<{ name: string }>): MatchSpan[] {
  if (!stepText || ingredients.length === 0) return [];

  const phrases = collectMatchPhrases(ingredients);
  const spans: MatchSpan[] = [];

  for (const { phrase, ingredientIndex } of phrases) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,
      "giu",
    );

    for (const match of stepText.matchAll(pattern)) {
      const start = match.index ?? -1;
      if (start < 0) continue;
      const end = start + match[0].length;
      if (overlaps(start, end, spans)) continue;
      spans.push({ start, end, ingredientIndex });
    }
  }

  spans.sort((left, right) => left.start - right.start);
  return spans;
}

/** Split step text into plain text and ingredient-linked segments for cook highlighting. */
export function linkStepIngredients(
  stepText: string,
  ingredients: Array<{ name: string }>,
): StepTextSegment[] {
  const spans = findMatchSpans(stepText, ingredients);
  if (spans.length === 0) {
    return stepText ? [{ type: "text", text: stepText }] : [];
  }

  const segments: StepTextSegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({ type: "text", text: stepText.slice(cursor, span.start) });
    }
    segments.push({
      type: "ingredient",
      text: stepText.slice(span.start, span.end),
      ingredientIndex: span.ingredientIndex,
    });
    cursor = span.end;
  }

  if (cursor < stepText.length) {
    segments.push({ type: "text", text: stepText.slice(cursor) });
  }

  return segments;
}
