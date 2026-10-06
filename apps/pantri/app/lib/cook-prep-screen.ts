/** Title for the first cook swiper screen (description and/or ingredients). */
export function cookPrepScreenTitle(
  description: string | null | undefined,
  ingredientCount: number,
): string {
  const hasDescription = Boolean(description?.trim());
  if (hasDescription && ingredientCount > 0) return "Prep";
  if (hasDescription) return "About";
  return "Ingredients";
}
