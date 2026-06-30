import { Form, Link, useActionData, useLoaderData } from "react-router";
import { Star } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { householdPath } from "~/lib/household-path";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/households";

export { action, loader } from "./households.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Households · Garden" }];
}

export default function HouseholdsPage() {
  const { households, favoriteHouseholdId } = useLoaderData<typeof import("./households.server").loader>();
  const actionData = useActionData<typeof import("./households.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Households</h2>
        <p className="text-sm text-muted-foreground">
          Choose a garden to open, set a favourite for quick access, or create a new one.
        </p>
      </div>

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      {households.length > 0 ? (
        <ul className="space-y-2">
          {households.map((household) => {
            const isFavorite = favoriteHouseholdId === household.id;

            return (
              <li
                className="flex items-stretch overflow-hidden rounded-md border bg-card"
                key={household.id}
              >
                <Form className="flex shrink-0 border-r" method="post">
                  <input name="intent" type="hidden" value="toggle-favorite" />
                  <input name="householdId" type="hidden" value={household.id} />
                  <Button
                    aria-label={
                      isFavorite ? `Remove ${household.name} as favourite` : `Set ${household.name} as favourite`
                    }
                    className="h-full rounded-none px-3"
                    size="icon"
                    title={isFavorite ? "Remove favourite" : "Set as favourite"}
                    type="submit"
                    variant="ghost"
                  >
                    <Star
                      className={cn("size-4", isFavorite && "fill-primary text-primary")}
                    />
                  </Button>
                </Form>
                <Link
                  className="flex flex-1 items-center justify-between px-4 py-3 hover:bg-accent/50"
                  to={householdPath(household.id)}
                >
                  <span className="font-medium">{household.name}</span>
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
            You are not in any households yet. Create one below to get started.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create household</CardTitle>
          <CardDescription>For example, your home garden or an allotment plot.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="create" />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Our garden" required />
            </div>
            <Button type="submit">Create household</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
