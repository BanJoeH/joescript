import { ImagePlus, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { Button, buttonVariants } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { pantryPath } from "~/lib/pantry-path";
import { MAX_PHOTOS_PER_IMPORT } from "~/lib/photos";
import { resizeImageFiles } from "~/lib/resize-image";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.recipes.import-photos";

export { action, loader } from "./pantry.recipes.import-photos.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Import recipe photos · Pantri" }];
}

type StagingPhoto = {
  id: string;
  previewUrl: string;
  name: string;
};

function StatusBanner({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent";
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        tone === "accent"
          ? "border-primary/20 bg-primary/5 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
      role="status"
    >
      <Loader2 className="size-4 shrink-0 animate-spin" />
      {children}
    </p>
  );
}

export default function ImportPhotosPage() {
  const { pendingPhotos, pantryId } =
    useLoaderData<typeof import("./pantry.recipes.import-photos.server").loader>();
  const actionData = useActionData<typeof import("./pantry.recipes.import-photos.server").action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const inputId = useId();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [staging, setStaging] = useState<StagingPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const intent = navigation.formData?.get("intent");
  const submitting = navigation.state !== "idle";
  const uploading = preparing || (submitting && intent === "upload");
  const extracting = submitting && intent === "extract";
  const removing = submitting && intent === "remove-photo";
  const removingPhotoId = removing ? String(navigation.formData?.get("photoId") ?? "") : null;
  const busy = preparing || submitting;

  const stagingRef = useRef(staging);
  stagingRef.current = staging;
  const clearStagingAfterUploadRef = useRef(false);

  useEffect(() => {
    if (navigation.state !== "idle" || !clearStagingAfterUploadRef.current) return;
    clearStagingAfterUploadRef.current = false;
    setPreparing(false);
    setStaging((current) => {
      for (const photo of current) URL.revokeObjectURL(photo.previewUrl);
      return [];
    });
  }, [navigation.state]);

  useEffect(() => {
    return () => {
      for (const photo of stagingRef.current) URL.revokeObjectURL(photo.previewUrl);
    };
  }, []);

  async function uploadFiles(files: File[]) {
    setUploadError(null);

    const usable = files.filter((file) => file.size > 0);
    if (usable.length === 0) {
      setUploadError("Choose at least one photo to upload.");
      return;
    }

    if (pendingPhotos.length + usable.length > MAX_PHOTOS_PER_IMPORT) {
      setUploadError(`At most ${MAX_PHOTOS_PER_IMPORT} photos. Remove some first.`);
      return;
    }

    setPreparing(true);
    const nextStaging: StagingPhoto[] = usable.map((file, index) => ({
      id: `${file.name}-${Date.now()}-${index}`,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));
    setStaging(nextStaging);

    try {
      const resized = await resizeImageFiles(usable);
      const formData = new FormData();
      formData.set("intent", "upload");
      for (const { file } of resized) {
        formData.append("photos", file);
      }
      clearStagingAfterUploadRef.current = true;
      submit(formData, { method: "post", encType: "multipart/form-data" });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not prepare photos.");
      setStaging((current) => {
        for (const photo of current) URL.revokeObjectURL(photo.previewUrl);
        return [];
      });
      setPreparing(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length > 0) void uploadFiles(files);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    if (busy) return;
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
    if (files.length > 0) void uploadFiles(files);
  }

  const slotsLeft = Math.max(0, MAX_PHOTOS_PER_IMPORT - pendingPhotos.length);
  const errorMessage = uploadError ?? actionData?.error ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={
          <>
            <Link className="hover:underline" to={pantryPath(pantryId, "recipes")}>
              Recipes
            </Link>{" "}
            / Import from photos
          </>
        }
        title="Import from photos"
      />

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {preparing ? (
        <StatusBanner tone="accent">
          Preparing {staging.length || "your"} photo{staging.length === 1 ? "" : "s"}…
        </StatusBanner>
      ) : null}
      {submitting && intent === "upload" ? (
        <StatusBanner tone="accent">Uploading photos…</StatusBanner>
      ) : null}
      {extracting ? <StatusBanner tone="accent">Reading recipe…</StatusBanner> : null}
      {removing ? <StatusBanner>Removing photo…</StatusBanner> : null}

      <Card>
        <CardHeader>
          <CardTitle>Upload photos</CardTitle>
          <CardDescription>
            Photos of a recipe card, cookbook page, or screenshot. Large images are resized
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label
            className={cn(
              "relative block rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20",
              busy || slotsLeft === 0 ? "pointer-events-none opacity-60" : "cursor-pointer",
            )}
            htmlFor={inputId}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setDragOver(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy || slotsLeft === 0}
              id={inputId}
              multiple
              onChange={handleInputChange}
              type="file"
            />
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full border bg-background">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {slotsLeft === 0
                    ? "Photo limit reached"
                    : dragOver
                      ? "Drop to upload"
                      : "Drag photos here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WebP · up to {slotsLeft} more · max {MAX_PHOTOS_PER_IMPORT} total
                </p>
              </div>
              <span
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "pointer-events-none",
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus />
                    Choose photos
                  </>
                )}
              </span>
            </div>
          </label>

          {staging.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {staging.map((photo) => (
                  <li
                    className="relative overflow-hidden rounded-lg border bg-muted/30"
                    key={photo.id}
                  >
                    <img
                      alt=""
                      className="aspect-3/4 w-full object-cover opacity-70"
                      src={photo.previewUrl}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                      <Loader2 className="size-5 animate-spin text-foreground" />
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                      {photo.name}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pendingPhotos.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {pendingPhotos.length} photo{pendingPhotos.length === 1 ? "" : "s"} ready
                </p>
                {extracting ? (
                  <p className="text-xs text-muted-foreground">Creating draft…</p>
                ) : null}
              </div>

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {pendingPhotos.map((photo, index) => {
                  const isRemoving = removingPhotoId === photo.id;
                  return (
                    <li
                      className={cn(
                        "group relative overflow-hidden rounded-lg border bg-muted/20",
                        isRemoving && "opacity-50",
                      )}
                      key={photo.id}
                    >
                      <img
                        // biome-ignore lint/a11y/noRedundantAlt: <Difficult to describe>
                        alt={`Recipe photo ${index + 1}`}
                        className="aspect-3/4 w-full object-cover"
                        src={pantryPath(pantryId, `photos/${photo.id}`)}
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-black/55 to-transparent px-2 pb-2 pt-8">
                        <span className="text-xs font-medium text-white">Page {index + 1}</span>
                        <Form method="post">
                          <input name="intent" type="hidden" value="remove-photo" />
                          <input name="photoId" type="hidden" value={photo.id} />
                          <Button
                            aria-label={`Remove photo ${index + 1}`}
                            className="size-8 bg-background/90 text-foreground hover:bg-background"
                            disabled={busy}
                            size="icon"
                            type="submit"
                            variant="ghost"
                          >
                            {isRemoving ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </Form>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Form method="post">
                <input name="intent" type="hidden" value="extract" />
                <Button className="w-full sm:w-auto" disabled={busy} type="submit">
                  {extracting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Creating draft…
                    </>
                  ) : (
                    <>
                      <Sparkles />
                      Create draft
                    </>
                  )}
                </Button>
              </Form>
            </div>
          ) : staging.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
