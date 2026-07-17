import { useState } from "react";

import { GettingStartedCard } from "~/components/dashboard/getting-started-card";
import { ExpandableText } from "~/components/expandable-text";
import { JournalPhotoThumbnails } from "~/components/journal/journal-photo-gallery";
import { Link } from "~/components/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { formatDate } from "~/lib/dates";
import { householdPath } from "~/lib/household-path";
import { formatJournalStatus, journalEntrySubjectLabel } from "~/lib/journal-labels";
import { requireGardenService } from "~/services";
import type { CompletedSummary, GardenJob, JournalSummary } from "~/services/dashboard.service";

import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Dashboard · Garden" },
    { name: "description", content: "A living journal of your garden." },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [stats, jobs, recentJournal, recentlyCompleted] = await Promise.all([
    garden.dashboard.getGardenStats(),
    garden.dashboard.getCurrentJobs(),
    garden.dashboard.getRecentJournalEntries(),
    garden.dashboard.getRecentlyCompleted(),
  ]);
  const photosByEntry = Object.fromEntries(
    await garden.photos.listForEntries(recentJournal.map((entry) => entry.id)),
  );

  return {
    householdId: params.householdId,
    stats,
    jobs,
    recentJournal,
    recentlyCompleted,
    photosByEntry,
  };
}

const TASKS_PREVIEW_COUNT = 3;

function MonthTasksList({ householdId, jobs }: { householdId: string; jobs: GardenJob[] }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, jobs.length - TASKS_PREVIEW_COUNT);
  const visible = expanded ? jobs : jobs.slice(0, TASKS_PREVIEW_COUNT);

  return (
    <div>
      <ul className="divide-y text-sm">
        {visible.map((job) => (
          <li
            key={job.careRuleId}
            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <Link
                className="font-medium hover:underline"
                to={householdPath(householdId, `plants/${job.plantId}`)}
              >
                {job.plantName}
              </Link>
              <span className="text-muted-foreground"> · {job.taskType}</span>
              {job.instructions ? <ExpandableText text={job.instructions} /> : null}
            </div>
            <Button asChild size="sm" variant="outline">
              <Link
                to={`${householdPath(householdId, "journal/new")}?plantId=${job.plantId}&careRuleId=${job.careRuleId}&taskType=${encodeURIComponent(job.taskType)}&status=done`}
              >
                Mark done
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show fewer" : `+${hiddenCount} more`}
        </button>
      ) : null}
    </div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { householdId, stats, jobs, recentJournal, recentlyCompleted, photosByEntry } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          What&apos;s due this month, and what you&apos;ve been doing in the garden.
        </p>
      </div>

      <GettingStartedCard householdId={householdId} stats={stats} />

      {stats.plantCount > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>This month&apos;s tasks</CardTitle>
            <CardDescription>Recurring care due now.</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks due this month.{" "}
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  to={householdPath(householdId, "plants")}
                >
                  Choose a plant
                </Link>{" "}
                to add care rules for recurring work.
              </p>
            ) : (
              <MonthTasksList householdId={householdId} jobs={jobs} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {stats.journalCount > 0 ? (
        <div className={recentlyCompleted.length > 0 ? "grid gap-6 sm:grid-cols-2" : "grid gap-6"}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Recent journal</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link to={householdPath(householdId, "journal")}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentJournal.length > 0 ? (
                <ul className="divide-y text-sm">
                  {recentJournal.map((entry: JournalSummary) => (
                    <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                      <span className="font-medium">
                        {journalEntrySubjectLabel(entry.plantName)}
                      </span>
                      {entry.taskType ? (
                        <span className="text-muted-foreground"> · {entry.taskType}</span>
                      ) : null}
                      <span className="block text-muted-foreground">
                        {formatDate(entry.performedAt)} · {formatJournalStatus(entry.status)}
                      </span>
                      <JournalPhotoThumbnails
                        householdId={householdId}
                        limit={2}
                        photos={photosByEntry[entry.id] ?? []}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          {recentlyCompleted.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recently completed</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {recentlyCompleted.map((entry: CompletedSummary) => (
                    <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                      <span className="font-medium">
                        {journalEntrySubjectLabel(entry.plantName)}
                      </span>
                      {entry.taskType ? (
                        <span className="text-muted-foreground"> · {entry.taskType}</span>
                      ) : null}
                      <span className="block text-muted-foreground">
                        {formatDate(entry.performedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
