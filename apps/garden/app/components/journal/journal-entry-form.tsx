import { Form } from "react-router";
import { JournalPhotoFields } from "~/components/journal/journal-photo-fields";
import { Link } from "~/components/link";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import type { JournalEntryStatus } from "~/db/schema";
import { journalEntryStatuses } from "~/db/schema";
import { journalStatusHint, journalStatusLabels } from "~/lib/journal-labels";

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
  notesPlaceholder?: string;
  plants: Array<{ id: string; name: string; areaName: string }>;
  starter?: boolean;
  submitLabel: string;
};

export function JournalEntryForm({
  areas,
  cancelTo,
  defaultValues,
  error,
  existingPhotoCount = 0,
  formId,
  notesPlaceholder,
  plants,
  starter = false,
  submitLabel,
}: JournalEntryFormProps) {
  return (
    <Form className="space-y-4" encType="multipart/form-data" id={formId} method="post">
      <input name="intent" type="hidden" value="save" />
      {starter ? <input name="starter" type="hidden" value="1" /> : null}
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
                {journalStatusLabels[status as JournalEntryStatus]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{journalStatusHint}</p>
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
            <option value="">Not linked to a plant</option>
            {plants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name} ({plant.areaName})
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Link this entry to a plant to show it on the plant page.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="areaId">Area</Label>
          <Select defaultValue={defaultValues.areaId} id="areaId" name="areaId">
            <option value="">Not linked to an area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="taskType">Task</Label>
          <Input
            defaultValue={defaultValues.taskType}
            id="taskType"
            name="taskType"
            placeholder="e.g. Prune, Feed, Mulch"
          />
          <p className="text-xs text-muted-foreground">
            Name the garden work you did or noticed. Leave blank for a general note.
          </p>
        </div>
      </div>

      {defaultValues.careRuleId ? (
        <input name="careRuleId" type="hidden" value={defaultValues.careRuleId} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          defaultValue={defaultValues.notes}
          id="notes"
          name="notes"
          placeholder={notesPlaceholder}
          rows={4}
        />
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
