import { Camera, Plus } from "lucide-react";
import { Form, useActionData, useLoaderData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes";

export { action, loader } from "./pantry.recipes.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Recipes · Pantri" }];
}

export default function RecipesPage() {
  const { recipes, pantryId } = useLoaderData<typeof import("./pantry.recipes.server").loader>();
  const actionData = useActionData<typeof import("./pantry.recipes.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Recipes</h2>
          <p className="text-sm text-muted-foreground">Your pantry's shared recipe collection.</p>
        </div>
        <div className="flex gap-2">
          <Link to={pantryPath(pantryId, "recipes/import-photos")}>
            <Button size="sm" type="button" variant="outline">
              <Camera className="size-4" /> Import
            </Button>
          </Link>
          <Link to={pantryPath(pantryId, "recipes/new")}>
            <Button size="sm" type="button">
              <Plus className="size-4" /> New recipe
            </Button>
          </Link>
        </div>
      </div>

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No recipes yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {recipes.map((recipe) => (
            <li className="rounded-md border bg-card p-4" key={recipe.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    className="font-medium hover:underline"
                    to={pantryPath(pantryId, `recipes/${recipe.id}/edit`)}
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
                  <Form method="post">
                    <input name="intent" type="hidden" value="add-to-shopping" />
                    <input name="recipeId" type="hidden" value={recipe.id} />
                    <Button size="sm" type="submit" variant="outline">
                      Add to shopping
                    </Button>
                  </Form>
                  <DeleteForm
                    confirmMessage={`Delete "${recipe.name}"? This cannot be undone.`}
                    hiddenFields={{ recipeId: recipe.id }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
