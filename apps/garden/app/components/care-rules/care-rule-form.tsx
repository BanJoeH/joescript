import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const taskSuggestions = ["Coppice", "Deadhead", "Feed", "Cut back", "Prune", "Mulch", "Water"];

export type CareRuleFormValues = {
  taskType: string;
  months: number[];
  instructions: string;
  source: string;
  confidence: string;
  active: boolean;
};

type CareRuleFormProps = {
  cancelTo: string;
  defaultValues: CareRuleFormValues;
  error?: string | null;
  submitLabel: string;
};

export function CareRuleForm({ cancelTo, defaultValues, error, submitLabel }: CareRuleFormProps) {
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(defaultValues.source || defaultValues.confidence),
  );

  return (
    <Form className="space-y-6" method="post">
      <input name="intent" type="hidden" value="save" />
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="taskType">Task</Label>
        <Input
          defaultValue={defaultValues.taskType}
          id="taskType"
          list="task-suggestions"
          name="taskType"
          placeholder="e.g. Prune, Feed, Mulch"
          required
        />
        <datalist id="task-suggestions">
          {taskSuggestions.map((task) => (
            <option key={task} value={task} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">
          The garden work you want to remember each year.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Months</legend>
        <p className="text-xs text-muted-foreground">
          This task will appear on your dashboard in the months you select.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {monthLabels.map((label, index) => {
            const month = index + 1;
            return (
              <label
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                key={month}
              >
                <input
                  defaultChecked={defaultValues.months.includes(month)}
                  name={`month-${month}`}
                  type="checkbox"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          defaultValue={defaultValues.instructions}
          id="instructions"
          name="instructions"
          placeholder="Cut back to two buds above ground"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          How you do this task, shown on the dashboard and plant page.
        </p>
      </div>

      <details
        className="rounded-md border border-border bg-muted/30 px-4 py-3"
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        open={detailsOpen}
      >
        <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                detailsOpen && "rotate-180",
              )}
            />
            More details
          </span>
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              defaultValue={defaultValues.source}
              id="source"
              name="source"
              placeholder="e.g. RHS, neighbour's advice"
            />
            <p className="text-xs text-muted-foreground">Where this advice came from.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confidence">Confidence</Label>
            <Input
              defaultValue={defaultValues.confidence}
              id="confidence"
              name="confidence"
              placeholder="e.g. High, still experimenting"
            />
            <p className="text-xs text-muted-foreground">How sure you are about the timing.</p>
          </div>
        </div>
      </details>

      <label className="flex items-center gap-2 text-sm">
        <input defaultChecked={defaultValues.active} name="active" type="checkbox" value="on" />
        Show this task on the dashboard
      </label>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link to={cancelTo}>Cancel</Link>
        </Button>
      </div>
    </Form>
  );
}
