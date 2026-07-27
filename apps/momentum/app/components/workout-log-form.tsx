import { ChevronDown, ChevronRight, Plus, Trash2, XIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Form, Link, useFetcher, useNavigation } from "react-router";

import { RatingPicker } from "~/components/rating-picker";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { formatDateInput, formatTimeInput } from "~/lib/dates";
import { formatExerciseSetsSummary, formatSetDetails } from "~/lib/exercise-format";
import {
  type ExerciseMetric,
  metricInputMode,
  metricLabel,
  metricsForExerciseKey,
} from "~/lib/exercise-metrics";
import { cn } from "~/lib/utils";

type CatalogExercise = { id: string; key: string; name: string };

export type RecentExerciseChip = {
  exerciseId: string;
  key: string;
  name: string;
  lastSet: {
    reps?: number | null;
    weightKg?: number | null;
    durationSeconds?: number | null;
    distanceM?: number | null;
  };
};

type DraftSet = {
  id: string;
  reps?: string;
  weightKg?: string;
  durationSeconds?: string;
  distanceM?: string;
  roundNumber?: number | null;
};

type DraftExercise = {
  id: string;
  exerciseId: string;
  key: string;
  name: string;
  sets: DraftSet[];
};

export type WorkoutFormDraft = {
  title?: string;
  energyBefore?: number | null;
  energyAfter?: number | null;
  worthIt?: number | null;
  notes?: string | null;
  durationSeconds?: number | null;
  completedAt?: Date | string | null;
  exercises?: Array<{
    exerciseId: string;
    name: string;
    key?: string;
    sets: Array<{
      reps?: number | null;
      weightKg?: number | null;
      durationSeconds?: number | null;
      distanceM?: number | null;
      roundNumber?: number | null;
    }>;
  }>;
};

type WorkoutLogFormProps = {
  autosave?: boolean;
  backLink: string;
  discardLabel?: string;
  exercises: CatalogExercise[];
  draft?: WorkoutFormDraft | null;
  error?: string | null;
  heading: string;
  /** Prefill energy before when the draft does not already have one. */
  seedEnergyBefore?: number | null;
  recentExercises?: RecentExerciseChip[];
  submitLabel: string;
  timeZone: string;
  workoutId?: string;
};

function draftMoment(draft: WorkoutFormDraft | null | undefined, timeZone: string) {
  if (draft?.completedAt) {
    const date =
      typeof draft.completedAt === "string" ? new Date(draft.completedAt) : draft.completedAt;
    if (!Number.isNaN(date.getTime())) {
      return {
        date: formatDateInput(date, timeZone),
        time: formatTimeInput(date, timeZone),
      };
    }
  }
  const now = new Date();
  return {
    date: formatDateInput(now, timeZone),
    time: formatTimeInput(now, timeZone),
  };
}

function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

function emptySet(seed = "0", roundNumber?: number | null): DraftSet {
  return {
    id: `set-${seed}`,
    reps: "",
    weightKg: "",
    durationSeconds: "",
    distanceM: "",
    roundNumber: roundNumber ?? null,
  };
}

function copySet(set: DraftSet, roundNumber?: number | null): DraftSet {
  return {
    id: newClientId(),
    reps: set.reps ?? "",
    weightKg: set.weightKg ?? "",
    durationSeconds: set.durationSeconds ?? "",
    distanceM: set.distanceM ?? "",
    roundNumber: roundNumber ?? set.roundNumber ?? null,
  };
}

function setFromTemplate(lastSet: RecentExerciseChip["lastSet"], roundNumber?: number | null): DraftSet {
  return {
    id: newClientId(),
    reps: lastSet.reps?.toString() ?? "",
    weightKg: lastSet.weightKg?.toString() ?? "",
    durationSeconds: lastSet.durationSeconds?.toString() ?? "",
    distanceM: lastSet.distanceM?.toString() ?? "",
    roundNumber: roundNumber ?? null,
  };
}

function setHasValue(set: DraftSet) {
  return Boolean(set.reps || set.weightKg || set.durationSeconds || set.distanceM);
}

function draftHasRounds(exercises: DraftExercise[]) {
  return exercises.some((ex) => ex.sets.some((set) => set.roundNumber != null));
}

