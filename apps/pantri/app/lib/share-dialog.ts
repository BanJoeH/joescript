import { shareOgImagePath } from "~/lib/recipe-share";

export function sharedRecipeViewHref(
  shareUrl: string | null | undefined,
  shareToken: string | null | undefined,
): string | null {
  if (shareUrl) return shareUrl;
  if (shareToken) return `/r/${shareToken}`;
  return null;
}

export function shareDialogOgImageUrl(options: {
  ogImageUrlFromShare: string | null | undefined;
  shareToken: string | null | undefined;
  shareUpdatedAt: Date | string | null | undefined;
}): string | null {
  if (options.ogImageUrlFromShare) return options.ogImageUrlFromShare;
  if (!options.shareToken || options.shareUpdatedAt == null) return null;
  const updatedAtIso =
    options.shareUpdatedAt instanceof Date
      ? options.shareUpdatedAt.toISOString()
      : options.shareUpdatedAt;
  return shareOgImagePath(options.shareToken, updatedAtIso);
}
