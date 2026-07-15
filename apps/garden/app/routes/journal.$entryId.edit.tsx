import { useId } from "react";
import { Link, redirect, useActionData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { JournalEntryForm } from "~/components/journal/journal-entry-form";
import { JournalEntryPhotos } from "~/components/journal/journal-entry-photos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { journalEntryStatuses } from "~/db/schema";
import { getGardenEnv } from "~/lib/context.server";
import { formatDateInput } from "~/lib/dates";
import { parseJournalFormData, parsePhotoUploads } from "~/lib/entity-forms.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { parsePhotoRole } from "~/lib/photos.server";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/journal.$entryId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit journal entry · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [entry, plants, areas, photos] = await Promise.all([
    garden.journal.get(params.entryId),
    garden.plants.list(),
    garden.areas.list(),
    garden.photos.listForEntry(params.entryId),
  ]);

  if (!entry) {
    throw new Response("Journal entry not found", { status: 404 });
  }

  return { householdId: params.householdId, entry, plants, areas, photos };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "delete") {
    const deleted = await garden.journal.remove(params.entryId);
    if (!deleted) {
      return { error: "Journal entry not found." };
    }
    throw redirect(householdPath(params.householdId, "journal"));
  }

  if (intent === "delete-photo") {
    const photoId = getString(formData, "photoId");
    const deleted = await garden.photos.remove(photoId);
    if (!deleted) {
      return { error: "Photo not found." };
    }
    throw redirect(householdPath(params.householdId, `journal/${params.entryId}/edit`));
  }

  if (intent === "update-photo") {
    const photoId = getString(formData, "photoId");
    const caption = getOptionalString(formData, "caption") ?? null;
    const role = parsePhotoRole(getString(formData, "role"));

    const photo = await garden.photos.get(photoId);
    if (!photo || photo.journalEntryId !== params.entryId) {
      return { error: "Photo not found." };
    }

    const captionUpdated = await garden.photos.updateCaption(photoId, caption);
    if (!captionUpdated) {
      return { error: "Photo not found." };
    }

    await garden.photos.updateRole(photoId, role);
    throw redirect(householdPath(params.householdId, `journal/${params.entryId}/edit`));
  }

  const data = parseJournalFormData(formData);
  if (!data.performedAt) {
    return { error: "Enter a valid date." };
  }

  if (!journalEntryStatuses.includes(data.status as (typeof journalEntryStatuses)[number])) {
    return { error: "Choose a valid status." };
  }

  try {
    const updated = await garden.journal.update(params.entryId, {
      plantId: data.plantId,
      areaId: data.areaId,
      careRuleId: data.careRuleId,
      taskType: data.taskType,
      status: data.status as (typeof journalEntryStatuses)[number],
      notes: data.notes,
      performedAt: data.performedAt,
    });
    if (!updated) {
      return { error: "Journal entry not found." };
    }

    const uploads = parsePhotoUploads(formData);
    if (uploads.length > 0) {
      await garden.photos.upload(params.entryId, uploads);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update journal entry.",
    };
  }

  throw redirect(householdPath(params.householdId, `journal/${params.entryId}/edit`));
}

export default function EditJournalEntry({ loaderData }: Route.ComponentProps) {
  const { householdId, entry, plants, areas, photos } = loaderData;
  const actionData = useActionData<typeof action>();
  const formId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "journal")}>
            Journal
          </Link>{" "}
          / Edit entry
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Edit journal entry</h2>
      </div>

      {photos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>Add captions and before/after labels to your photos.</CardDescription>
          </CardHeader>
          <CardContent>
            <JournalEntryPhotos householdId={householdId} photos={photos} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Entry details</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalEntryForm
            areas={areas}
            cancelTo={householdPath(householdId, "journal")}
            defaultValues={{
              status: entry.status,
              performedAt: formatDateInput(entry.performedAt),
              plantId: entry.plantId ?? "",
              areaId: entry.areaId ?? "",
              careRuleId: entry.careRuleId ?? "",
              taskType: entry.taskType ?? "",
              notes: entry.notes ?? "",
            }}
            error={actionData?.error}
            existingPhotoCount={photos.length}
            formId={formId}
            plants={plants}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete entry</CardTitle>
          <CardDescription>
            Removes this journal entry and its photos from your garden history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteForm confirmMessage="Delete this journal entry? This cannot be undone." />
        </CardContent>
      </Card>
    </div>
  );
}
