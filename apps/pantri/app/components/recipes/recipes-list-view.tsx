import {
  Camera,
  ChevronDown,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { matchSorter } from "match-sorter";
import { useDeferredValue, useMemo, useState } from "react";
import { useFetcher } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { CardList, CardListItem } from "~/components/ui/card-list";
import { Input } from "~/components/ui/input";
import { pantryPath } from "~/lib/pantry-path";
import type { RecipeIngredient } from "~/lib/recipe-schema";
import { cn } from "~/lib/utils";
import type { RecipeRecord } from "~/services/recipes.service";

export type RecipesListViewProps = {
  recipes: RecipeRecord[];
  pantryId: string;
};

type AddToShoppingResult = { added?: string; error?: string };

function formatIngredientLabel(ingredient: RecipeIngredient) {
  const quantity = [ingredient.amount ?? undefined, ingredient.unit ?? undefined]
    .filter((part) => part !== undefined && part !== "")
    .join("");
  const parts = [quantity, ingredient.name].filter(Boolean);
  const label = parts.join(" ");
  return ingredient.notes ? `${label} (${ingredient.notes})` : label;
}

function filterRecipes(recipes: RecipeRecord[], query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...recipes].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }

  return matchSorter(recipes, trimmed, {
    keys: [
      "name",
      (recipe) => recipe.ingredients.map((ingredient) => ingredient.name),
      (recipe) =>
        recipe.ingredients
          .map((ingredient) => ingredient.notes)
          .filter((notes): notes is string => Boolean(notes)),
    ],
  });
}

export function RecipesListView({ recipes, pantryId }: RecipesListViewProps) {
  const action = pantryPath(pantryId, "recipes");
  const { toast } = useToast();
  const addFetcher = useFetcher<AddToShoppingResult>();
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const deferredQuery = useDeferredValue(query);
  const filteredRecipes = useMemo(
    () => filterRecipes(recipes, deferredQuery),
    [recipes, deferredQuery],
  );

  useFetcherSuccessToast(addFetcher, (data) => {
    if (data.added) {
      toast({ title: data.added, message: "Added to shopping" });
    }
  });

  function toggleExpanded(recipeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to={pantryPath(pantryId, "recipes/import-photos")}>
                <Camera className="size-4" /> Import
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={pantryPath(pantryId, "recipes/new")}>
                <Plus className="size-4" /> New recipe
              </Link>
            </Button>
          </>
        }
        description="Shared recipes"
        title="Recipes"
      />

      {recipes.length > 0 ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search recipes"
            autoComplete="off"
            className="pl-9"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            type="search"
            value={query}
          />
        </div>
      ) : null}

      {addFetcher.data?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {addFetcher.data.error}
        </p>
      ) : null}

      {recipes.length === 0 ? (
        <CardList>
          <CardListItem className="px-4 py-3 text-sm text-muted-foreground">
            No recipes yet.
          </CardListItem>
        </CardList>
      ) : filteredRecipes.length === 0 ? (
        <CardList>
          <CardListItem className="px-4 py-3 text-sm text-muted-foreground">
            No recipes match “{query.trim()}”.
          </CardListItem>
        </CardList>
      ) : (
        <CardList>
          {filteredRecipes.map((recipe) => {
            const expanded = expandedIds.has(recipe.id);
            const panelId = `recipe-${recipe.id}`;

            return (
              <CardListItem className={cn(expanded && "bg-muted/40")} key={recipe.id}>
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <button
                    aria-controls={panelId}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => toggleExpanded(recipe.id)}
                    type="button"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        !expanded && "-rotate-90",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold uppercase tracking-[0.06em]">
                        {recipe.name}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-0">
                    <Button asChild className="size-8" size="icon" variant="ghost">
                      <Link
                        aria-label={`Cook ${recipe.name}`}
                        to={pantryPath(pantryId, `recipes/${recipe.id}`)}
                      >
                        <UtensilsCrossed className="size-4" />
                      </Link>
                    </Button>
                    <addFetcher.Form action={action} method="post">
                      <input name="intent" type="hidden" value="add-to-shopping" />
                      <input name="recipeId" type="hidden" value={recipe.id} />
                      <Button
                        aria-label={`Add ${recipe.name} to shopping`}
                        className="size-8"
                        size="icon"
                        type="submit"
                        variant="ghost"
                      >
                        <ShoppingCart className="size-4" />
                      </Button>
                    </addFetcher.Form>
                  </div>
                </div>
                {expanded ? (
                  <div className="space-y-2 px-4 pb-3" id={panelId}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={pantryPath(pantryId, `recipes/${recipe.id}/edit`)}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      {recipe.link ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={recipe.link} rel="noreferrer" target="_blank">
                            <ExternalLink className="size-4" />
                            Source
                          </a>
                        </Button>
                      ) : null}
                      <DeleteForm
                        action={action}
                        confirmMessage={`Delete "${recipe.name}"?`}
                        hiddenFields={{ recipeId: recipe.id }}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DeleteForm>
                    </div>
                    {recipe.ingredients.length === 0 ? (
                      <p className="px-1 text-sm text-muted-foreground">No ingredients</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {[...recipe.ingredients]
                          .sort((a, b) =>
                            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
                          )
                          .map((ingredient) => (
                            <li
                              className="px-1 text-sm capitalize"
                              key={[
                                ingredient.name,
                                ingredient.amount ?? "",
                                ingredient.unit ?? "",
                                ingredient.notes ?? "",
                              ].join("|")}
                            >
                              {formatIngredientLabel(ingredient)}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </CardListItem>
            );
          })}
        </CardList>
      )}
    </div>
  );
}
