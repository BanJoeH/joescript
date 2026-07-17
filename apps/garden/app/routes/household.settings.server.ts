import { redirect } from "react-router";

import { getGardenEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/household.settings";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden, householdId } = await requireGardenService(
    request,
    getGardenEnv(),
    params.householdId,
  );
  const [household, members] = await Promise.all([
    garden.households.get(householdId),
    garden.households.listMembers(householdId),
  ]);

  if (!household) {
    throw new Response("Household not found", { status: 404 });
  }

  return { household, members, householdId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden, session, householdId } = await requireGardenService(
    request,
    getGardenEnv(),
    params.householdId,
  );
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "update") {
    try {
      await garden.households.update(householdId, { name: getString(formData, "name") });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update household.",
      };
    }
    throw redirect(householdPath(householdId, "settings/household"));
  }

  if (intent === "add-member") {
    try {
      await garden.households.addMember(householdId, {
        email: getString(formData, "email"),
      });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not add member.",
      };
    }
    throw redirect(householdPath(householdId, "settings/household"));
  }

  if (intent === "remove-member") {
    const membershipId = getString(formData, "membershipId");
    try {
      const members = await garden.households.listMembers(householdId);
      const target = members.find((member) => member.membershipId === membershipId);
      await garden.households.removeMember(householdId, membershipId);
      if (target?.userId === session.user.id) {
        throw redirect("/households");
      }
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      return {
        error: error instanceof Error ? error.message : "Could not remove member.",
      };
    }
    throw redirect(householdPath(householdId, "settings/household"));
  }

  if (intent === "delete") {
    try {
      const deleted = await garden.households.remove(householdId);
      if (!deleted) {
        return { error: "Household not found." };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not delete household.",
      };
    }
    throw redirect("/households");
  }

  return { error: "Unknown action." };
}
