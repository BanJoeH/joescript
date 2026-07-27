import { useFetcher, useLoaderData } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select } from "~/components/ui/select";
import { SHOPPING_SECTIONS } from "~/lib/ingredient-sections";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.sorted";

export { action, loader } from "./pantry.sorted.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Sorted · Pantri" }];
}

export default function SortedPage() {
  const { sections } = useLoaderData<typeof import("./pantry.sorted.server").loader>();
  const toggleFetcher = useFetcher();
  const categoryFetcher = useFetcher();

  function toggle(name: string, purchased: boolean) {
    toggleFetcher.submit(
      { intent: "toggle", name, purchased: String(purchased) },
      { method: "post" },
    );
  }

  function setCategory(name: string, section: string) {
    categoryFetcher.submit({ intent: "set-category", name, section }, { method: "post" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sorted by aisle</h2>
        <p className="text-sm text-muted-foreground">
          Every ingredient across your shopping list, combined and grouped for the store.
        </p>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nothing to shop for yet. Add recipes to your shopping list first.
          </CardContent>
        </Card>
      ) : (
        sections.map(({ section, items }) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {items.map((item) => (
                <div
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                  key={item.canonicalName}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3 text-sm">
                    <input
                      checked={item.purchased}
                      className="size-4 shrink-0 accent-primary"
                      onChange={(event) => toggle(item.name, event.target.checked)}
                      type="checkbox"
                    />
                    <span
                      className={cn(
                        "capitalize",
                        item.purchased && "text-muted-foreground line-through",
                      )}
                    >
                      {item.name}
                    </span>
                    {item.quantityLabel ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {item.quantityLabel}
                      </span>
                    ) : null}
                    {item.sources.length > 1 ? (
                      <span className="text-xs text-muted-foreground">×{item.sources.length}</span>
                    ) : null}
                  </label>
                  <Select
                    aria-label={`Move ${item.name} to a different aisle`}
                    className="h-8 w-32 shrink-0 text-xs"
                    defaultValue={section}
                    onChange={(event) => setCategory(item.name, event.target.value)}
                  >
                    {SHOPPING_SECTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
