import { Form } from "react-router";

import { JournalPhotoGallery } from "~/components/journal/journal-photo-gallery";
import {
  PhotoLightboxProvider,
  PhotoLightboxTrigger,
} from "~/components/journal/journal-photo-lightbox";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { photoRoles } from "~/db/schema";
import { photoPath } from "~/lib/household-path";
import { MAX_PHOTO_CAPTION_LENGTH } from "~/lib/photos";
import type { PhotoRecord } from "~/services/photos.service";

type JournalEntryPhotosProps = {
  householdId: string;
  photos: PhotoRecord[];
};

export function JournalEntryPhotos({ householdId, photos }: JournalEntryPhotosProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <PhotoLightboxProvider householdId={householdId} photos={photos}>
      <div className="space-y-4">
        <JournalPhotoGallery householdId={householdId} photos={photos} showRoles />

        <ul className="space-y-3">
          {photos.map((photo) => (
            <li key={photo.id} className="space-y-3 rounded-md border px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <PhotoLightboxTrigger photo={photo} className="size-16 shrink-0">
                    <img
                      alt=""
                      className="size-16 rounded-md border object-cover transition-opacity hover:opacity-90"
                      src={photoPath(householdId, photo.id)}
                    />
                  </PhotoLightboxTrigger>
                  <div className="text-sm">
                    <p className="font-medium capitalize">{photo.role}</p>
                    <p className="text-muted-foreground">
                      {photo.width && photo.height ? `${photo.width}×${photo.height}` : "Photo"}
                    </p>
                    {photo.caption ? (
                      <p className="mt-1 whitespace-pre-wrap">{photo.caption}</p>
                    ) : null}
                  </div>
                </div>
                <Form method="post">
                  <input name="intent" type="hidden" value="delete-photo" />
                  <input name="photoId" type="hidden" value={photo.id} />
                  <Button size="sm" type="submit" variant="ghost">
                    Remove
                  </Button>
                </Form>
              </div>

              <Form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" method="post">
                <input name="intent" type="hidden" value="update-photo" />
                <input name="photoId" type="hidden" value={photo.id} />
                <div className="space-y-2">
                  <Label htmlFor={`${photo.id}-caption`}>Caption</Label>
                  <Input
                    defaultValue={photo.caption ?? ""}
                    id={`${photo.id}-caption`}
                    maxLength={MAX_PHOTO_CAPTION_LENGTH}
                    name="caption"
                    placeholder="Caption"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${photo.id}-role`}>Label</Label>
                  <Select defaultValue={photo.role} id={`${photo.id}-role`} name="role">
                    {photoRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button size="sm" type="submit" variant="outline">
                    Save photo
                  </Button>
                </div>
              </Form>
            </li>
          ))}
        </ul>
      </div>
    </PhotoLightboxProvider>
  );
}
