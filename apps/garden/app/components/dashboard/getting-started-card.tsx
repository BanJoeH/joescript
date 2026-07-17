import { Check, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Link } from "~/components/link";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  dismissGettingStarted,
  isGettingStartedDismissed,
  subscribeGettingStartedDismiss,
} from "~/lib/getting-started";
import { householdPath } from "~/lib/household-path";
import { isGettingStartedComplete } from "~/lib/onboarding";
import { cn } from "~/lib/utils";
import type { GardenStats } from "~/services/dashboard.service";

type GettingStartedCardProps = {
  householdId: string;
  stats: GardenStats;
};

type Step = {
  complete: boolean;
  description: string;
  href: string;
  label: string;
};

export function GettingStartedCard({ householdId, stats }: GettingStartedCardProps) {
  const dismissed = useSyncExternalStore(
    subscribeGettingStartedDismiss,
    () => isGettingStartedDismissed(householdId),
    () => false,
  );

  const steps: Step[] = [
    {
      complete: stats.areaCount > 0,
      description: "Name the places where you grow things.",
      href: householdPath(householdId, "areas/new"),
      label: "Add your areas",
    },
    {
      complete: stats.plantCount > 0,
      description: "Register the plants in each area.",
      href: householdPath(householdId, "plants/new"),
      label: "Add your plants",
    },
    {
      complete: stats.journalCount > 0,
      description: "Record a note or photo from the garden.",
      href: `${householdPath(householdId, "journal/new")}?starter=1`,
      label: "Write your first journal entry",
    },
  ];

  if (dismissed || isGettingStartedComplete(stats)) {
    return null;
  }

  function handleDismiss() {
    dismissGettingStarted(householdId);
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>Set up your garden, then record what happens in it.</CardDescription>
        </div>
        <Button
          aria-label="Dismiss getting started"
          className="shrink-0"
          onClick={handleDismiss}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.areaCount > 0 || stats.plantCount > 0 || stats.journalCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {stats.areaCount} {stats.areaCount === 1 ? "area" : "areas"} · {stats.plantCount}{" "}
            {stats.plantCount === 1 ? "plant" : "plants"} · {stats.journalCount}{" "}
            {stats.journalCount === 1 ? "entry" : "entries"}
          </p>
        ) : null}
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li className="flex items-start gap-3 text-sm" key={step.label}>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  step.complete
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {step.complete ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                {step.complete ? (
                  <span className="font-medium text-muted-foreground line-through">
                    {step.label}
                  </span>
                ) : (
                  <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    to={step.href}
                  >
                    {step.label}
                  </Link>
                )}
                {!step.complete ? (
                  <p className="text-muted-foreground">{step.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
