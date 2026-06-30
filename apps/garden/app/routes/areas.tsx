import { AreaList } from "~/components/areas/area-list";
import { AddAreaForm } from "~/components/areas/add-area-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/areas";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Areas · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const areas = await garden.areas.list();

  return { areas };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "reorder") {
    try {
      const order = JSON.parse(getString(formData, "order")) as string[];
      await garden.areas.reorder(order);
      return { ok: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not reorder areas.",
      };
    }
  }

  if (intent === "update") {
    try {
      const updated = await garden.areas.update(getString(formData, "id"), {
        name: getString(formData, "name"),
      });
      if (!updated) {
        return { error: "Area not found." };
      }
      return { updated: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update area.",
      };
    }
  }

  if (intent === "delete") {
    try {
      const deleted = await garden.areas.remove(getString(formData, "id"));
      if (!deleted) {
        return { error: "Area not found." };
      }
      return { deleted: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not delete area.",
      };
    }
  }

  try {
    await garden.areas.create({
      name: getString(formData, "name"),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create area.",
    };
  }

  return { created: true as const };
}

export default function Areas({ loaderData }: Route.ComponentProps) {
  const { areas } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Areas</h2>
        <p className="text-sm text-muted-foreground">
          Physical parts of the garden — patio, front border, veg patch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add area</CardTitle>
          <CardDescription>Areas group plants and journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddAreaForm />
        </CardContent>
      </Card>

      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No areas yet.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Use the icons to edit or delete.
          </p>
          <AreaList areas={areas} />
        </div>
      )}
    </div>
  );
}
