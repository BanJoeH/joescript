import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

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
  return (
    <Form className="space-y-6" method="post">
      <input name="intent" type="hidden" value="save" />
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="taskType">Task type</Label>
        <Input
          defaultValue={defaultValues.taskType}
          id="taskType"
          list="task-suggestions"
          name="taskType"
          placeholder="Coppice"
          required
        />
        <datalist id="task-suggestions">
          {taskSuggestions.map((task) => (
            <option key={task} value={task} />
          ))}
        </datalist>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Months</legend>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Input defaultValue={defaultValues.source} id="source" name="source" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confidence">Confidence</Label>
          <Input defaultValue={defaultValues.confidence} id="confidence" name="confidence" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input defaultChecked={defaultValues.active} name="active" type="checkbox" value="on" />
        Active
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
