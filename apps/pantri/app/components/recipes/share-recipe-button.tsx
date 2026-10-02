import { Share2 } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

import { ConfirmSheet } from "~/components/confirm-sheet";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type ShareActionData = {
  error?: string;
  url?: string;
  unshared?: boolean;
};

type ShareRecipeButtonProps = {
  recipeId: string;
  recipeName: string;
  action?: string;
  isShared?: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
};

export function ShareRecipeButton({
  recipeId,
  recipeName,
  action,
  isShared = false,
  size = "sm",
  variant = "outline",
}: ShareRecipeButtonProps) {
  const { toast } = useToast();
  const shareFetcher = useFetcher<ShareActionData>({ key: `recipe-share:${recipeId}` });
  const unshareFetcher = useFetcher<ShareActionData>({ key: `recipe-unshare:${recipeId}` });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  const busy = shareFetcher.state !== "idle";
  const shared = Boolean(isShared || shareUrl);

  useFetcherSuccessToast(shareFetcher, (data) => {
    if (!data.url) return;
    setShareUrl(data.url);
    setSheetOpen(true);
    void navigator.clipboard.writeText(data.url).then(
      () => toast({ title: recipeName, message: "Link copied" }),
      () => toast({ title: recipeName, message: "Share link ready" }),
    );
  });

  useFetcherSuccessToast(unshareFetcher, (data) => {
    if (!data.unshared) return;
    setShareUrl(null);
    setSheetOpen(false);
    setStopConfirmOpen(false);
    toast({ title: recipeName, message: "Stopped sharing" });
  });

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
