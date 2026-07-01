import { Form, Link } from "react-router";

import { JournalPhotoFields } from "~/components/journal/journal-photo-fields";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { journalEntryStatuses } from "~/db/schema";

export type JournalEntryFormValues = {
  status: string;
  performedAt: string;
  plantId: string;
  areaId: string;
  careRuleId: string;
  taskType: string;
  notes: string;
};

type JournalEntryFormProps = {
  areas: Array<{ id: string; name: string }>;
  cancelTo: string;
  defaultValues: JournalEntryFormValues;
  error?: string | null;
  existingPhotoCount?: number;
  formId: string;
  plants: Array<{ id: string; name: string; areaName: string }>;
  submitLabel: string;
};

export function JournalEntryForm({
  areas,
  cancelTo,
  defaultValues,
  error,
  existingPhotoCount = 0,
  formId,
  plants,
  submitLabel,
}: JournalEntryFormProps) {
  return (
    <Form className="space-y-4" encType="multipart/form-data" id={formId} method="post">
      <input name="intent" type="hidden" value="save" />
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select defaultValue={defaultValues.status} id="status" name="status" required>
            {journalEntryStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="performedAt">Date</Label>
          <Input
            defaultValue={defaultValues.performedAt}
            id="performedAt"
            name="performedAt"
            required
            type="date"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plantId">Plant</Label>
          <Select defaultValue={defaultValues.plantId} id="plantId" name="plantId">
            <option value="">None</option>
            {plants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name} ({plant.areaName})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="areaId">Area</Label>
          <Select defaultValue={defaultValues.areaId} id="areaId" name="areaId">
            <option value="">None</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="taskType">Task type</Label>
          <Input defaultValue={defaultValues.taskType} id="taskType" name="taskType" />
        </div>
      </div>

      {defaultValues.careRuleId ? (
        <input name="careRuleId" type="hidden" value={defaultValues.careRuleId} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={defaultValues.notes} id="notes" name="notes" rows={4} />
      </div>

      <JournalPhotoFields existingCount={existingPhotoCount} formId={formId} />

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link to={cancelTo}>Cancel</Link>
        </Button>
      </div>
    </Form>
  );
}
