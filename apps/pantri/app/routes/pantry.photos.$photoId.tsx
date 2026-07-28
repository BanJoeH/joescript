import { getPantriEnv } from "~/lib/context.server";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/pantry.photos.$photoId";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const object = await pantri.photos.getObject(params.photoId);

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
