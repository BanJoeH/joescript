import { useEffect, useId, useState } from "react";
import { useSubmit } from "react-router";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { type PhotoRole, photoRoles } from "~/db/schema";
import { MAX_PHOTO_CAPTION_LENGTH } from "~/lib/photos";
import { resizeImageFiles } from "~/lib/resize-image";

type SelectedPhoto = {
  id: string;
  previewUrl: string;
  file: File;
  role: PhotoRole;
  caption: string;
  width: number;
  height: number;
};

type JournalPhotoFieldsProps = {
  existingCount?: number;
  formId: string;
};

const MAX_PHOTOS_PER_ENTRY = 6;

export function JournalPhotoFields({ existingCount = 0, formId }: JournalPhotoFieldsProps) {
  const inputId = useId();
  const submit = useSubmit();
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const remainingSlots = MAX_PHOTOS_PER_ENTRY - existingCount - selectedPhotos.length;

  useEffect(() => {
    return () => {
      for (const photo of selectedPhotos) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, [selectedPhotos]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (existingCount + selectedPhotos.length + files.length > MAX_PHOTOS_PER_ENTRY) {
      setError(`Each journal entry can have at most ${MAX_PHOTOS_PER_ENTRY} photos.`);
      return;
    }

    setError(null);
    setIsResizing(true);

    try {
      const resized = await resizeImageFiles(files);
      const nextPhotos = resized.map(({ file, width, height }, index) => ({
        id: `${file.name}-${Date.now()}-${index}`,
        previewUrl: URL.createObjectURL(file),
        file,
        role: "general" as PhotoRole,
        caption: "",
        width,
        height,
      }));

      setSelectedPhotos((current) => [...current, ...nextPhotos]);
    } catch (resizeError) {
      setError(
        resizeError instanceof Error ? resizeError.message : "Could not prepare selected photos.",
      );
    } finally {
      setIsResizing(false);
    }
  }

  function updateCaption(photoId: string, caption: string) {
    setSelectedPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo)),
    );
  }

  function updateRole(photoId: string, role: PhotoRole) {
    setSelectedPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, role } : photo)),
    );
  }

  function removeSelectedPhoto(photoId: string) {
    setSelectedPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return current.filter((item) => item.id !== photoId);
    });
  }

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) {
      return;
    }

    function handleSubmit(event: SubmitEvent) {
      if (selectedPhotos.length === 0) {
        return;
      }

      event.preventDefault();
      const formData = new FormData(form as HTMLFormElement);

      formData.delete("photos");
      formData.delete("photoRoles");
      formData.delete("photoCaptions");
      formData.delete("photoWidths");
      formData.delete("photoHeights");

      for (const photo of selectedPhotos) {
        formData.append("photos", photo.file, photo.file.name);
        formData.append("photoRoles", photo.role);
        formData.append("photoCaptions", photo.caption);
        formData.append("photoWidths", String(photo.width));
        formData.append("photoHeights", String(photo.height));
      }

      submit(formData, { method: "post", encType: "multipart/form-data" });
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [formId, selectedPhotos, submit]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={inputId}>Photos</Label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
          disabled={remainingSlots <= 0 || isResizing}
          id={inputId}
          multiple
          onChange={handleFileChange}
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          Add up to {remainingSlots} more photo{remainingSlots === 1 ? "" : "s"}. Large images are
          resized automatically.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isResizing ? <p className="text-sm text-muted-foreground">Preparing photos…</p> : null}

      {selectedPhotos.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {selectedPhotos.map((photo) => (
            <li key={photo.id} className="space-y-2 rounded-md border p-3">
              <img
                alt=""
                className="aspect-4/3 w-full rounded-md object-cover"
                src={photo.previewUrl}
              />
              <div className="space-y-2">
                <Label htmlFor={`${photo.id}-caption`}>Caption</Label>
                <Input
                  id={`${photo.id}-caption`}
                  maxLength={MAX_PHOTO_CAPTION_LENGTH}
                  onChange={(event) => updateCaption(photo.id, event.target.value)}
                  placeholder="Caption"
                  value={photo.caption}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${photo.id}-role`}>Label</Label>
                <Select
                  id={`${photo.id}-role`}
                  onChange={(event) => updateRole(photo.id, event.target.value as PhotoRole)}
                  value={photo.role}
                >
                  {photoRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                className="text-sm text-destructive hover:underline"
                onClick={() => removeSelectedPhoto(photo.id)}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
