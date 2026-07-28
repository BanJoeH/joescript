import { Camera, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { matchSorter } from "match-sorter";
import { useDeferredValue, useMemo, useState } from "react";
import { useFetcher } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { pantryPath } from "~/lib/pantry-path";
import type { RecipeRecord } from "~/services/recipes.service";

export type RecipesListViewProps = {
  recipes: RecipeRecord[];
  pantryId: string;
};

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
  const addFetcher = useFetcher<{ error?: string }>();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredRecipes = useMemo(
    () => filterRecipes(recipes, deferredQuery),
    [recipes, deferredQuery],
  );

  return (
    <div className="flex flex-col gap-5">
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
        description="Your pantry's shared recipe collection."
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
            placeholder="Search by name or ingredient…"
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
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No recipes yet. Add one to get started.
          </CardContent>
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No recipes match “{query.trim()}”.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filteredRecipes.map((recipe) => (
            <li
              className="rounded-md border-[1.5px] border-border bg-card p-4 shadow-[4px_4px_8px_0_rgba(0,0,0,0.2)]"
              key={recipe.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    className="block truncate font-medium uppercase tracking-[0.04em] hover:underline"
                    to={pantryPath(pantryId, `recipes/${recipe.id}/edit`)}
                    title={recipe.name}
                  >
                    {recipe.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {recipe.ingredients.length} ingredient
                    {recipe.ingredients.length === 1 ? "" : "s"}
                    {recipe.servings ? ` · Serves ${recipe.servings}` : ""}
                  </p>
                  {recipe.link ? (
                    <a
                      className="text-sm text-muted-foreground hover:underline"
                      href={recipe.link}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {recipe.link}
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <addFetcher.Form action={action} method="post">
                    <input name="intent" type="hidden" value="add-to-shopping" />
                    <input name="recipeId" type="hidden" value={recipe.id} />
                    <Button
                      aria-label={`Add ${recipe.name} to shopping`}
                      size="icon"
                      type="submit"
                      variant="outline"
                    >
                      <ShoppingCart className="size-4" />
                    </Button>
                  </addFetcher.Form>
                  <DeleteForm
                    action={action}
                    aria-label={`Delete ${recipe.name}`}
                    confirmMessage={`Delete "${recipe.name}"? This cannot be undone.`}
                    hiddenFields={{ recipeId: recipe.id }}
                    size="icon"
                  >
                    <Trash2 className="size-4" />
                  </DeleteForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
