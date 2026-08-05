/** Shopping/home intents that already update optimistically on the client. */
const OPTIMISTIC_HOME_INTENTS = new Set([
  "toggle-ingredient",
  "toggle-odd-bit",
  "clear-recipe-purchased",
  "clear-odd-bits-purchased",
]);

type RevalidateArgs = {
  formMethod?: string;
  formData?: FormData;
  defaultShouldRevalidate: boolean;
};

export function shouldRevalidatePantryRoutes({
  formMethod,
  formData,
  defaultShouldRevalidate,
}: RevalidateArgs) {
  if (formMethod === "POST" && formData) {
    const intent = formData.get("intent");
    if (typeof intent === "string" && OPTIMISTIC_HOME_INTENTS.has(intent)) {
      return false;
    }
  }

  return defaultShouldRevalidate;
}
