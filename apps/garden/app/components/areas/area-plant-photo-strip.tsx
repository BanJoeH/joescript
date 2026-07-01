import { Link } from "react-router";

import {
  PhotoLightboxProvider,
  PhotoLightboxTrigger,
} from "~/components/journal/journal-photo-lightbox";
import { formatDate } from "~/lib/dates";
import { householdPath, photoPath } from "~/lib/household-path";
import type { PlantLatestPhoto } from "~/services/photos.service";

type AreaPlantPhotoStripProps = {
  householdId: string;
  photos: PlantLatestPhoto[];
};

export function AreaPlantPhotoStrip({ householdId, photos }: AreaPlantPhotoStripProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <PhotoLightboxProvider householdId={householdId} photos={photos}>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <div key={photo.plantId} className="w-28 shrink-0 space-y-1">
            <PhotoLightboxTrigger photo={photo}>
              <img
                alt={photo.caption ?? photo.plantName}
                className="aspect-square w-full rounded-md border object-cover transition-opacity hover:opacity-90"
                loading="lazy"
                src={photoPath(householdId, photo.id)}
              />
            </PhotoLightboxTrigger>
            <Link
              className="block truncate text-xs font-medium hover:underline"
              to={householdPath(householdId, `plants/${photo.plantId}`)}
            >
              {photo.plantName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{formatDate(photo.performedAt)}</p>
          </div>
        ))}
      </div>
    </PhotoLightboxProvider>
  );
}
