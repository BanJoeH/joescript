import { Link } from "react-router";

import { GettingStartedCard } from "~/components/dashboard/getting-started-card";
import { JournalPhotoThumbnails } from "~/components/journal/journal-photo-gallery";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { formatDate } from "~/lib/dates";
import { householdPath } from "~/lib/household-path";
import { formatJournalStatus, journalEntrySubjectLabel } from "~/lib/journal-labels";
import { jobsEmptyMessage } from "~/lib/onboarding";
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { householdId, stats, jobs, recentJournal, recentlyCompleted, photosByEntry } = loaderData;
  const jobsMessage = jobsEmptyMessage(stats, householdId);

  return (
    <div className="flex flex-col gap-6">
      <GettingStartedCard householdId={householdId} stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>This month&apos;s tasks</CardTitle>
          <CardDescription>
            Recurring tasks from your care rules. Mark them done in the journal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tasks due this month.
              {jobsMessage.tone === "empty" ? (
                <>
                  {" "}
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    to={jobsMessage.journalLink}
                  >
                    Write a journal entry
                  </Link>{" "}
                  or{" "}
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    to={jobsMessage.plantsLink}
                  >
                    add your plants
                  </Link>{" "}
                  to get started.
                </>
              ) : null}
              {jobsMessage.tone === "journaled" ? (
                <>
                  {" "}
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    to={jobsMessage.plantsLink}
                  >
                    Add your plants
                  </Link>{" "}
                  to track them in the journal.
                </>
              ) : null}
              {jobsMessage.tone === "has-plants" ? (
                <> Add care rules on a plant to see recurring tasks here each month.</>
              ) : null}
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
                        Mark done
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
                No journal entries yet.
                {stats.journalCount === 0 ? (
                  <>
                    {" "}
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      to={`${householdPath(householdId, "journal/new")}?starter=1`}
                    >
                      Write your first entry
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentJournal.map((entry: JournalSummary) => (
                  <li key={entry.id} className="space-y-2">
                    <span className="font-medium">{journalEntrySubjectLabel(entry.plantName)}</span>
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently completed</CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyCompleted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Completed tasks from your journal will appear here.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentlyCompleted.map((entry: CompletedSummary) => (
                  <li key={entry.id}>
                    <span className="font-medium">{journalEntrySubjectLabel(entry.plantName)}</span>
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
