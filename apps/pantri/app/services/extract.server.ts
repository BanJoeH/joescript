import {
  type RecipeIngredient,
  type RecipeStep,
  recipeIngredientsSchema,
  recipeStepsSchema,
} from "~/lib/recipe-schema";

export type ExtractedRecipe = {
  name: string;
  servings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipePhotoBytes = {
  bytes: Uint8Array;
  contentType: string;
};

const EXTRACTION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You extract recipes from photos of cookbooks, handwritten cards, or screenshots.
Return ONLY valid JSON matching this schema (no markdown fences):
{
  "name": string,
  "servings": number | null,
  "ingredients": Array<{ "name": string, "amount": number | null, "unit": string | null, "notes"?: string }>,
  "steps": Array<{ "order": number, "text": string }>
}
Rules:
- Use metric units when visible (g, kg, ml, l, tsp, tbsp, cup); otherwise null amount/unit.
- Ingredient "name" is the food only (lowercase), put prep detail in "notes".
- Steps are ordered from 0. Combine multi-page photos into one recipe.
- If text is unreadable, still return best-effort JSON with empty arrays rather than prose.`;

function placeholderRecipe(photoCount: number, nameHint?: string): ExtractedRecipe {
  return {
    name: nameHint?.trim() || "Imported recipe",
    servings: null,
    ingredients: [],
    steps: [
      {
        order: 0,
        text: `Add ingredients and steps from the ${photoCount} imported photo${photoCount === 1 ? "" : "s"}.`,
      },
    ],
  };
}

function bytesToDataUri(bytes: Uint8Array, contentType: string): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeExtracted(raw: unknown, fallbackName?: string): ExtractedRecipe {
  const record = raw as {
    name?: unknown;
    servings?: unknown;
    ingredients?: unknown;
    steps?: unknown;
  };

  const ingredients = recipeIngredientsSchema.parse(record.ingredients ?? []);
  const steps = recipeStepsSchema
    .parse(record.steps ?? [])
    .map((step, index) => ({ ...step, order: index }));

  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name.trim()
      : fallbackName?.trim() || "Imported recipe";

  const servings =
    typeof record.servings === "number" && Number.isFinite(record.servings)
      ? Math.max(0, Math.round(record.servings))
      : null;

  return { name, servings, ingredients, steps };
}

/**
 * Extract a structured recipe from one or more photo byte payloads using
 * Workers AI vision. Falls back to an editable placeholder if AI is unavailable
 * or the model response cannot be parsed.
 */
export async function extractRecipeFromPhotos(options: {
  photos: RecipePhotoBytes[];
  ai?: Ai;
  nameHint?: string;
}): Promise<ExtractedRecipe> {
  const { photos, ai, nameHint } = options;
  if (photos.length === 0) {
    return placeholderRecipe(0, nameHint);
  }

  if (!ai) {
    return placeholderRecipe(photos.length, nameHint);
  }

  try {
    const content: Array<{ type: string; text?: string; image?: string }> = [
      {
        type: "text",
        text: "Extract the full recipe from these photo(s) into the required JSON schema.",
      },
      ...photos.map((photo) => ({
        type: "image" as const,
        image: bytesToDataUri(photo.bytes, photo.contentType),
      })),
    ];

    const response = (await ai.run(EXTRACTION_MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    })) as { response?: string };

    const text = typeof response?.response === "string" ? response.response : "";
    if (!text) {
      return placeholderRecipe(photos.length, nameHint);
    }

    return normalizeExtracted(extractJsonObject(text), nameHint);
  } catch (error) {
    console.error("Recipe photo extraction failed; using editable placeholder", error);
    return placeholderRecipe(photos.length, nameHint);
  }
}
