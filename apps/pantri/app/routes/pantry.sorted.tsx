import { ArrowLeft, ChevronDown, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  celebrateSortedComplete,
  shouldCelebrateSortedComplete,
} from "~/lib/celebrate-sorted-complete";
import {
  getIngredientSection,
  SHOPPING_SECTIONS,
  type ShoppingSection,
} from "~/lib/ingredient-sections";
import { pantryPath } from "~/lib/pantry-path";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import { getSortedQuantityBadge } from "~/lib/shopping-aggregation";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.sorted";

export { action, loader } from "./pantry.sorted.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Sorted · Pantri" }];
}

type SortedSection = Route.ComponentProps["loaderData"]["sections"][number];

function SortedItemRow({
  item,
  section,
  onPurchased,
  onMoveSection,
}: {
  item: AggregatedIngredient;
  section: ShoppingSection | string;
  onPurchased: (canonicalName: string, purchased: boolean) => void;
  onMoveSection: (canonicalName: string, name: string, nextSection: ShoppingSection) => void;
}) {
  const toggleFetcher = useFetcher({ key: `sorted-toggle:${item.canonicalName}` });
  const categoryFetcher = useFetcher({ key: `sorted-category:${item.canonicalName}` });
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const quantityBadge = getSortedQuantityBadge(item);
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

  function moveToSection(nextSection: ShoppingSection) {
    setMenuOpen(false);
    if (nextSection === section) return;
    onMoveSection(item.canonicalName, item.name, nextSection);
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
        "border-b border-border/40 px-1 py-1 last:border-b-0 hover:bg-accent/50",
        showSources && "bg-muted/40",
      )}
    >
      <div className="flex items-center gap-1.5">
        <input
          aria-label={`Mark ${item.name} as ${item.purchased ? "to buy" : "got it"}`}
          checked={item.purchased}
          className="size-4 shrink-0 accent-foreground cursor-pointer"
          id={`sorted-item-${item.canonicalName}-checkbox`}
          onChange={(event) => {
            const next = event.target.checked;
            onPurchased(item.canonicalName, next);
            toggleFetcher.submit(
              {
                intent: "toggle",
                name: item.name,
                purchased: String(next),
              },
              { method: "post" },
            );
          }}
          type="checkbox"
        />
        <label
          htmlFor={`sorted-item-${item.canonicalName}-checkbox`}
          className={cn(
            "min-w-0 flex-1 py-0.5 text-sm capitalize leading-snug cursor-pointer",
            item.purchased && "text-muted-foreground line-through",
          )}
        >
          {item.name}
        </label>
        <button
          aria-controls={panelId}
          aria-expanded={showSources}
          aria-label={`${showSources ? "Hide" : "Show"} sources for ${item.name}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer",
          )}
          onClick={() => setShowSources((open) => !open)}
          type="button"
        >
          {quantityBadge ? <span>{quantityBadge}</span> : null}
          <ChevronDown
            aria-hidden
            className={cn("size-3 shrink-0 transition-transform", !showSources && "-rotate-90")}
          />
        </button>
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
        <ul className="mt-1.5 ml-4 mr-12 space-y-1 text-xs text-muted-foreground" id={panelId}>
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
  const clearFetcher = useFetcher({ key: "sorted-clear-all-purchased" });
  const [localSections, setLocalSections] = useState(sections);

  useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  const { toBuySections, gotIt } = useMemo(() => {
    const purchased: Array<AggregatedIngredient & { section: string }> = [];
    const toBuy = localSections
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
  }, [localSections]);

  const remainingCount = useMemo(
    () => toBuySections.reduce((count, section) => count + section.items.length, 0),
    [toBuySections],
  );

  const prevRemainingRef = useRef<number | null>(null);
  const celebrationReadyRef = useRef(false);

  useEffect(() => {
    if (
      shouldCelebrateSortedComplete(
        prevRemainingRef.current,
        remainingCount,
        celebrationReadyRef.current,
      )
    ) {
      void celebrateSortedComplete();
    }
    prevRemainingRef.current = remainingCount;
    celebrationReadyRef.current = true;
  }, [remainingCount]);

  function setItemPurchased(canonicalName: string, purchased: boolean) {
    setLocalSections((current) =>
      current.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.canonicalName === canonicalName ? { ...item, purchased } : item,
        ),
      })),
    );
  }

  function moveItem(canonicalName: string, name: string, nextSection: ShoppingSection) {
    setLocalSections((current) => {
      let moved: AggregatedIngredient | null = null;
      const without = current.map((section) => {
        const remaining = section.items.filter((item) => {
          const match = item.canonicalName === canonicalName || item.name === name;
          if (match) moved = item;
          return !match;
        });
        return { ...section, items: remaining };
      });

      if (!moved) return current;

      const existing = without.find((section) => section.section === nextSection);
      let next: SortedSection[];
      if (existing) {
        next = without.map((section) =>
          section.section === nextSection
            ? { ...section, items: [...section.items, moved as AggregatedIngredient] }
            : section,
        );
      } else {
        next = [...without, { section: nextSection, items: [moved] }];
      }
      return next.filter((section) => section.items.length > 0);
    });
  }

  function clearAllPurchased() {
    setLocalSections((current) =>
      current.map((section) => ({
        ...section,
        items: section.items.map((item) => (item.purchased ? { ...item, purchased: false } : item)),
      })),
    );
  }

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
                    <SortedItemRow
                      item={item}
                      key={item.canonicalName}
                      onMoveSection={moveItem}
                      onPurchased={setItemPurchased}
                      section={section}
                    />
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
                    clearAllPurchased();
                    clearFetcher.submit({ intent: "clear-all-purchased" }, { method: "post" });
                  }}
                >
                  {gotIt.map((item) => (
                    <SortedItemRow
                      item={item}
                      key={item.canonicalName}
                      onMoveSection={moveItem}
                      onPurchased={setItemPurchased}
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
