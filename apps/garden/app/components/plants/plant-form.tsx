import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { Form, Link } from "react-router";

import { PlantSpeciesSearchDialog } from "~/components/plants/plant-species-search-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { formatDateInput } from "~/lib/dates";
import { cn } from "~/lib/utils";
import type { PlantSpeciesSuggestion } from "~/services/plant-lookup.service";

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
  plantLookupEnabled?: boolean;
  quickAdd?: boolean;
  showRemovedAt?: boolean;
  speciesSearchUrl?: string;
  submitLabel: string;
};

export function PlantForm({
  areas,
  cancelTo,
  defaultValues,
  error,
  plantLookupEnabled = false,
  quickAdd = false,
  showRemovedAt = true,
  speciesSearchUrl,
  submitLabel,
}: PlantFormProps) {
  const [speciesDialogOpen, setSpeciesDialogOpen] = useState(false);
  const [name, setName] = useState(defaultValues.name);
  const [areaId, setAreaId] = useState(defaultValues.areaId);
  const [latinName, setLatinName] = useState(defaultValues.latinName);
  const [cultivar, setCultivar] = useState(defaultValues.cultivar);
  const [detailsOpen, setDetailsOpen] = useState(
    !quickAdd ||
      Boolean(
        defaultValues.latinName ||
          defaultValues.cultivar ||
          defaultValues.plantedAt ||
          defaultValues.notes,
      ),
  );

  function handleSpeciesSelect(suggestion: PlantSpeciesSuggestion) {
    const displayName = suggestion.commonName || suggestion.latinName;
    if (displayName) {
      setName(displayName);
    }
    if (suggestion.latinName) {
      setLatinName(suggestion.latinName);
      setDetailsOpen(true);
    }
    if (suggestion.cultivar) {
      setCultivar(suggestion.cultivar);
      setDetailsOpen(true);
    }
    setSpeciesDialogOpen(false);
  }

  const optionalFields = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="latinName">Latin name</Label>
          <Input
            id="latinName"
            name="latinName"
            onChange={(event) => setLatinName(event.target.value)}
            value={latinName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cultivar">Cultivar</Label>
          <Input
            id="cultivar"
            name="cultivar"
            onChange={(event) => setCultivar(event.target.value)}
            value={cultivar}
          />
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
        {showRemovedAt ? (
          <div className="space-y-2">
            <Label htmlFor="removedAt">Removed</Label>
            <Input
              defaultValue={defaultValues.removedAt}
              id="removedAt"
              name="removedAt"
              type="date"
            />
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={defaultValues.notes} id="notes" name="notes" rows={3} />
      </div>
    </>
  );

  return (
    <>
      <Form className="space-y-4" method="post">
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {speciesSearchUrl ? (
          <div className="flex justify-end">
            <Button
              onClick={() => setSpeciesDialogOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Search />
              Look up species
            </Button>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              autoFocus={quickAdd}
              id="name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder={quickAdd ? "e.g. Patio lavender" : undefined}
              required
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="areaId">Area</Label>
            <Select
              id="areaId"
              name="areaId"
              onChange={(event) => setAreaId(event.target.value)}
              required
              value={areaId}
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {quickAdd ? (
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
            <div className="mt-4 space-y-4">{optionalFields}</div>
          </details>
        ) : (
          optionalFields
        )}
        <div className="flex flex-wrap gap-3">
          <Button name="intent" type="submit" value="save">
            {submitLabel}
          </Button>
          <Button asChild variant="outline">
            <Link to={cancelTo}>Cancel</Link>
          </Button>
        </div>
      </Form>
      {speciesSearchUrl ? (
        <PlantSpeciesSearchDialog
          enabled={plantLookupEnabled}
          onOpenChange={setSpeciesDialogOpen}
          onSelect={handleSpeciesSelect}
          open={speciesDialogOpen}
          searchUrl={speciesSearchUrl}
        />
      ) : null}
    </>
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
