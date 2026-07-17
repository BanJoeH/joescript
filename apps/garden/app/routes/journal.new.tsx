import { useId } from "react";
import { redirect, useActionData, useLoaderData } from "react-router";
import { JournalEntryForm } from "~/components/journal/journal-entry-form";
import { Link } from "~/components/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { journalEntryStatuses } from "~/db/schema";
import { getGardenEnv } from "~/lib/context.server";
import { formatDateInput, parseDateInput } from "~/lib/dates";
import { parsePhotoUploads } from "~/lib/entity-forms.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/journal.new";

const STARTER_NOTES_PLACEHOLDER = "What did you notice in the garden today?";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData?.starter
        ? "Your first journal entry · Garden"
        : "Add journal entry · Garden",
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const url = new URL(request.url);
  const starter = url.searchParams.get("starter") === "1";
  const [plants, areas] = await Promise.all([garden.plants.list(), garden.areas.list()]);

  return {
    householdId: params.householdId,
    plants,
    areas,
    starter,
    defaults: {
      plantId: url.searchParams.get("plantId") ?? "",
      areaId: url.searchParams.get("areaId") ?? "",
      careRuleId: url.searchParams.get("careRuleId") ?? "",
      taskType: url.searchParams.get("taskType") ?? "",
      status: url.searchParams.get("status") ?? "note",
      performedAt: formatDateInput(new Date()),
      notes: "",
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const performedAt = parseDateInput(getString(formData, "performedAt"));
  const starter = getOptionalString(formData, "starter") === "1";

  if (!performedAt) {
    return { error: "Enter a valid date." };
  }

  const status = getString(formData, "status");
  if (!journalEntryStatuses.includes(status as (typeof journalEntryStatuses)[number])) {
    return { error: "Choose a valid status." };
  }

  try {
    const entry = await garden.journal.create({
      plantId: getOptionalString(formData, "plantId"),
      areaId: getOptionalString(formData, "areaId"),
      careRuleId: getOptionalString(formData, "careRuleId"),
      taskType: getOptionalString(formData, "taskType"),
      status: status as (typeof journalEntryStatuses)[number],
      notes: getOptionalString(formData, "notes"),
      performedAt,
    });

    if (!entry) {
      return { error: "Could not create journal entry." };
    }

    const uploads = parsePhotoUploads(formData);
    if (uploads.length > 0) {
      try {
        await garden.photos.upload(entry.id, uploads);
      } catch (uploadError) {
        return {
          error:
            uploadError instanceof Error
              ? `${uploadError.message} Entry was saved without photos. You can add them on edit.`
              : "Entry was saved, but photos could not be uploaded.",
        };
      }
    }

    const plantId = entry.plantId;
    if (starter) {
      throw redirect(householdPath(params.householdId));
    }

    throw redirect(
      plantId
        ? householdPath(params.householdId, `plants/${plantId}`)
        : householdPath(params.householdId, "journal"),
    );
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "Could not create journal entry.",
    };
  }
}

export default function NewJournalEntry() {
  const { householdId, plants, areas, defaults, starter } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const formId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "journal")}>
            Journal
          </Link>{" "}
          / Add entry
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {starter ? "Your first journal entry" : "Add journal entry"}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{starter ? "Your garden journal" : "What happened?"}</CardTitle>
          <CardDescription>
            {starter
              ? "Record what you see, note, or photograph in the garden."
              : "Record work you did, things you noticed, or tasks you skipped."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JournalEntryForm
            areas={areas}
            cancelTo={starter ? householdPath(householdId) : householdPath(householdId, "journal")}
            defaultValues={defaults}
            error={actionData?.error}
            formId={formId}
            notesPlaceholder={starter ? STARTER_NOTES_PLACEHOLDER : undefined}
            plants={plants}
            starter={starter}
            submitLabel="Save entry"
          />
        </CardContent>
      </Card>
    </div>
  );
}
