type QuickAddFlashBannerProps = {
  message: string;
};

export function QuickAddFlashBanner({ message }: QuickAddFlashBannerProps) {
  return (
    <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
