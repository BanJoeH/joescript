import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { ExpandableText } from "~/components/expandable-text";
import { JournalPhotoThumbnails } from "~/components/journal/journal-photo-gallery";
import { Link } from "~/components/link";
import { PlantPhotoGallery } from "~/components/plants/plant-photo-gallery";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { parseCareRuleMonths, sortCareRulesBySoonest } from "~/lib/care-rules";
import { getGardenEnv } from "~/lib/context.server";
import { formatDate } from "~/lib/dates";
import { householdPath } from "~/lib/household-path";
import { formatJournalStatus } from "~/lib/journal-labels";
import { cn } from "~/lib/utils";
import { requireGardenService } from "~/services";
import { groupPlantPhotosByEntry } from "~/services/photos.service";

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

  const [careRules, journal, plantPhotos] = await Promise.all([
    garden.careRules.listForPlant(plant.id),
    garden.journal.listForPlant(plant.id),
    garden.photos.listForPlant(plant.id),
  ]);
  const photosByEntry = groupPlantPhotosByEntry(plantPhotos);

  return {
    householdId: params.householdId,
    plant,
    careRules,
    journal,
    plantPhotos,
    photosByEntry,
  };
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

const CARE_RULES_PREVIEW_COUNT = 2;

function CollapsibleNotes({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="rounded-xl border bg-card text-card-foreground shadow-sm"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary className="cursor-pointer list-none px-6 py-4 font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
          Notes
        </span>
      </summary>
      <div className="border-t px-6 py-4 text-sm whitespace-pre-wrap text-muted-foreground">
        {notes}
      </div>
    </details>
  );
}

type CareRuleRow = Route.ComponentProps["loaderData"]["careRules"][number];

function CareRuleListItem({
  householdId,
  plantId,
  rule,
}: {
  householdId: string;
  plantId: string;
  rule: CareRuleRow;
}) {
  const months = parseCareRuleMonths(rule.monthsJson)
    .map((month) => monthLabels[month - 1])
    .filter(Boolean);

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <span className="font-medium">{rule.taskType}</span>
        {!rule.active ? <span className="text-muted-foreground"> · inactive</span> : null}
        <p className="text-muted-foreground">{months.join(", ") || "No months set"}</p>
        {rule.instructions ? <ExpandableText text={rule.instructions} /> : null}
      </div>
      <div className="-ml-2 flex shrink-0 gap-1 sm:ml-0">
        <Button asChild size="sm" variant="ghost">
          <Link
            to={`${householdPath(householdId, "journal/new")}?plantId=${plantId}&careRuleId=${rule.id}&taskType=${encodeURIComponent(rule.taskType)}&status=done`}
          >
            Mark done
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to={householdPath(householdId, `plants/${plantId}/care-rules/${rule.id}/edit`)}>
            Edit
          </Link>
        </Button>
      </div>
    </li>
  );
}

function CareRulesList({
  careRules,
  householdId,
  plantId,
}: {
  careRules: CareRuleRow[];
  householdId: string;
  plantId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = sortCareRulesBySoonest(careRules);
  const hiddenCount = Math.max(0, sorted.length - CARE_RULES_PREVIEW_COUNT);
  const visible = expanded ? sorted : sorted.slice(0, CARE_RULES_PREVIEW_COUNT);

  return (
    <div>
      <ul className="divide-y text-sm">
        {visible.map((rule) => (
          <CareRuleListItem key={rule.id} householdId={householdId} plantId={plantId} rule={rule} />
        ))}
      </ul>
      {hiddenCount > 0 && !expanded ? (
        <button
          className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setExpanded(true)}
          type="button"
        >
          +{hiddenCount} more
        </button>
      ) : null}
      {expanded && hiddenCount > 0 ? (
        <button
          className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setExpanded(false)}
          type="button"
        >
          Show fewer
        </button>
      ) : null}
    </div>
  );
}

export default function PlantDetail({ loaderData }: Route.ComponentProps) {
  const { householdId, plant, careRules, journal, plantPhotos, photosByEntry } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild className="max-sm:flex-1" size="sm">
            <Link to={`${householdPath(householdId, "journal/new")}?plantId=${plant.id}`}>
              Add journal entry
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={householdPath(householdId, `plants/${plant.id}/edit`)}>Edit</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`${householdPath(householdId, "plants/new")}?fromPlantId=${plant.id}`}>
              Duplicate
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center gap-3 space-y-0">
          <CardTitle>Care rules</CardTitle>

          <Button asChild size="sm" variant="outline">
            <Link to={householdPath(householdId, `plants/${plant.id}/care-rules/new`)}>
              Add rule
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {careRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No care rules yet.{" "}
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to={householdPath(householdId, `plants/${plant.id}/care-rules/new`)}
              >
                Add a care rule
              </Link>{" "}
              to schedule recurring tasks like pruning or feeding.
            </p>
          ) : (
            <CareRulesList careRules={careRules} householdId={householdId} plantId={plant.id} />
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
            <p className="text-sm text-muted-foreground">
              No journal entries for this plant yet.{" "}
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to={`${householdPath(householdId, "journal/new")}?plantId=${plant.id}`}
              >
                Add an entry
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {journal.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{entry.taskType ?? "Note"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatJournalStatus(entry.status)}
                    </span>
                    <span className="block text-muted-foreground">
                      {formatDate(entry.performedAt)}
                    </span>
                    {entry.notes ? <ExpandableText text={entry.notes} /> : null}
                    <JournalPhotoThumbnails
                      householdId={householdId}
                      photos={photosByEntry[entry.id] ?? []}
                    />
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={householdPath(householdId, `journal/${entry.id}/edit`)}>Edit</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {plantPhotos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>From journal entries for this plant, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlantPhotoGallery
              householdId={householdId}
              limit={4}
              photos={plantPhotos}
              seeMoreTo={householdPath(householdId, `plants/${plant.id}/photos`)}
            />
          </CardContent>
        </Card>
      ) : null}

      {plant.notes ? <CollapsibleNotes notes={plant.notes} /> : null}

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
