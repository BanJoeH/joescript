import { Star } from "lucide-react";
import { Form, useActionData, useLoaderData } from "react-router";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { pantryPath } from "~/lib/pantry-path";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantries";

export { action, loader } from "./pantries.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pantries · Pantri" }];
}

export default function PantriesPage() {
  const { pantries, favoritePantryId } = useLoaderData<typeof import("./pantries.server").loader>();
  const actionData = useActionData<typeof import("./pantries.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="Open, favourite, or create." title="Pantries" />

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      {pantries.length > 0 ? (
        <ul className="space-y-2">
          {pantries.map((pantry) => {
            const isFavorite = favoritePantryId === pantry.id;

            return (
              <li
                className="flex items-stretch overflow-hidden rounded-md border bg-card"
                key={pantry.id}
              >
                <Form className="flex shrink-0 border-r" method="post">
                  <input name="intent" type="hidden" value="toggle-favorite" />
                  <input name="pantryId" type="hidden" value={pantry.id} />
                  <Button
                    aria-label={
                      isFavorite
                        ? `Remove ${pantry.name} as favourite`
                        : `Set ${pantry.name} as favourite`
                    }
                    className="h-full rounded-none px-3"
                    size="icon"
                    title={isFavorite ? "Remove favourite" : "Set as favourite"}
                    type="submit"
                    variant="ghost"
                  >
                    <Star className={cn("size-4", isFavorite && "fill-primary text-primary")} />
                  </Button>
                </Form>
                <Link
                  className="flex flex-1 items-center justify-between px-4 py-3 hover:bg-accent/50"
                  to={pantryPath(pantry.id, "shopping")}
                >
                  <span className="font-medium">{pantry.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {isFavorite ? "Favourite · Open" : "Open"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No pantries yet. Create one below.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create pantry</CardTitle>
          <CardDescription>Shared with anyone you invite.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="create" />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Our pantry" required />
            </div>
            <Button type="submit">Create pantry</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
