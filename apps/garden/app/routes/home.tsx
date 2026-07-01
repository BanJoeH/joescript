import { Link } from "react-router";

import { JournalPhotoThumbnails } from "~/components/journal/journal-photo-gallery";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { formatDate } from "~/lib/dates";
import { householdPath } from "~/lib/household-path";
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
  const [jobs, recentJournal, recentlyCompleted] = await Promise.all([
    garden.dashboard.getCurrentJobs(),
    garden.dashboard.getRecentJournalEntries(),
    garden.dashboard.getRecentlyCompleted(),
  ]);
  const photosByEntry = Object.fromEntries(
    await garden.photos.listForEntries(recentJournal.map((entry) => entry.id)),
  );

  return { householdId: params.householdId, jobs, recentJournal, recentlyCompleted, photosByEntry };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { householdId, jobs, recentJournal, recentlyCompleted, photosByEntry } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>This month&apos;s jobs</CardTitle>
          <CardDescription>
            From active care rules this month. Jobs disappear once logged as done.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No jobs due this month.{" "}
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to={householdPath(householdId, "plants")}
              >
                Add plants and care rules
              </Link>{" "}
              to see tasks here.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {jobs.map((job: GardenJob) => (
                <li key={job.careRuleId} className="rounded-md border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        className="font-medium hover:underline"
                        to={householdPath(householdId, `plants/${job.plantId}`)}
                      >
                        {job.plantName}
                      </Link>
                      <span className="text-muted-foreground"> · {job.taskType}</span>
                      {job.instructions ? (
                        <p className="mt-1 text-muted-foreground">{job.instructions}</p>
                      ) : null}
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to={`${householdPath(householdId, "journal/new")}?plantId=${job.plantId}&careRuleId=${job.careRuleId}&taskType=${encodeURIComponent(job.taskType)}&status=done`}
                      >
                        Log
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent journal</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to={householdPath(householdId, "journal")}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentJournal.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No journal entries yet.{" "}
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  to={householdPath(householdId, "journal/new")}
                >
                  Add one
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentJournal.map((entry: JournalSummary) => (
                  <li key={entry.id} className="space-y-2">
                    <span className="font-medium">{entry.plantName ?? "General"}</span>
                    {entry.taskType ? (
                      <span className="text-muted-foreground"> · {entry.taskType}</span>
                    ) : null}
                    <span className="block text-muted-foreground">
                      {formatDate(entry.performedAt)} · {entry.status}
                    </span>
                    <JournalPhotoThumbnails
                      householdId={householdId}
                      limit={2}
                      photos={photosByEntry[entry.id] ?? []}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently completed</CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyCompleted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing marked done yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentlyCompleted.map((entry: CompletedSummary) => (
                  <li key={entry.id}>
                    <span className="font-medium">{entry.plantName ?? "General"}</span>
                    {entry.taskType ? (
                      <span className="text-muted-foreground"> · {entry.taskType}</span>
                    ) : null}
                    <span className="block text-muted-foreground">
                      {formatDate(entry.performedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
