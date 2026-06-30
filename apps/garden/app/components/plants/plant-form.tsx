import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { formatDateInput } from "~/lib/dates";

export type PlantFormValues = {
  areaId: string;
  name: string;
  latinName: string;
  cultivar: string;
  notes: string;
  plantedAt: string;
  removedAt: string;
};

type PlantFormProps = {
  areas: Array<{ id: string; name: string }>;
  cancelTo: string;
  defaultValues: PlantFormValues;
  error?: string | null;
  submitLabel: string;
};

export function PlantForm({ areas, cancelTo, defaultValues, error, submitLabel }: PlantFormProps) {
  return (
    <Form className="space-y-4" method="post">
      <input name="intent" type="hidden" value="save" />
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input defaultValue={defaultValues.name} id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="areaId">Area</Label>
          <Select defaultValue={defaultValues.areaId} id="areaId" name="areaId" required>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="latinName">Latin name</Label>
          <Input defaultValue={defaultValues.latinName} id="latinName" name="latinName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cultivar">Cultivar</Label>
          <Input defaultValue={defaultValues.cultivar} id="cultivar" name="cultivar" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plantedAt">Planted</Label>
          <Input
            defaultValue={defaultValues.plantedAt}
            id="plantedAt"
            name="plantedAt"
            type="date"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="removedAt">Removed</Label>
          <Input
            defaultValue={defaultValues.removedAt}
            id="removedAt"
            name="removedAt"
            type="date"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={defaultValues.notes} id="notes" name="notes" rows={3} />
      </div>
      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link to={cancelTo}>Cancel</Link>
        </Button>
      </div>
    </Form>
  );
}

export function toPlantFormValues(plant: {
  areaId: string;
  name: string;
  latinName: string | null;
  cultivar: string | null;
  notes: string | null;
  plantedAt: Date | null;
  removedAt: Date | null;
}): PlantFormValues {
  return {
    areaId: plant.areaId,
    name: plant.name,
    latinName: plant.latinName ?? "",
    cultivar: plant.cultivar ?? "",
    notes: plant.notes ?? "",
    plantedAt: plant.plantedAt ? formatDateInput(plant.plantedAt) : "",
    removedAt: plant.removedAt ? formatDateInput(plant.removedAt) : "",
  };
}
