import { useEffect, useId, useState } from "react";
import { useSubmit } from "react-router";

import { Label } from "~/components/ui/label";
import { resizeImageFile } from "~/lib/resize-image";

type SelectedPhoto = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type PlantPhotoFieldProps = {
  currentPhotoUrl?: string | null;
  formId: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export function PlantPhotoField({ currentPhotoUrl, formId, onDirtyChange }: PlantPhotoFieldProps) {
  const inputId = useId();
  const submit = useSubmit();
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    onDirtyChange?.(Boolean(selectedPhoto) || removeCurrent);
  }, [onDirtyChange, removeCurrent, selectedPhoto]);

  useEffect(() => {
    return () => {
      if (selectedPhoto) {
        URL.revokeObjectURL(selectedPhoto.previewUrl);
      }
    };
  }, [selectedPhoto]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setIsResizing(true);

    try {
      const resized = await resizeImageFile(file);
      setSelectedPhoto((current) => {
        if (current) {
          URL.revokeObjectURL(current.previewUrl);
        }
        return {
          ...resized,
          previewUrl: URL.createObjectURL(resized.file),
        };
      });
      setRemoveCurrent(false);
    } catch (resizeError) {
      event.target.value = "";
      setError(
        resizeError instanceof Error ? resizeError.message : "Could not prepare selected photo.",
      );
    } finally {
      setIsResizing(false);
    }
  }

  function clearSelectedPhoto() {
    setSelectedPhoto((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) {
      return;
    }

    function handleSubmit(event: SubmitEvent) {
      if (!selectedPhoto) {
        return;
      }

      event.preventDefault();
      const formData = new FormData(form as HTMLFormElement);
      const submitter = event.submitter;
      if (submitter instanceof HTMLButtonElement && submitter.name) {
        formData.set(submitter.name, submitter.value);
      }

      formData.set("plantPhoto", selectedPhoto.file, selectedPhoto.file.name);
      formData.set("plantPhotoWidth", String(selectedPhoto.width));
      formData.set("plantPhotoHeight", String(selectedPhoto.height));
      submit(formData, { method: "post", encType: "multipart/form-data" });
    }

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [formId, selectedPhoto, submit]);

  const previewUrl = selectedPhoto?.previewUrl ?? (!removeCurrent ? currentPhotoUrl : null);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={inputId}>Photo</Label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
          disabled={isResizing}
          id={inputId}
          name="plantPhoto"
          onChange={handleFileChange}
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          One JPEG, PNG, or WebP image. Large images are resized automatically.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {isResizing ? <p className="text-sm text-muted-foreground">Preparing photo…</p> : null}

      {previewUrl ? (
        <div className="max-w-xs space-y-2">
          <img
            alt=""
            className="aspect-4/3 w-full rounded-md border object-cover"
            src={previewUrl}
          />
          <button
            className="text-sm text-destructive underline-offset-4 hover:underline"
            onClick={() => {
              if (selectedPhoto) {
                clearSelectedPhoto();
              } else {
                setRemoveCurrent(true);
              }
            }}
            type="button"
          >
            Remove photo
          </button>
        </div>
      ) : null}

      {removeCurrent ? <input name="removePlantPhoto" type="hidden" value="1" /> : null}
    </div>
  );
}
