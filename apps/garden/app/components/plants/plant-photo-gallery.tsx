import { Link } from "react-router";

import {
  PhotoLightboxProvider,
  PhotoLightboxTrigger,
} from "~/components/journal/journal-photo-lightbox";
import { formatDate } from "~/lib/dates";
import { householdPath, photoPath } from "~/lib/household-path";
import type { PlantPhotoRecord } from "~/services/photos.service";

type PlantPhotoGalleryProps = {
  householdId: string;
  photos: PlantPhotoRecord[];
  limit?: number;
  seeMoreTo?: string;
};

export function PlantPhotoGallery({
  householdId,
  photos,
  limit,
  seeMoreTo,
}: PlantPhotoGalleryProps) {
  if (photos.length === 0) {
    return null;
  }

  const visible = limit ? photos.slice(0, limit) : photos;
  const remaining = photos.length - visible.length;

  return (
    <PhotoLightboxProvider householdId={householdId} photos={visible}>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((photo) => (
          <div key={photo.id} className="space-y-1.5">
            <PhotoLightboxTrigger photo={photo}>
              <img
                alt={photo.caption ?? ""}
                className="aspect-4/3 w-full rounded-md border object-cover transition-opacity hover:opacity-90"
                loading="lazy"
                src={photoPath(householdId, photo.id)}
              />
            </PhotoLightboxTrigger>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              {photo.journalEntryId ? (
                <Link
                  className="font-medium text-foreground hover:underline"
                  to={householdPath(householdId, `journal/${photo.journalEntryId}/edit`)}
                >
                  {photo.taskType ?? "Note"} · {formatDate(photo.performedAt)}
                </Link>
              ) : (
                <p className="font-medium text-foreground">
                  {photo.taskType ?? "Note"} · {formatDate(photo.performedAt)}
                </p>
              )}
              {photo.role !== "general" ? (
                <p className="capitalize">{photo.role}</p>
              ) : null}
              {photo.caption ? <p className="line-clamp-2">{photo.caption}</p> : null}
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && seeMoreTo ? (
        <p className="pt-2">
          <Link className="text-sm text-muted-foreground hover:underline" to={seeMoreTo}>
            See {remaining} more
          </Link>
        </p>
      ) : null}
    </PhotoLightboxProvider>
  );
}
