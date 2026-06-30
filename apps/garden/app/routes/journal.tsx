import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatDate } from "~/lib/dates";
import { getGardenEnv } from "~/lib/context.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/journal";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Journal · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const entries = await garden.journal.list();

  return { householdId: params.householdId, entries };
}

export default function Journal({ loaderData }: Route.ComponentProps) {
  const { householdId, entries } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Journal</h2>
          <p className="text-sm text-muted-foreground">
            Everything you&apos;ve done, noticed, or skipped in the garden.
          </p>
        </div>
        <Button asChild>
          <Link to={householdPath(householdId, "journal/new")}>Add entry</Link>
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No journal entries yet.{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to={householdPath(householdId, "journal/new")}
            >
              Write the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      {entry.plantName ?? entry.areaName ?? "General"}
                      {entry.taskType ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {entry.taskType}
                        </span>
                      ) : null}
                    </CardTitle>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {entry.status}
                      </span>
                      <Button asChild size="sm" variant="ghost">
                        <Link to={householdPath(householdId, `journal/${entry.id}/edit`)}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{formatDate(entry.performedAt)}</p>
                  {entry.notes ? <p className="whitespace-pre-wrap">{entry.notes}</p> : null}
                  {entry.plantId ? (
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      to={householdPath(householdId, `plants/${entry.plantId}`)}
                    >
                      View plant
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
