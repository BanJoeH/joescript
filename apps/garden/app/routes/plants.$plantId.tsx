import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { JournalPhotoThumbnails } from "~/components/journal/journal-photo-gallery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { parseCareRuleMonths } from "~/lib/care-rules";
import { getGardenEnv } from "~/lib/context.server";
import { formatDate } from "~/lib/dates";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.$plantId";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plant · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const plant = await garden.plants.get(params.plantId);

  if (!plant) {
    throw new Response("Plant not found", { status: 404 });
  }

  const [careRules, journal] = await Promise.all([
    garden.careRules.listForPlant(plant.id),
    garden.journal.listForPlant(plant.id),
  ]);
  const photosByEntry = Object.fromEntries(
    await garden.photos.listForEntries(journal.map((entry) => entry.id)),
  );

  return { householdId: params.householdId, plant, careRules, journal, photosByEntry };
}

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function PlantDetail({ loaderData }: Route.ComponentProps) {
  const { householdId, plant, careRules, journal, photosByEntry } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:underline" to={householdPath(householdId, "plants")}>
              Plants
            </Link>{" "}
            / {plant.areaName}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{plant.name}</h2>
          {plant.latinName ? (
            <p className="italic text-muted-foreground">
              {plant.latinName}
              {plant.cultivar ? ` '${plant.cultivar}'` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={householdPath(householdId, `plants/${plant.id}/edit`)}>Edit</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`${householdPath(householdId, "journal/new")}?plantId=${plant.id}`}>
              Add journal entry
            </Link>
          </Button>
        </div>
      </div>

      {plant.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{plant.notes}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Care rules</CardTitle>
            <CardDescription>Reminders are calculated from these rules each month.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={householdPath(householdId, `plants/${plant.id}/care-rules/new`)}>
              Add rule
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {careRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No care rules yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {careRules.map((rule) => {
                const months = parseCareRuleMonths(rule.monthsJson)
                  .map((month) => monthLabels[month - 1])
                  .filter(Boolean);

                return (
                  <li key={rule.id} className="rounded-md border px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-medium">{rule.taskType}</span>
                        {!rule.active ? (
                          <span className="text-muted-foreground"> · inactive</span>
                        ) : null}
                        <p className="text-muted-foreground">
                          {months.join(", ") || "No months set"}
                        </p>
                        {rule.instructions ? (
                          <p className="mt-1 text-muted-foreground">{rule.instructions}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to={`${householdPath(householdId, "journal/new")}?plantId=${plant.id}&careRuleId=${rule.id}&taskType=${encodeURIComponent(rule.taskType)}&status=done`}
                          >
                            Log
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to={householdPath(
                              householdId,
                              `plants/${plant.id}/care-rules/${rule.id}/edit`,
                            )}
                          >
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal</CardTitle>
          <CardDescription>Recent entries for this plant.</CardDescription>
        </CardHeader>
        <CardContent>
          {journal.length === 0 ? (
            <p className="text-sm text-muted-foreground">No journal entries for this plant yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {journal.map((entry) => (
                <li key={entry.id} className="rounded-md border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-medium">{entry.taskType ?? "Note"}</span>
                      <span className="text-muted-foreground"> · {entry.status}</span>
                      <span className="block text-muted-foreground">
                        {formatDate(entry.performedAt)}
                      </span>
                      {entry.notes ? (
                        <p className="mt-1 text-muted-foreground">{entry.notes}</p>
                      ) : null}
                      <JournalPhotoThumbnails
                        householdId={householdId}
                        photos={photosByEntry[entry.id] ?? []}
                      />
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={householdPath(householdId, `journal/${entry.id}/edit`)}>Edit</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {plant.plantedAt ? (
          <div>
            <dt className="text-muted-foreground">Planted</dt>
            <dd>{formatDate(plant.plantedAt)}</dd>
          </div>
        ) : null}
        {plant.removedAt ? (
          <div>
            <dt className="text-muted-foreground">Removed</dt>
            <dd>{formatDate(plant.removedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
