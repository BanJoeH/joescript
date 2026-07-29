import { createCategoriesService } from "~/services/categories.service";
import { createOddBitsService } from "~/services/odd-bits.service";
import { createPantriesService } from "~/services/pantries.service";
import { createPhotosService } from "~/services/photos.service";
import { createRecipesService } from "~/services/recipes.service";
import { createShoppingService } from "~/services/shopping.service";
import type { PantriContext } from "~/services/types";

export function createPantriService(context: PantriContext) {
  return {
    recipes: createRecipesService(context),
    shopping: createShoppingService(context),
    oddBits: createOddBitsService(context),
    categories: createCategoriesService(context),
    photos: createPhotosService(context),
    pantries: createPantriesService({ db: context.db, userId: context.userId }),
  };
}

export type PantriService = ReturnType<typeof createPantriService>;
