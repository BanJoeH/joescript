import { Form, Link, redirect, useActionData } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { getGardenEnv } from "~/lib/context.server";
import { parsePlantCreateFormData } from "~/lib/entity-forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plants · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [plants, areas] = await Promise.all([garden.plants.list(), garden.areas.list()]);

  return { householdId: params.householdId, plants, areas };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();

  try {
    await garden.plants.create(parsePlantCreateFormData(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create plant.",
    };
  }

  throw redirect(householdPath(params.householdId, "plants"));
}

export default function Plants({ loaderData }: Route.ComponentProps) {
  const { householdId, plants, areas } = loaderData;
  const actionData = useActionData<typeof action>();
  const plantsByArea = areas.map((area) => ({
    area,
    plants: plants.filter((plant) => plant.areaId === area.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Plants</h2>
          <p className="text-sm text-muted-foreground">
            Every plant in your garden, grouped by area.
          </p>
        </div>
      </div>

      {areas.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Create an{" "}
            <Link className="text-primary underline-offset-4 hover:underline" to={householdPath(householdId, "areas")}>
              area
            </Link>{" "}
            before adding plants.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Add plant</CardTitle>
            <CardDescription>Name the plant as you think of it in the garden.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form className="space-y-4" method="post">
              {actionData?.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {actionData.error}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Patio lavender" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaId">Area</Label>
                  <Select defaultValue={areas[0]?.id} id="areaId" name="areaId" required>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="latinName">Latin name</Label>
                  <Input id="latinName" name="latinName" placeholder="Lavandula angustifolia" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cultivar">Cultivar</Label>
                  <Input id="cultivar" name="cultivar" placeholder="Hidcote" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plantedAt">Planted</Label>
                  <Input id="plantedAt" name="plantedAt" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Optional notes" rows={3} />
              </div>
              <Button type="submit">Add plant</Button>
            </Form>
          </CardContent>
        </Card>
      )}

      {plants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No plants yet.</p>
      ) : (
        <div className="space-y-6">
          {plantsByArea.map(({ area, plants: areaPlants }) =>
            areaPlants.length === 0 ? null : (
              <section key={area.id}>
                <h3 className="mb-3 text-lg font-medium">{area.name}</h3>
                <ul className="space-y-2">
                  {areaPlants.map((plant) => (
                    <li key={plant.id}>
                      <Link
                        className="block rounded-md border px-4 py-3 hover:bg-accent/50"
                        to={householdPath(householdId, `plants/${plant.id}`)}
                      >
                        <span className="font-medium">{plant.name}</span>
                        {plant.latinName ? (
                          <span className="block text-sm italic text-muted-foreground">
                            {plant.latinName}
                            {plant.cultivar ? ` '${plant.cultivar}'` : ""}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
