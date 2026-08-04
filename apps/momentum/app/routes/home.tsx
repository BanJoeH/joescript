import { ArrowRight, ChevronRight, Dumbbell, Leaf, Star } from "lucide-react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { EnergyChangeBadge } from "~/components/energy-change";
import { LandscapeHero } from "~/components/landscape-hero";
import { ProfileAvatar } from "~/components/profile-avatar";
import { ENERGY_LABELS } from "~/components/rating-picker";
import { Button } from "~/components/ui/button";
import { formatRelativeDate, getZonedParts } from "~/lib/dates";
import { getPreferredDisplayName } from "~/lib/display-name";
import { getString } from "~/lib/forms.server";
import { cn } from "~/lib/utils";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const { service, session, timeZone } = await requireMomentumService(request);
  // Seed catalogs, then fetch sequentially — libsql web client is not safe for
  // concurrent queries on one connection (Workers + Turso).
  await service.exercises.list();
  await service.measurements.listTypes();

  const latestWorkout = await service.workouts.latestCompleted();
  const inProgress = await service.workouts.getInProgress();
  const insights = await service.insights();

  return {
    firstName: getPreferredDisplayName(session.user),
    userImage: session.user.image ?? null,
    userName: session.user.name ?? null,
    latestWorkout,
    insight: insights[0] ?? null,
    hasPreviousWorkout: Boolean(latestWorkout),
    hasInProgress: Boolean(inProgress),
    inProgressId: inProgress?.id ?? null,
    timeZone,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { service } = await requireMomentumService(request);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "discard") {
    await service.workouts.discardInProgress(getString(formData, "workoutId") || undefined);
  }

  throw redirect("/");
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Home · Momentum" }];
}

function greeting(timeZone: string) {
  const hour = getZonedParts(new Date(), timeZone).hour;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  const {
    firstName,
    userImage,
    userName,
    latestWorkout,
    insight,
    hasPreviousWorkout,
    hasInProgress,
    inProgressId,
    timeZone,
  } = loaderData;
  const navigation = useNavigation();
  const discarding =
    navigation.state !== "idle" && navigation.formData?.get("intent") === "discard";

  const setCount = latestWorkout?.exercises.reduce((sum, e) => sum + e.sets.length, 0) ?? 0;
  const duration = latestWorkout ? formatDuration(latestWorkout.durationSeconds) : null;

  const workoutMeta = latestWorkout
    ? [
        duration,
        setCount > 0 ? `${setCount} sets` : null,
        latestWorkout.exercises.length > 0 ? `${latestWorkout.exercises.length} exercises` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="space-y-7">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-primary">
              {greeting(timeZone)}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">How are you feeling today?</p>
          </div>
          <ProfileAvatar image={userImage} name={userName} />
        </div>
        <div className="flex flex-wrap gap-2">
          {ENERGY_LABELS.map((label, index) => {
            const score = index + 1;
            const to = hasInProgress
              ? `/workouts/log?energyBefore=${score}`
              : `/workouts/log?start=1&energyBefore=${score}`;
            return (
              <Link
                className="rounded-2xl border border-border bg-card px-3 py-2 text-center shadow-soft transition hover:border-primary/40 hover:bg-primary-soft/50"
                key={score}
                to={to}
              >
                <span className="block text-sm font-semibold text-primary">{score}</span>
                <span className="block text-[10px] leading-tight text-muted-foreground">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </header>

      <LandscapeHero className="h-72 w-full sm:h-56">
        <Button
          asChild
          className="btn-primary-gradient relative h-12 w-90 rounded-2xl px-7 text-base font-semibold shadow-soft"
        >
          <Link to={hasInProgress ? "/workouts/log" : "/workouts/log?start=1"}>
            {hasInProgress ? "Continue Workout" : "Start Workout"}
            <span className="absolute right-3 flex size-7 items-center justify-center rounded-full bg-[#104F33] dark:bg-[#4f6e32]">
              <ArrowRight size={15} strokeWidth={2.25} />
            </span>
          </Link>
        </Button>
        {hasInProgress ? (
          <Form
            method="post"
            onSubmit={(event) => {
              if (!window.confirm("Discard this in-progress workout?")) {
                event.preventDefault();
              }
            }}
          >
            <input name="intent" type="hidden" value="discard" />
            {inProgressId ? <input name="workoutId" type="hidden" value={inProgressId} /> : null}
            <button
              className="btn-secondary-gradient text-sm font-medium text-primary/90 underline-offset-4 hover:underline disabled:opacity-60"
              disabled={discarding}
              type="submit"
            >
              {discarding ? "Discarding…" : "or discard draft"}
            </button>
          </Form>
        ) : hasPreviousWorkout ? (
          <Form action="/workouts/log" method="get">
            <input name="repeat" type="hidden" value="1" />
            <button
              className="btn-secondary-gradient text-sm font-medium text-primary/90 underline-offset-4 hover:underline"
              type="submit"
            >
              or repeat last workout
            </button>
          </Form>
        ) : null}
      </LandscapeHero>

      {latestWorkout ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Last Workout</h2>
            <p className="text-sm text-muted-foreground">
              {latestWorkout.completedAt
                ? formatRelativeDate(latestWorkout.completedAt, timeZone)
                : "Recently"}
            </p>
          </div>

          <Link
            className="block rounded-[20px] border border-border bg-card p-4 shadow-soft transition hover:border-primary/35"
            to={`/workouts/${latestWorkout.id}`}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Dumbbell size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold tracking-tight">{latestWorkout.title ?? "Workout"}</h3>
                {workoutMeta ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{workoutMeta}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Energy</span>
                <span className="font-medium">
                  {latestWorkout.energyBefore ?? "?"} → {latestWorkout.energyAfter ?? "?"}
                </span>
                <EnergyChangeBadge
                  after={latestWorkout.energyAfter}
                  before={latestWorkout.energyBefore}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Worth it?</span>
                <WorthItStars value={latestWorkout.worthIt} />
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <div className="rounded-[20px] border border-dashed border-border px-5 py-6 text-sm text-muted-foreground">
          No workouts yet. Start one when you are ready. No streaks to break.
        </div>
      )}

      {insight ? (
        <Link
          className="flex items-center gap-3 rounded-[20px] border border-primary/15 bg-gradient-to-br from-[#eef4e9] to-[#faf5e8] p-4 shadow-soft transition hover:border-primary/35 dark:border-primary/20 dark:from-[#1c2a1f] dark:to-[#1a2420]"
          to="/insights"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Leaf size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug tracking-tight">{insight.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{insight.evidence}</p>
          </div>
          <ChevronRight className="shrink-0 text-muted-foreground" size={18} strokeWidth={1.75} />
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">
          Insights will appear quietly as you build a little history.
        </p>
      )}
    </div>
  );
}

function WorthItStars({ value }: { value: number | null }) {
  const filled = value ?? 0;
  return (
    <span aria-label={`${filled} out of 5`} className="inline-flex items-center gap-0.5" role="img">
      {(["s1", "s2", "s3", "s4", "s5"] as const).map((key, index) => {
        const active = index < filled;
        return (
          <Star
            className={cn(active ? "fill-primary text-primary" : "text-border")}
            key={key}
            size={14}
            strokeWidth={1.75}
          />
        );
      })}
    </span>
  );
}
