import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useFetcher, useFetchers, useLoaderData } from "react-router";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select } from "~/components/ui/select";
import { getIngredientSection, SHOPPING_SECTIONS } from "~/lib/ingredient-sections";
import { pantryPath } from "~/lib/pantry-path";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import { applySortedOptimistic } from "~/lib/shopping-optimistic";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.sorted";

export { action, loader } from "./pantry.sorted.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Sorted · Pantri" }];
}

function SortedItemRow({ item, section }: { item: AggregatedIngredient; section: string }) {
  const toggleFetcher = useFetcher({ key: `sorted-toggle:${item.canonicalName}` });
  const categoryFetcher = useFetcher({ key: `sorted-category:${item.canonicalName}` });

  const purchased =
    toggleFetcher.formData?.get("intent") === "toggle"
      ? toggleFetcher.formData.get("purchased") === "true"
      : item.purchased;

  const pendingSection =
    categoryFetcher.formData?.get("intent") === "set-category"
      ? String(categoryFetcher.formData.get("section") ?? section)
      : section;

  // While moving aisle from a to-buy section, hide the source row (target section renders it).
  if (!purchased && pendingSection !== section) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <label className="flex flex-1 cursor-pointer items-center gap-3 text-sm">
        <input
          checked={purchased}
          className="size-4 shrink-0 accent-foreground"
          onChange={(event) => {
            toggleFetcher.submit(
              {
                intent: "toggle",
                name: item.name,
                purchased: String(event.target.checked),
              },
              { method: "post" },
            );
          }}
          type="checkbox"
        />
        <span className={cn("capitalize", purchased && "text-muted-foreground line-through")}>
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
        onChange={(event) => {
          categoryFetcher.submit(
            {
              intent: "set-category",
              name: item.name,
              section: event.target.value,
            },
            { method: "post" },
          );
        }}
      >
        {SHOPPING_SECTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default function SortedPage() {
  const { sections, pantryId } = useLoaderData<typeof import("./pantry.sorted.server").loader>();
  const fetchers = useFetchers();
  const clearFetcher = useFetcher({ key: "sorted-clear-all-purchased" });
  const optimisticSections = useMemo(
    () => applySortedOptimistic(sections, fetchers),
    [sections, fetchers],
  );

  const { toBuySections, gotIt } = useMemo(() => {
    const purchased: Array<AggregatedIngredient & { section: string }> = [];
    const toBuy = optimisticSections
      .map((section) => {
        const items = section.items.filter((item) => {
          if (item.purchased) {
            purchased.push({ ...item, section: section.section });
            return false;
          }
          return true;
        });
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);

    purchased.sort((a, b) => a.name.localeCompare(b.name));
    return { toBuySections: toBuy, gotIt: purchased };
  }, [optimisticSections]);

  const isEmpty = toBuySections.length === 0 && gotIt.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to={pantryPath(pantryId, "shopping")}>
              <ArrowLeft className="size-4" />
              Back to list
            </Link>
          </Button>
        }
        description="Every ingredient across your shopping list, combined and grouped for the store."
        title="Sorted by aisle"
      />

      {isEmpty ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nothing to shop for yet. Add recipes to your shopping list first.
          </CardContent>
        </Card>
      ) : (
        <>
          {toBuySections.length > 0 ? (
            toBuySections.map(({ section, items }) => (
              <Card key={section}>
                <CardHeader>
                  <CardTitle className="text-base uppercase tracking-[0.06em]">{section}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {items.map((item) => (
                    <SortedItemRow item={item} key={item.canonicalName} section={section} />
                  ))}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                All done — nothing left to buy.
              </CardContent>
            </Card>
          )}

          {gotIt.length > 0 ? (
            <Card>
              <CardContent className="pt-4">
                <ShoppingGotItSection
                  count={gotIt.length}
                  onResetAll={() => {
                    clearFetcher.submit({ intent: "clear-all-purchased" }, { method: "post" });
                  }}
                >
                  {gotIt.map((item) => (
                    <SortedItemRow
                      item={item}
                      key={`got-${item.canonicalName}`}
                      section={item.section || getIngredientSection(item.name)}
                    />
                  ))}
                </ShoppingGotItSection>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
