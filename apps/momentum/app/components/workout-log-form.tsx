import { ChevronRight, Plus, Trash2, XIcon } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Form, Link, useFetcher, useNavigation } from "react-router";

import { RatingPicker } from "~/components/rating-picker";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
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

type DraftSet = {
  id: string;
  reps?: string;
  weightKg?: string;
  durationSeconds?: string;
  distanceM?: string;
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

const steps = ["Session", "After"] as const;

function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

function emptySet(seed = "0"): DraftSet {
  return {
    id: `set-${seed}`,
    reps: "",
    weightKg: "",
    durationSeconds: "",
    distanceM: "",
  };
}

function copySet(set: DraftSet): DraftSet {
  return {
    id: newClientId(),
    reps: set.reps ?? "",
    weightKg: set.weightKg ?? "",
    durationSeconds: set.durationSeconds ?? "",
    distanceM: set.distanceM ?? "",
  };
}

function setHasValue(set: DraftSet) {
  return Boolean(set.reps || set.weightKg || set.durationSeconds || set.distanceM);
}

export function WorkoutLogForm({
  autosave = false,
  backLink,
  discardLabel,
  exercises,
  draft,
  error,
  heading,
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
              }))
            : [emptySet(`${exerciseIndex}-0`)],
      };
    });
  }, [draft, catalogById]);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [energyBefore, setEnergyBefore] = useState<number | undefined>(
    draft?.energyBefore ?? undefined,
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
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [addingExercise, setAddingExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);

  const selectedExercise = draftExercises.find((item) => item.id === selectedExerciseId) ?? null;
  const selectedMetrics = metricsForExerciseKey(selectedExercise?.key);

  useEffect(() => {
    if (!autosave || !workoutId) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    // Pause autosave while the final submit is in flight so it can't race complete.
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
    navigation.state,
  ]);

  function addExerciseFromCatalog(exerciseId: string) {
    const catalog = catalogById.get(exerciseId);
    if (!catalog) return;
    const id = newClientId();
    setDraftExercises((prev) => [
      ...prev,
      {
        id,
        exerciseId: catalog.id,
        key: catalog.key,
        name: catalog.name,
        sets: [emptySet(newClientId())],
      },
    ]);
    setAddingExercise(false);
    setNewExerciseName("");
    setSelectedExerciseId(id);
    setStepError(null);
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

    const id = newClientId();
    setDraftExercises((prev) => [
      ...prev,
      {
        id,
        exerciseId: "",
        key: "",
        name: trimmed,
        sets: [emptySet(newClientId())],
      },
    ]);
    setAddingExercise(false);
    setNewExerciseName("");
    setSelectedExerciseId(id);
    setStepError(null);
  }

  function removeExercise(id: string) {
    setDraftExercises((prev) => prev.filter((item) => item.id !== id));
    if (selectedExerciseId === id) setSelectedExerciseId(null);
  }

  function addSet(exerciseLocalId: string) {
    setDraftExercises((prev) =>
      prev.map((item) => {
        if (item.id !== exerciseLocalId) return item;
        const last = item.sets[item.sets.length - 1];
        return {
          ...item,
          sets: [...item.sets, last ? copySet(last) : emptySet(newClientId())],
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

  function goBack() {
    setStepError(null);
    if (step === 0 && (selectedExerciseId || addingExercise)) {
      setSelectedExerciseId(null);
      setAddingExercise(false);
      setNewExerciseName("");
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function goNext() {
    if (step === 0) {
      if (selectedExerciseId || addingExercise) {
        setSelectedExerciseId(null);
        setAddingExercise(false);
        setNewExerciseName("");
        setStepError(null);
        return;
      }
      if (energyBefore == null) {
        setStepError("Pick how you feel before continuing.");
        return;
      }
      const hasSets = draftExercises.some((ex) => ex.sets.some(setHasValue));
      if (!hasSets) {
        setStepError("Add at least one set with reps, weight, duration, or distance.");
        return;
      }
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

  const continueLabel = step === 0 && (selectedExerciseId || addingExercise) ? "Done" : "Continue";

  const inExerciseDrillIn = step === 0 && Boolean(selectedExerciseId || addingExercise);
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <div className="relative">
            <Link
              className="absolute left-0 top-1/2 -translate-y-1/2 hover:text-foreground"
              to={backLink}
            >
              <XIcon size={24} />
            </Link>
            <h1 className="text-center text-2xl font-bold tracking-tight">{heading}</h1>
          </div>
          <ol aria-label={`Step ${step + 1} of ${steps.length}`} className="mt-4 flex gap-1.5 px-8">
            {steps.map((label, index) => (
              <li className="min-w-0 flex-1" key={label}>
                <button
                  aria-current={index === step ? "step" : undefined}
                  aria-label={`${label}${index < step ? ", completed" : index === step ? ", current" : ""}`}
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    index <= step ? "bg-primary" : "bg-border"
                  }`}
                  onClick={() => {
                    if (index < step) {
                      setStepError(null);
                      setSelectedExerciseId(null);
                      setAddingExercise(false);
                      setNewExerciseName("");
                      setStep(index);
                    }
                  }}
                  type="button"
                />
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted-foreground">
            {step === 0 && selectedExercise
              ? selectedExercise.name
              : step === 0 && addingExercise
                ? "Add exercise"
                : steps[step]}
          </p>
        </div>
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

        {step === 0 ? (
          <section className="space-y-6">
            {addingExercise ? (
              <div className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="space-y-2">
                  <Label htmlFor="catalogExercise">From your list</Label>
                  <Select
                    defaultValue=""
                    id="catalogExercise"
                    onChange={(e) => {
                      if (e.target.value) addExerciseFromCatalog(e.target.value);
                    }}
                  >
                    <option disabled value="">
                      Select…
                    </option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </Select>
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
            ) : selectedExercise ? (
              <div className="space-y-4">
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  {selectedExercise.sets.map((set, index) => {
                    const setSummary = formatSetDetails(set);
                    return (
                      <li className="p-4" key={set.id}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Set {index + 1}
                            </p>
                            {setSummary ? (
                              <p className="text-xs text-muted-foreground">{setSummary}</p>
                            ) : null}
                          </div>
                          {selectedExercise.sets.length > 1 ? (
                            <button
                              aria-label={`Remove set ${index + 1}`}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeSet(selectedExercise.id, set.id)}
                              type="button"
                            >
                              <Trash2 size={16} strokeWidth={1.75} />
                            </button>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "grid gap-2",
                            selectedMetrics.length === 1
                              ? "grid-cols-1"
                              : selectedMetrics.length === 2
                                ? "grid-cols-2"
                                : "grid-cols-3",
                          )}
                        >
                          {selectedMetrics.map((metric) => (
                            <div className="space-y-1" key={metric}>
                              <Label className="text-xs">{metricLabel(metric)}</Label>
                              <Input
                                inputMode={metricInputMode(metric)}
                                onChange={(e) =>
                                  updateSet(selectedExercise.id, set.id, metric, e.target.value)
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
                <Button onClick={() => addSet(selectedExercise.id)} type="button" variant="outline">
                  <Plus size={16} strokeWidth={1.75} />
                  Add set
                </Button>
                <Button
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeExercise(selectedExercise.id)}
                  type="button"
                  variant="ghost"
                >
                  Remove exercise
                </Button>
              </div>
            ) : (
              <>
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
                      name="energyBefore"
                      onChange={setEnergyBefore}
                      value={energyBefore}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h2 className="text-base font-semibold">What are you doing?</h2>
                    <p className="text-sm text-muted-foreground">
                      Tap an exercise to log its sets.
                    </p>
                  </div>
                  {draftExercises.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      No exercises yet. Add one to get started.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                      {draftExercises.map((item) => (
                        <li key={item.id}>
                          <button
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/50"
                            onClick={() => {
                              setSelectedExerciseId(item.id);
                              setStepError(null);
                            }}
                            type="button"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold tracking-tight">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatExerciseSetsSummary(item.sets)}
                              </p>
                            </div>
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
              </>
            )}
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-6">
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
                name="energyAfter"
                onChange={setEnergyAfter}
                value={energyAfter}
              />
            </div>
            <div className="space-y-2">
              <Label>Was it worth doing?</Label>
              <ControlledRating kind="worth" name="worthIt" onChange={setWorthIt} value={worthIt} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional, 200 chars)</Label>
              <Textarea
                id="notes"
                maxLength={200}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                value={notes}
              />
            </div>
          </section>
        ) : null}

        <div className="flex gap-3">
          {step > 0 || inExerciseDrillIn ? (
            <Button onClick={goBack} type="button" variant="outline">
              Back
            </Button>
          ) : null}
          <Button
            className={step < steps.length - 1 ? "btn-primary-gradient flex-1" : "hidden"}
            onClick={goNext}
            type="button"
          >
            {continueLabel}
          </Button>
          <Button
            className={step === steps.length - 1 ? "btn-primary-gradient flex-1" : "hidden"}
            disabled={step !== steps.length - 1 || busy}
            type="submit"
          >
            {busy ? "Saving…" : submitLabel}
          </Button>
        </div>
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
