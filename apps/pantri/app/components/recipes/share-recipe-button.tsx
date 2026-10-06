import { Loader2, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";

import { ConfirmSheet } from "~/components/confirm-sheet";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { shareDialogOgImageUrl, sharedRecipeViewHref } from "~/lib/share-dialog";
import { cn } from "~/lib/utils";

type ShareActionData = {
  error?: string;
  url?: string;
  ogImageUrl?: string;
  unshared?: boolean;
};

type ShareRecipeButtonProps = {
  recipeId: string;
  recipeName: string;
  action?: string;
  isShared?: boolean;
  shareToken?: string | null;
  shareUpdatedAt?: Date | string | null;
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
};

function usePrefetchImage(url: string | null) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoaded(false);
      setFailed(false);
      return;
    }

    setLoaded(false);
    setFailed(false);

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = url;
    document.head.appendChild(link);

    const img = new Image();
    img.decoding = "async";
    img.onload = () => setLoaded(true);
    img.onerror = () => setFailed(true);
    img.src = url;

    return () => {
      link.remove();
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { loaded, failed };
}

export function ShareRecipeButton({
  recipeId,
  recipeName,
  action,
  isShared = false,
  shareToken = null,
  shareUpdatedAt = null,
  size = "sm",
  variant = "outline",
}: ShareRecipeButtonProps) {
  const { toast } = useToast();
  const shareFetcher = useFetcher<ShareActionData>({ key: `recipe-share:${recipeId}` });
  const unshareFetcher = useFetcher<ShareActionData>({ key: `recipe-unshare:${recipeId}` });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  const busy = shareFetcher.state !== "idle";
  const shared = Boolean(isShared || shareUrl);

  const fallbackOgImageUrl = useMemo(
    () =>
      shareDialogOgImageUrl({
        ogImageUrlFromShare: null,
        shareToken,
        shareUpdatedAt,
      }),
    [shareToken, shareUpdatedAt],
  );
  const resolvedOgImageUrl = ogImageUrl ?? fallbackOgImageUrl;

  const { loaded: ogLoaded, failed: ogFailed } = usePrefetchImage(
    shared || sheetOpen ? resolvedOgImageUrl : null,
  );

  useFetcherSuccessToast(shareFetcher, (data) => {
    if (!data.url) return;
    setShareUrl(data.url);
    if (data.ogImageUrl) setOgImageUrl(data.ogImageUrl);
    setSheetOpen(true);
    void navigator.clipboard.writeText(data.url).then(
      () => toast({ title: recipeName, message: "Link copied" }),
      () => toast({ title: recipeName, message: "Share link ready" }),
    );
  });

  useFetcherSuccessToast(unshareFetcher, (data) => {
    if (!data.unshared) return;
    setShareUrl(null);
    setOgImageUrl(null);
    setSheetOpen(false);
    setStopConfirmOpen(false);
    toast({ title: recipeName, message: "Stopped sharing" });
  });

  const previewUrl = resolvedOgImageUrl;
  const sharedViewHref = sharedRecipeViewHref(shareUrl, shareToken);

  return (
    <>
      <shareFetcher.Form action={action} method="post">
        <input name="intent" type="hidden" value="ensure-share" />
        <input name="recipeId" type="hidden" value={recipeId} />
        <Button disabled={busy} size={size} type="submit" variant={variant}>
          <Share2 className="size-4" />
          {busy ? "Sharing…" : shared ? "Share link" : "Share"}
        </Button>
      </shareFetcher.Form>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click dismiss; Escape via onCancel */}
      <dialog
        className="fixed inset-x-0 top-auto bottom-0 m-0 mt-auto w-full max-w-lg overflow-visible bg-transparent p-0 sm:inset-0 sm:m-auto sm:h-fit"
        onCancel={(event) => {
          event.preventDefault();
          setSheetOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
        ref={(node) => {
          if (!node) return;
          if (sheetOpen && !node.open) node.showModal();
          if (!sheetOpen && node.open) node.close();
        }}
      >
        <div className="rounded-t-2xl border-t border-border bg-card p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-card-foreground shadow-lg sm:rounded-2xl sm:border">
          <h2 className="text-lg font-semibold tracking-tight">Share recipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone with this link can view the recipe. Edits stay in sync.
          </p>

          {previewUrl && sharedViewHref ? (
            <a
              aria-label={`Open shared view of ${recipeName}`}
              className="relative mt-4 block overflow-hidden rounded-lg border border-border bg-muted/30 ring-offset-background transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={sharedViewHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="aspect-1200/630 w-full">
                {!ogLoaded && !ogFailed ? (
                  <div
                    aria-hidden
                    className="flex size-full items-center justify-center text-muted-foreground"
                  >
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : null}
                {ogFailed ? (
                  <p className="flex size-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                    Preview image unavailable
                  </p>
                ) : (
                  <img
                    alt=""
                    className={cn(
                      "size-full object-cover transition-opacity duration-200",
                      ogLoaded ? "opacity-100" : "opacity-0",
                    )}
                    decoding="async"
                    height={630}
                    src={previewUrl}
                    width={1200}
                  />
                )}
              </div>
            </a>
          ) : null}

          {shareUrl ? (
            <Input
              aria-label="Share link"
              className="mt-4 font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={shareUrl}
            />
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setSheetOpen(false)} type="button" variant="outline">
              Close
            </Button>
            <Button
              onClick={() => {
                if (!shareUrl) return;
                void navigator.clipboard.writeText(shareUrl).then(
                  () => toast({ title: recipeName, message: "Link copied" }),
                  () => undefined,
                );
              }}
              type="button"
            >
              Copy link
            </Button>
            <Button
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setSheetOpen(false);
                setStopConfirmOpen(true);
              }}
              type="button"
              variant="outline"
            >
              Stop sharing
            </Button>
          </div>
        </div>
      </dialog>

      <ConfirmSheet
        FormComponent={unshareFetcher.Form}
        action={action}
        cancelLabel="Keep sharing"
        confirmLabel="Stop sharing"
        description="The public link will stop working. You can share again later."
        destructive
        hiddenFields={{ recipeId }}
        intent="unshare"
        onOpenChange={setStopConfirmOpen}
        open={stopConfirmOpen}
        title="Stop sharing?"
      />

      {shareFetcher.data?.error ? (
        <p className="sr-only" role="alert">
          {shareFetcher.data.error}
        </p>
      ) : null}
    </>
  );
}