function findCircuitCursor(exercises: DraftExercise[]) {
  if (exercises.length === 0) return { stationIndex: 0, round: 1 };
  for (let round = 1; round <= 40; round += 1) {
    for (let stationIndex = 0; stationIndex < exercises.length; stationIndex += 1) {
      const has = exercises[stationIndex].sets.some(
        (set) => set.roundNumber === round && setHasValue(set),
      );
      if (!has) return { stationIndex, round };
    }
  }
  return { stationIndex: 0, round: 1 };
}

function metricsFromSet(set: DraftSet | undefined): Pick<
  DraftSet,
  "reps" | "weightKg" | "durationSeconds" | "distanceM"
> {
  return {
    reps: set?.reps ?? "",
    weightKg: set?.weightKg ?? "",
    durationSeconds: set?.durationSeconds ?? "",
    distanceM: set?.distanceM ?? "",
  };
}

function prefillForStation(exercise: DraftExercise, round: number) {
  const existing = exercise.sets.find((set) => set.roundNumber === round);
  if (existing && setHasValue(existing)) return metricsFromSet(existing);
  const previous = [...exercise.sets]
    .filter((set) => set.roundNumber != null && set.roundNumber < round && setHasValue(set))
    .sort((a, b) => (b.roundNumber ?? 0) - (a.roundNumber ?? 0))[0];
  if (previous) return metricsFromSet(previous);
  const lastStraight = [...exercise.sets].reverse().find(setHasValue);
  return metricsFromSet(lastStraight);
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        type="button"
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-card shadow-soft sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <XIcon size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-border px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function WorkoutLogForm({
  autosave = false,
  backLink,
  discardLabel,
  exercises,
  draft,
  error,
  heading,
  seedEnergyBefore,
  recentExercises = [],
  submitLabel,
  timeZone,
  workoutId,
}: WorkoutLogFormProps) {
  const navigation = useNavigation();
  const saveFetcher = useFetcher();
  const submitDraftRef = useRef(saveFetcher.submit);
  submitDraftRef.current = saveFetcher.submit;
  const busy = navigation.state !== "idle";
  const discarding =
    navigation.state !== "idle" && navigation.formData?.get("intent") === "discard";
  const catalogById = useMemo(() => new Map(exercises.map((ex) => [ex.id, ex])), [exercises]);
  const skipAutosaveRef = useRef(true);
  const focusMetricRef = useRef<HTMLInputElement | null>(null);
  const todayInput = formatDateInput(new Date(), timeZone);

  const initialExercises: DraftExercise[] = useMemo(() => {
    if (!draft?.exercises?.length) return [];
    return draft.exercises.map((item, exerciseIndex) => {
      const catalog = catalogById.get(item.exerciseId);
      return {
        id: `exercise-${exerciseIndex}`,
        exerciseId: item.exerciseId,
        key: item.key ?? catalog?.key ?? "",
        name: item.name,
        sets:
          item.sets.length > 0
            ? item.sets.map((s, setIndex) => ({
                id: `set-${exerciseIndex}-${setIndex}`,
                reps: s.reps?.toString() ?? "",
                weightKg: s.weightKg?.toString() ?? "",
                durationSeconds: s.durationSeconds?.toString() ?? "",
                distanceM: s.distanceM?.toString() ?? "",
                roundNumber: s.roundNumber ?? null,
              }))
            : [emptySet(`${exerciseIndex}-0`)],
      };
    });
  }, [draft, catalogById]);

  const initialEnergyBefore = draft?.energyBefore ?? seedEnergyBefore ?? undefined;

  const [title, setTitle] = useState(draft?.title ?? "");
  const [energyBefore, setEnergyBefore] = useState<number | undefined>(
    initialEnergyBefore != null ? Number(initialEnergyBefore) : undefined,
  );
  const [energyAfter, setEnergyAfter] = useState<number | undefined>(
    draft?.energyAfter ?? undefined,
  );
  const [worthIt, setWorthIt] = useState<number | undefined>(draft?.worthIt ?? undefined);
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    draft?.durationSeconds != null ? String(Math.round(draft.durationSeconds / 60)) : "",
  );
  const initialMoment = useMemo(() => draftMoment(draft, timeZone), [draft, timeZone]);
  const [performedOn, setPerformedOn] = useState(initialMoment.date);
  const [performedAtTime, setPerformedAtTime] = useState(initialMoment.time);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>(initialExercises);
  // Start collapsed so repeat / continue land on summaries, not a drill-in.
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [focusAfterExpand, setFocusAfterExpand] = useState(false);
  const [circuitMode, setCircuitMode] = useState(() => draftHasRounds(initialExercises));
  const initialCursor = useMemo(() => findCircuitCursor(initialExercises), [initialExercises]);
  const [circuitStationIndex, setCircuitStationIndex] = useState(initialCursor.stationIndex);
  const [circuitRound, setCircuitRound] = useState(initialCursor.round);
  const [pendingSet, setPendingSet] = useState(() => {
    const station = initialExercises[initialCursor.stationIndex];
    return station ? prefillForStation(station, initialCursor.round) : metricsFromSet(undefined);
  });
  const circuitFocusRef = useRef<HTMLInputElement | null>(null);

  const recentAvailable = useMemo(() => {
    const used = new Set(draftExercises.map((item) => item.exerciseId).filter(Boolean));
    return recentExercises.filter((item) => !used.has(item.exerciseId));
  }, [recentExercises, draftExercises]);

  useEffect(() => {
    if (!focusAfterExpand || !expandedExerciseId) return;
    const timer = window.setTimeout(() => {
      focusMetricRef.current?.focus();
      setFocusAfterExpand(false);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [focusAfterExpand, expandedExerciseId]);

  useEffect(() => {
    if (!autosave || !workoutId) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (navigation.state !== "idle") return;

    const timer = window.setTimeout(() => {
      const formData = new FormData();
      formData.set("intent", "autosave");
      formData.set("workoutId", workoutId);
      formData.set("exercisesJson", JSON.stringify(draftExercises));
      formData.set("title", title);
      formData.set("energyBefore", energyBefore?.toString() ?? "");
      formData.set("energyAfter", energyAfter?.toString() ?? "");
      formData.set("worthIt", worthIt?.toString() ?? "");
      formData.set("notes", notes);
      formData.set("durationMinutes", durationMinutes);
      formData.set("performedOn", performedOn);
      formData.set("performedAtTime", performedAtTime);
      submitDraftRef.current(formData, { method: "post" });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    autosave,
    workoutId,
    draftExercises,
    title,
    energyBefore,
    energyAfter,
    worthIt,
    notes,
    durationMinutes,
    performedOn,
    performedAtTime,
    navigation.state,
  ]);

  function expandExercise(id: string, focus = false) {
    setExpandedExerciseId(id);
    setFocusAfterExpand(focus);
    setStepError(null);
  }

  function addExercise(
    exercise: { exerciseId: string; key: string; name: string },
    firstSet?: DraftSet,
  ) {
    const id = newClientId();
    const next: DraftExercise = {
      id,
      exerciseId: exercise.exerciseId,
      key: exercise.key,
      name: exercise.name,
      sets: [firstSet ?? emptySet(newClientId())],
    };
    setDraftExercises((prev) => [...prev, next]);
    setAddingExercise(false);
    setNewExerciseName("");
    if (circuitMode) {
      setStepError(null);
      return;
    }
    expandExercise(id, true);
  }

  function addExerciseFromCatalog(exerciseId: string) {
    const catalog = catalogById.get(exerciseId);
    if (!catalog) return;
    addExercise({ exerciseId: catalog.id, key: catalog.key, name: catalog.name });
  }

  function addRecentExercise(template: RecentExerciseChip) {
    addExercise(
      { exerciseId: template.exerciseId, key: template.key, name: template.name },
      setFromTemplate(template.lastSet),
    );
  }

  function addCustomExercise() {
    const trimmed = newExerciseName.trim();
    if (!trimmed) {
      setStepError("Enter an exercise name.");
      return;
    }

    const existing = exercises.find((ex) => ex.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      addExerciseFromCatalog(existing.id);
      return;
    }

    addExercise({ exerciseId: "", key: "", name: trimmed });
  }

  function removeExercise(id: string) {
    setDraftExercises((prev) => prev.filter((item) => item.id !== id));
    if (expandedExerciseId === id) setExpandedExerciseId(null);
  }

  function addSet(exerciseLocalId: string) {
    setDraftExercises((prev) =>
      prev.map((item) => {
        if (item.id !== exerciseLocalId) return item;
        const last = item.sets[item.sets.length - 1];
        // Straight-set adds stay without round numbers.
        return {
          ...item,
          sets: [...item.sets, last ? copySet(last, null) : emptySet(newClientId(), null)],
        };
      }),
    );
  }

  function updateSet(
    exerciseLocalId: string,
    setId: string,
    metric: ExerciseMetric,
    value: string,
  ) {
    setDraftExercises((prev) =>
      prev.map((item) => {
        if (item.id !== exerciseLocalId) return item;
        return {
          ...item,
          sets: item.sets.map((set) => (set.id === setId ? { ...set, [metric]: value } : set)),
        };
      }),
    );
  }

  function removeSet(exerciseLocalId: string, setId: string) {
    setDraftExercises((prev) =>
      prev.map((item) => {
        if (item.id !== exerciseLocalId) return item;
        if (item.sets.length <= 1) return item;
        return { ...item, sets: item.sets.filter((set) => set.id !== setId) };
      }),
    );
  }

  function moveCircuitCursor(
    nextExercises: DraftExercise[],
    stationIndex: number,
    round: number,
  ) {
    const nextStation =
      stationIndex + 1 < nextExercises.length
        ? { stationIndex: stationIndex + 1, round }
        : { stationIndex: 0, round: round + 1 };
    const station = nextExercises[nextStation.stationIndex];
    setCircuitStationIndex(nextStation.stationIndex);
    setCircuitRound(nextStation.round);
    setPendingSet(station ? prefillForStation(station, nextStation.round) : metricsFromSet(undefined));
    window.setTimeout(() => circuitFocusRef.current?.focus(), 50);
  }

  function enterCircuitMode() {
    const cursor = findCircuitCursor(draftExercises);
    setCircuitMode(true);
    setExpandedExerciseId(null);
    setCircuitStationIndex(cursor.stationIndex);
    setCircuitRound(cursor.round);
    const station = draftExercises[cursor.stationIndex];
    setPendingSet(station ? prefillForStation(station, cursor.round) : metricsFromSet(undefined));
    setStepError(null);
    window.setTimeout(() => circuitFocusRef.current?.focus(), 50);
  }

  function leaveCircuitMode() {
    setCircuitMode(false);
    setStepError(null);
  }

  function logCircuitSetAndNext() {
    const station = draftExercises[circuitStationIndex];
    if (!station) {
      setStepError("Add stations before logging the circuit.");
      return;
    }
    const draftSet: DraftSet = {
      id: newClientId(),
      ...pendingSet,
      roundNumber: circuitRound,
    };
    if (!setHasValue(draftSet)) {
      setStepError("Enter at least one metric for this station.");
      return;
    }

    const nextExercises = draftExercises.map((item, index) => {
      if (index !== circuitStationIndex) return item;
      const existingIndex = item.sets.findIndex((set) => set.roundNumber === circuitRound);
      if (existingIndex >= 0) {
        return {
          ...item,
          sets: item.sets.map((set, setIndex) =>
            setIndex === existingIndex
              ? { ...set, ...pendingSet, roundNumber: circuitRound }
              : set,
          ),
        };
      }
      // Drop a single empty placeholder set when starting circuit logging.
      const baseSets =
        item.sets.length === 1 && !setHasValue(item.sets[0]) && item.sets[0].roundNumber == null
          ? []
          : item.sets;
      return { ...item, sets: [...baseSets, draftSet] };
    });

    setDraftExercises(nextExercises);
    setStepError(null);
    moveCircuitCursor(nextExercises, circuitStationIndex, circuitRound);
  }

  function skipCircuitStation() {
    setStepError(null);
    moveCircuitCursor(draftExercises, circuitStationIndex, circuitRound);
  }

  const activeStation = draftExercises[circuitStationIndex] ?? null;
  const activeStationMetrics = metricsForExerciseKey(activeStation?.key);
  const maxCircuitRound = draftExercises.reduce((max, ex) => {
    const local = ex.sets.reduce((m, set) => Math.max(m, set.roundNumber ?? 0), 0);
    return Math.max(max, local);
  }, 0);

  function openFinish() {
    if (energyBefore == null) {
      setStepError("Pick how you feel before finishing.");
      return;
    }
    const hasSets = draftExercises.some((ex) => ex.sets.some(setHasValue));
    if (!hasSets) {
      setStepError("Add at least one set with reps, weight, duration, or distance.");
      return;
    }
    setStepError(null);
    setFinishOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (energyBefore == null) {
      event.preventDefault();
      setFinishOpen(false);
      setStepError("Pick how you feel before finishing.");
      return;
    }
    if (energyAfter == null) {
      event.preventDefault();
      setStepError("Pick how you feel now.");
      return;
    }
    if (worthIt == null) {
      event.preventDefault();
      setStepError("Was it worth doing?");
      return;
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Link
          className="absolute left-0 top-1/2 -translate-y-1/2 hover:text-foreground"
          to={backLink}
        >
          <XIcon size={24} />
        </Link>
        <h1 className="text-center text-2xl font-bold tracking-tight">{heading}</h1>
      </div>

      {error || stepError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ?? stepError}
        </p>
      ) : null}

      <Form className="space-y-6" method="post" onSubmit={handleSubmit}>
        <input name="intent" type="hidden" value="complete" />
        {workoutId ? <input name="workoutId" type="hidden" value={workoutId} /> : null}
        <input name="exercisesJson" type="hidden" value={JSON.stringify(draftExercises)} />
        <input name="title" type="hidden" value={title} />
        <input name="energyBefore" type="hidden" value={energyBefore ?? ""} />
        <input name="energyAfter" type="hidden" value={energyAfter ?? ""} />
        <input name="worthIt" type="hidden" value={worthIt ?? ""} />
        <input name="notes" type="hidden" value={notes} />
        <input name="durationMinutes" type="hidden" value={durationMinutes} />
        <input name="performedOn" type="hidden" value={performedOn} />
        <input name="performedAtTime" type="hidden" value={performedAtTime} />

        <section className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titleInput">Title (optional)</Label>
              <Input
                id="titleInput"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Upper body"
                value={title}
              />
            </div>
            <div className="space-y-2">
              <Label>How are you feeling?</Label>
              <ControlledRating
                kind="energy"
                name="energyBeforeUi"
                onChange={setEnergyBefore}
                value={energyBefore}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {circuitMode ? "Circuit" : "What are you doing?"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {circuitMode
                    ? "Log one station, then advance to the next. Round numbers are saved on each set."
                    : "Expand an exercise to log sets. Or log as a circuit to rotate stations."}
                </p>
              </div>
              {circuitMode ? (
                <Button onClick={leaveCircuitMode} size="sm" type="button" variant="ghost">
                  End circuit
                </Button>
              ) : (
                <Button onClick={enterCircuitMode} size="sm" type="button" variant="outline">
                  Log as circuit
                </Button>
              )}
            </div>

            {recentAvailable.length > 0 && !circuitMode ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recent
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentAvailable.map((item) => (
                    <button
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium shadow-soft transition hover:border-primary/40 hover:bg-primary-soft/40"
                      key={item.exerciseId}
                      onClick={() => addRecentExercise(item)}
                      type="button"
                    >
                      <Plus className="mr-1 inline size-3.5 align-[-2px]" strokeWidth={2} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {circuitMode ? (
              <div className="space-y-4">
                {draftExercises.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    Add stations to start the circuit.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {draftExercises.map((item, index) => {
                          const doneThisRound = item.sets.some(
                            (set) => set.roundNumber === circuitRound && setHasValue(set),
                          );
                          const active = index === circuitStationIndex;
                          return (
                            <button
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                active
                                  ? "border-primary bg-primary-soft text-primary"
                                  : doneThisRound
                                    ? "border-border bg-muted/60 text-muted-foreground"
                                    : "border-border bg-card text-foreground",
                              )}
                              key={item.id}
                              onClick={() => {
                                setCircuitStationIndex(index);
                                setPendingSet(prefillForStation(item, circuitRound));
                                window.setTimeout(() => circuitFocusRef.current?.focus(), 50);
                              }}
                              type="button"
                            >
                              {index + 1}. {item.name}
                            </button>
                          );
                        })}
                      </div>

                      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {draftExercises.map((item) => {
                          const rounds = item.sets
                            .filter((set) => set.roundNumber != null && setHasValue(set))
                            .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
                          return (
                            <li className="px-4 py-3" key={item.id}>
                              <p className="font-medium tracking-tight">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {rounds.length === 0
                                  ? "No rounds yet"
                                  : rounds
                                      .map(
                                        (set) =>
                                          `R${set.roundNumber}: ${formatSetDetails(set) || "—"}`,
                                      )
                                      .join(" · ")}
                              </p>
                            </li>
                          );
                        })}
                      </ul>

                      <Button
                        onClick={() => {
                          setAddingExercise(true);
                          setNewExerciseName("");
                          setStepError(null);
                        }}
                        type="button"
                        variant="secondary"
                      >
                        <Plus size={16} strokeWidth={1.75} />
                        Add station
                      </Button>
                    </div>

                    {activeStation ? (
                      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Round {circuitRound}
                            {maxCircuitRound > 0 ? ` · ${maxCircuitRound} logged` : ""}
                          </p>
                          <h3 className="text-lg font-semibold tracking-tight">
                            {activeStation.name}
                          </h3>
                        </div>
                        <div
                          className={cn(
                            "grid gap-2",
                            activeStationMetrics.length === 1
                              ? "grid-cols-1"
                              : activeStationMetrics.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-3",
                          )}
                        >
                          {activeStationMetrics.map((metric, metricIndex) => (
                            <div className="space-y-1" key={metric}>
                              <Label className="text-xs">{metricLabel(metric)}</Label>
                              <Input
                                inputMode={metricInputMode(metric)}
                                onChange={(e) =>
                                  setPendingSet((prev) => ({ ...prev, [metric]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    logCircuitSetAndNext();
                                  }
                                }}
                                ref={metricIndex === 0 ? circuitFocusRef : undefined}
                                value={pendingSet[metric] ?? ""}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="btn-primary-gradient flex-1"
                            onClick={logCircuitSetAndNext}
                            type="button"
                          >
                            Log & next
                          </Button>
                          <Button onClick={skipCircuitStation} type="button" variant="outline">
                            Skip
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {draftExercises.length === 0 ? (
                  <Button
                    onClick={() => {
                      setAddingExercise(true);
                      setNewExerciseName("");
                      setStepError(null);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    <Plus size={16} strokeWidth={1.75} />
                    Add station
                  </Button>
                ) : null}
              </div>
            ) : draftExercises.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No exercises yet. Add one to get started.
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                {draftExercises.map((item) => {
                  const expanded = expandedExerciseId === item.id;
                  const metrics = metricsForExerciseKey(item.key);
                  return (
                    <li key={item.id}>
                      <button
                        aria-expanded={expanded}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/50"
                        onClick={() =>
                          setExpandedExerciseId((current) => (current === item.id ? null : item.id))
                        }
                        type="button"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatExerciseSetsSummary(item.sets)}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "shrink-0 text-muted-foreground transition-transform",
                            expanded && "rotate-180",
                          )}
                          size={18}
                          strokeWidth={1.75}
                        />
                      </button>

                      {expanded ? (
                        <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-4">
                          <ul className="space-y-4">
                            {item.sets.map((set, index) => {
                              const setSummary = formatSetDetails(set);
                              return (
                                <li key={set.id}>
                                  <div className="mb-3 flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">
                                        {set.roundNumber != null
                                          ? `Round ${set.roundNumber}`
                                          : `Set ${index + 1}`}
                                      </p>
                                      {setSummary ? (
                                        <p className="text-xs text-muted-foreground">
                                          {setSummary}
                                        </p>
                                      ) : null}
                                    </div>
                                    {item.sets.length > 1 ? (
                                      <button
                                        aria-label={`Remove set ${index + 1}`}
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => removeSet(item.id, set.id)}
                                        type="button"
                                      >
                                        <Trash2 size={16} strokeWidth={1.75} />
                                      </button>
                                    ) : null}
                                  </div>
                                  <div
                                    className={cn(
                                      "grid gap-2",
                                      metrics.length === 1
                                        ? "grid-cols-1"
                                        : metrics.length === 2
                                          ? "grid-cols-2"
                                          : "grid-cols-3",
                                    )}
                                  >
                                    {metrics.map((metric, metricIndex) => (
                                      <div className="space-y-1" key={metric}>
                                        <Label className="text-xs">{metricLabel(metric)}</Label>
                                        <Input
                                          inputMode={metricInputMode(metric)}
                                          onChange={(e) =>
                                            updateSet(item.id, set.id, metric, e.target.value)
                                          }
                                          ref={
                                            index === 0 && metricIndex === 0
                                              ? focusMetricRef
                                              : undefined
                                          }
                                          value={set[metric] ?? ""}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => addSet(item.id)} type="button" variant="outline">
                              <Plus size={16} strokeWidth={1.75} />
                              Add set
                            </Button>
                            <Button
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeExercise(item.id)}
                              type="button"
                              variant="ghost"
                            >
                              Remove exercise
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {!circuitMode ? (
              <Button
                onClick={() => {
                  setAddingExercise(true);
                  setNewExerciseName("");
                  setStepError(null);
                }}
                type="button"
                variant="secondary"
              >
                <Plus size={16} strokeWidth={1.75} />
                Add exercise
              </Button>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes, optional)</Label>
              <Input
                id="durationMinutes"
                inputMode="numeric"
                min={1}
                onChange={(e) => setDurationMinutes(e.target.value)}
                value={durationMinutes}
              />
            </div>
          </div>
        </section>

        <Button className="btn-primary-gradient w-full" onClick={openFinish} type="button">
          Finish
        </Button>

        <BottomSheet
          footer={
            <Button className="btn-primary-gradient w-full" disabled={busy} type="submit">
              {busy ? "Saving…" : submitLabel}
            </Button>
          }
          onClose={() => {
            setFinishOpen(false);
            setStepError(null);
          }}
          open={finishOpen}
          title="Finish workout"
        >
          <div className="space-y-6">
            {stepError && finishOpen ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {stepError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="performedOn">When was this?</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="performedOn"
                  max={todayInput}
                  onChange={(e) => setPerformedOn(e.target.value)}
                  type="date"
                  value={performedOn}
                />
                <Input
                  aria-label="Time"
                  id="performedAtTime"
                  onChange={(e) => setPerformedAtTime(e.target.value)}
                  type="time"
                  value={performedAtTime}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Time matters for insights (morning / afternoon / evening). Backdate if you forgot to
                log earlier.
              </p>
            </div>
            <div className="space-y-2">
              <Label>How are you feeling now?</Label>
              <ControlledRating
                kind="energy"
                name="energyAfterUi"
                onChange={setEnergyAfter}
                value={energyAfter}
              />
            </div>
            <div className="space-y-2">
              <Label>Was it worth doing?</Label>
              <ControlledRating
                kind="worth"
                name="worthItUi"
                onChange={setWorthIt}
                value={worthIt}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional, 200 chars)</Label>
              <Textarea
                id="notes"
                maxLength={200}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                value={notes}
              />
            </div>
          </div>
        </BottomSheet>

        <BottomSheet
          onClose={() => {
            setAddingExercise(false);
            setNewExerciseName("");
          }}
          open={addingExercise}
          title={circuitMode ? "Add station" : "Add exercise"}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">From your list</p>
              {exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exercises yet. Create one below.</p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {exercises.map((ex) => (
                    <li key={ex.id}>
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium tracking-tight transition hover:bg-muted/50"
                        onClick={() => addExerciseFromCatalog(ex.id)}
                        type="button"
                      >
                        <span className="min-w-0 flex-1">{ex.name}</span>
                        <ChevronRight
                          className="shrink-0 text-muted-foreground"
                          size={18}
                          strokeWidth={1.75}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative text-center text-xs text-muted-foreground">
              <span className="absolute inset-x-0 top-1/2 border-t border-border" />
              <span className="relative bg-card px-2">or create new</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newExerciseName">Exercise name</Label>
              <Input
                id="newExerciseName"
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomExercise();
                  }
                }}
                placeholder="e.g. Bulgarian split squat"
                value={newExerciseName}
              />
              <p className="text-xs text-muted-foreground">
                New exercises get reps, kg, and seconds. Saved when you finish the workout.
              </p>
            </div>
            <Button
              disabled={!newExerciseName.trim()}
              onClick={addCustomExercise}
              type="button"
              variant="secondary"
            >
              <Plus size={16} strokeWidth={1.75} />
              Create exercise
            </Button>
          </div>
        </BottomSheet>
      </Form>

      {autosave && workoutId && discardLabel ? (
        <Form className="pt-2" method="post">
          <input name="intent" type="hidden" value="discard" />
          <input name="workoutId" type="hidden" value={workoutId} />
          <Button
            className="w-full text-muted-foreground hover:text-destructive"
            disabled={busy}
            type="submit"
            variant="ghost"
          >
            {discarding ? "Discarding…" : discardLabel}
          </Button>
        </Form>
      ) : null}
    </div>
  );
}

function ControlledRating({
  kind,
  name,
  value,
  onChange,
}: {
  kind: "energy" | "worth";
  name: string;
  value?: number;
  onChange: (value: number) => void;
}) {
  return <RatingPicker kind={kind} name={name} onChange={onChange} value={value} />;
}
