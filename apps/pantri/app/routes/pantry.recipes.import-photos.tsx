import { ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { Form, useActionData, useLoaderData } from "react-router";

import { Link } from "~/components/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.import-photos";

export { action, loader } from "./pantry.recipes.import-photos.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Import recipe photos · Pantri" }];
}

export default function ImportPhotosPage() {
  const { pendingPhotos, pantryId } =
    useLoaderData<typeof import("./pantry.recipes.import-photos.server").loader>();
  const actionData = useActionData<typeof import("./pantry.recipes.import-photos.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={pantryPath(pantryId, "recipes")}>
            Recipes
          </Link>{" "}
          / Import from photos
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Import from photos</h2>
      </div>

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Upload photos</CardTitle>
          <CardDescription>
            Take photos of a recipe card, cookbook page, or screenshot. We'll create a draft recipe
            you can review and finish on the edit form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form encType="multipart/form-data" method="post">
            <input name="intent" type="hidden" value="upload" />
            <div className="flex flex-wrap items-center gap-3">
              <input accept="image/jpeg,image/png,image/webp" multiple name="photos" type="file" />
              <Button size="sm" type="submit">
                <ImagePlus className="size-4" /> Upload
              </Button>
            </div>
          </Form>

          {pendingPhotos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{pendingPhotos.length} photo(s) ready to import</p>
              <ul className="space-y-1">
                {pendingPhotos.map((photo) => (
                  <li
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    key={photo.id}
                  >
                    <span className="truncate text-muted-foreground">{photo.r2Key}</span>
                    <Form method="post">
                      <input name="intent" type="hidden" value="remove-photo" />
                      <input name="photoId" type="hidden" value={photo.id} />
                      <Button aria-label="Remove photo" size="icon" type="submit" variant="ghost">
                        <Trash2 className="size-4" />
                      </Button>
                    </Form>
                  </li>
                ))}
              </ul>

              <Form method="post">
                <input name="intent" type="hidden" value="extract" />
                <Button type="submit">
                  <Sparkles className="size-4" /> Create recipe draft
                </Button>
              </Form>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
