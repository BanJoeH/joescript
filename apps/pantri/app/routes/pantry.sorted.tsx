import { ArrowLeft, ChevronDown, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useFetchers } from "react-router";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getIngredientSection, SHOPPING_SECTIONS } from "~/lib/ingredient-sections";
import { pantryPath } from "~/lib/pantry-path";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import { getSortedQuantityBadge } from "~/lib/shopping-aggregation";
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const purchased =
    toggleFetcher.formData?.get("intent") === "toggle"
      ? toggleFetcher.formData.get("purchased") === "true"
      : item.purchased;

  const pendingSection =
    categoryFetcher.formData?.get("intent") === "set-category"
      ? String(categoryFetcher.formData.get("section") ?? section)
      : section;

  const quantityBadge = getSortedQuantityBadge(item);
  const expandable = item.instanceCount > 1;
  const panelId = `sorted-item-${item.canonicalName}-sources`;

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // While moving aisle from a to-buy section, hide the source row (target section renders it).
  if (!purchased && pendingSection !== section) {
    return null;
  }

  function moveToSection(nextSection: string) {
    setMenuOpen(false);
    if (nextSection === section) return;
    categoryFetcher.submit(
      {
        intent: "set-category",
        name: item.name,
        section: nextSection,
      },
      { method: "post" },
    );
  }

  return (
    <div
      className={cn(
        "rounded-md px-1 py-0 hover:bg-accent/50",
        showSources && expandable && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-1.5">
        <input
          aria-label={`Mark ${item.name} as ${purchased ? "to buy" : "got it"}`}
          checked={purchased}
          className="mt-1 size-4 shrink-0 accent-foreground"
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
        <span
          className={cn(
            "min-w-0 flex-1 py-0.5 text-sm capitalize leading-snug",
            purchased && "text-muted-foreground line-through",
          )}
        >
          {item.name}
        </span>
        {expandable ? (
          <button
            aria-controls={panelId}
            aria-expanded={showSources}
            aria-label={`${showSources ? "Hide" : "Show"} recipes for ${item.name}`}
            className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            onClick={() => setShowSources((open) => !open)}
            type="button"
          >
            {quantityBadge}
            <ChevronDown
              aria-hidden
              className={cn("size-3 shrink-0 transition-transform", !showSources && "-rotate-90")}
            />
          </button>
        ) : quantityBadge ? (
          <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {quantityBadge}
          </span>
        ) : null}
        <div className="relative shrink-0" ref={menuRef}>
          <Button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`Move ${item.name}`}
            className="size-7"
            onClick={() => setMenuOpen((open) => !open)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal className="size-4" />
          </Button>
          {menuOpen ? (
            <div
              className="absolute top-full right-0 z-20 mt-1 min-w-40 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg"
              role="menu"
            >
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Move to
              </p>
              {SHOPPING_SECTIONS.map((option) => (
                <button
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm hover:bg-accent",
                    option === section && "font-medium",
                  )}
                  key={option}
                  onClick={() => moveToSection(option)}
                  role="menuitem"
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {showSources ? (
        <ul className="mt-1.5 ml-7 space-y-1 text-xs text-muted-foreground" id={panelId}>
          {item.instances.map((instance) => (
            <li
              className={cn(
                "flex items-baseline justify-between gap-3",
                instance.purchased && "opacity-70",
              )}
              key={instance.key}
            >
              <span className={cn("min-w-0 capitalize", instance.purchased && "line-through")}>
                {instance.source}
              </span>
              <span className={cn("shrink-0 tabular-nums", instance.purchased && "line-through")}>
                {instance.quantityText}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function SortedPage({ loaderData }: Route.ComponentProps) {
  const { sections, pantryId } = loaderData;
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
              Back
            </Link>
          </Button>
        }
        description="By aisle"
        title="Sorted by aisle"
      />

      {isEmpty ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nothing to shop for.
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
                <CardContent className="space-y-0">
                  {items.map((item) => (
                    <SortedItemRow item={item} key={item.canonicalName} section={section} />
                  ))}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">All done.</CardContent>
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
