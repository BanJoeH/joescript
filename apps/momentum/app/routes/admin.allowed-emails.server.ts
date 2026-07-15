import { redirect } from "react-router";

import { requireMomentumAdmin } from "~/lib/admin.server";
import { getMomentumEnv } from "~/lib/context.server";
import { getRequestTimeZone } from "~/lib/dates";
import { getString } from "~/lib/forms.server";
import { createAllowedEmailsService } from "~/services/allowed-emails.service";

import type { Route } from "./+types/admin.allowed-emails";

export async function loader({ request }: Route.LoaderArgs) {
  const { db } = await requireMomentumAdmin(request, getMomentumEnv());
  const allowedEmails = createAllowedEmailsService({ db });

  return {
    emails: await allowedEmails.list(),
    timeZone: getRequestTimeZone(request),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { db } = await requireMomentumAdmin(request, getMomentumEnv());
  const allowedEmails = createAllowedEmailsService({ db });
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "add") {
    try {
      await allowedEmails.add({ email: getString(formData, "email") });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not add email.",
      };
    }
    throw redirect("/admin/allowed-emails");
  }

  if (intent === "delete") {
    try {
      const deleted = await allowedEmails.remove(getString(formData, "id"));
      if (!deleted) {
        return { error: "Email not found." };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not remove email.",
      };
    }
    throw redirect("/admin/allowed-emails");
  }

  return { error: "Unknown action." };
}
