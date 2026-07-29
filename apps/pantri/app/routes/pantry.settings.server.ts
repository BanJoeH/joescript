import { redirect } from "react-router";

import { getPantriEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/pantry.settings";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, session, pantryId } = await requirePantriService(
    request,
    getPantriEnv(),
    params.pantryId,
  );
  const [pantry, members] = await Promise.all([
    pantri.pantries.get(pantryId),
    pantri.pantries.listMembers(pantryId),
  ]);

  if (!pantry) {
    throw new Response("Pantry not found", { status: 404 });
  }

  return {
    pantry,
    members,
    pantryId,
    currentUserId: session.user.id,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, session, pantryId } = await requirePantriService(
    request,
    getPantriEnv(),
    params.pantryId,
  );
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "update") {
    try {
      await pantri.pantries.update(pantryId, { name: getString(formData, "name") });
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update pantry.",
      };
    }
    throw redirect(pantryPath(pantryId, "settings/pantry"));
  }

  if (intent === "add-member") {
    try {
      const result = await pantri.pantries.addMember(pantryId, {
        email: getString(formData, "email"),
      });
      return {
        inviteFlash: { email: result.email, status: result.status },
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not add member.",
      };
    }
  }

  if (intent === "remove-member" || intent === "cancel-invite") {
    const membershipId = getString(formData, "membershipId");
    try {
      const members = await pantri.pantries.listMembers(pantryId);
      const target = members.find((member) => member.membershipId === membershipId);
      await pantri.pantries.removeMember(pantryId, membershipId);
      if (target?.userId === session.user.id) {
        throw redirect("/pantries");
      }
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      return {
        error: error instanceof Error ? error.message : "Could not remove member.",
      };
    }
    throw redirect(pantryPath(pantryId, "settings/pantry"));
  }

  if (intent === "delete") {
    const confirm = getString(formData, "confirm");
    if (confirm !== "DELETE") {
      return { error: "Type DELETE to confirm pantry deletion." };
    }
    try {
      const deleted = await pantri.pantries.remove(pantryId);
      if (!deleted) {
        return { error: "Pantry not found." };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not delete pantry.",
      };
    }
    throw redirect("/pantries");
  }

  return { error: "Unknown action." };
}
