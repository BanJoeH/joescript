import {
  PhotoLightboxMoreTrigger,
  PhotoLightboxProvider,
  PhotoLightboxTrigger,
} from "~/components/journal/journal-photo-lightbox";
import { photoPath } from "~/lib/household-path";
import type { PhotoRecord } from "~/services/photos.service";

type JournalPhotoGalleryProps = {
  householdId: string;
  photos: PhotoRecord[];
  showRoles?: boolean;
};

function PhotoGrid({
  householdId,
  photos,
  title,
}: {
  householdId: string;
  photos: PhotoRecord[];
  title?: string;
}) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {photos.map((photo) => (
          <div key={photo.id} className="space-y-1">
            <PhotoLightboxTrigger photo={photo}>
              <img
                alt={photo.caption ?? ""}
                className="aspect-4/3 w-full object-cover transition-opacity hover:opacity-90"
                loading="lazy"
                src={photoPath(householdId, photo.id)}
                title={photo.caption ?? undefined}
              />
            </PhotoLightboxTrigger>
            {photo.caption ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">{photo.caption}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function JournalPhotoGallery({
  householdId,
  photos,
  showRoles = false,
}: JournalPhotoGalleryProps) {
  if (photos.length === 0) {
    return null;
  }

  const content = !showRoles ? (
    <PhotoGrid householdId={householdId} photos={photos} />
  ) : (
    (() => {
      const beforePhotos = photos.filter((photo) => photo.role === "before");
      const afterPhotos = photos.filter((photo) => photo.role === "after");
      const generalPhotos = photos.filter((photo) => photo.role === "general");

      return (
        <div className="space-y-4">
          <PhotoGrid householdId={householdId} photos={generalPhotos} />
          {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <PhotoGrid householdId={householdId} photos={beforePhotos} title="Before" />
              <PhotoGrid householdId={householdId} photos={afterPhotos} title="After" />
            </div>
          )}
        </div>
      );
    })()
  );

  return (
    <PhotoLightboxProvider householdId={householdId} photos={photos}>
      {content}
    </PhotoLightboxProvider>
  );
}

export function JournalPhotoThumbnails({
  householdId,
  photos,
  limit = 3,
}: {
  householdId: string;
  photos: PhotoRecord[];
  limit?: number;
}) {
  if (photos.length === 0) {
    return null;
  }

  const visible = photos.slice(0, limit);
  const remaining = photos.length - visible.length;

  return (
    <PhotoLightboxProvider householdId={householdId} photos={photos}>
      <div className="flex flex-wrap items-center gap-2">
        {visible.map((photo) => (
          <PhotoLightboxTrigger key={photo.id} photo={photo} className="size-16 shrink-0">
            <img
              alt={photo.caption ?? ""}
              className="size-16 rounded-md border object-cover transition-opacity hover:opacity-90"
              loading="lazy"
              src={photoPath(householdId, photo.id)}
              title={photo.caption ?? undefined}
            />
          </PhotoLightboxTrigger>
        ))}
        {remaining > 0 ? (
          <PhotoLightboxMoreTrigger atIndex={limit}>+{remaining} more</PhotoLightboxMoreTrigger>
        ) : null}
      </div>
    </PhotoLightboxProvider>
  );
}
