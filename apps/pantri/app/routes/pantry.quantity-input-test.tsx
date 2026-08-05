import { useState } from "react";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { QuantityInput } from "~/components/recipes/quantity-input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { pantryPath } from "~/lib/pantry-path";
import { commitQuantityString, parseQuantityString } from "~/lib/quantity-input";

import type { Route } from "./+types/pantry.quantity-input-test";

export { loader } from "./pantry.quantity-input-test.server";

const EXAMPLES = [
  { label: "300g", amount: 300, unit: "g" },
  { label: "3 cloves", amount: 3, unit: "clove" },
  { label: "1 cup", amount: 1, unit: "cup" },
  { label: "1/2 tsp", amount: 0.5, unit: "tsp" },
  { label: "1 1/2 tbsp", amount: 1.5, unit: "tbsp" },
  { label: "8 oz", amount: 8, unit: "oz" },
  { label: "3 (unitless)", amount: 3, unit: null },
] as const;

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Quantity input · Pantri" }];
}

export default function QuantityInputTestPage({ loaderData }: Route.ComponentProps) {
  const { pantryId } = loaderData;
  const [amount, setAmount] = useState<number | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const parsedDraft = draft ? parseQuantityString(draft) : null;
  const committedDraft = draft ? commitQuantityString(draft) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <Link
        className="text-sm text-muted-foreground hover:text-foreground"
        to={pantryPath(pantryId, "settings")}
      >
        ← Settings
      </Link>
      <PageHeader title="Quantity input playground" />

      <Card>
        <CardHeader>
          <CardTitle>Try it</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuantityInput
            amount={amount}
            className="max-w-xs"
            onChange={({ amount: nextAmount, unit: nextUnit }) => {
              setAmount(nextAmount);
              setUnit(nextUnit);
            }}
            placeholder="e.g. 300g, 1 cup, 1 cl"
            unit={unit}
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Button
                key={example.label}
                onClick={() => {
                  setAmount(example.amount);
                  setUnit(example.unit);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {example.label}
              </Button>
            ))}
            <Button
              onClick={() => {
                setAmount(null);
                setUnit(null);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Structured value</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
            {JSON.stringify({ amount, unit }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parser sandbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type to inspect parseQuantityString / commitQuantityString"
            value={draft}
          />
          <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
            {JSON.stringify(
              {
                parseQuantityString: parsedDraft,
                commitQuantityString: committedDraft,
              },
              null,
              2,
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Tap the suggestion chip, swipe the field right, or press Tab to accept (try `1 cl`).
          </p>
          <p>Ambiguous prefixes like `1 c` open a picker for cup / clove / can.</p>
          <p>
            Blur commits the value and normalises display (`300 g` → `300g`, `3 cloves` stays
            spaced).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
