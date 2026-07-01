import { getGardenEnv } from "~/lib/context.server";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/photos.$photoId";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const object = await garden.photos.getObject(params.photoId);

  if (!object?.body) {
    throw new Response("Photo not found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": object.contentType,
    "Cache-Control": "private, max-age=3600",
  });

  if (object.etag) {
    headers.set("ETag", object.etag);
  }

  return new Response(object.body, { headers });
}
