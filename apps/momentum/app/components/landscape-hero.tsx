import { useTheme } from "~/components/theme-provider";
import { cn } from "~/lib/utils";

type LandscapeHeroProps = {
  className?: string;
  overlay?: boolean;
  children?: React.ReactNode;
};

export function LandscapeHero({ className, overlay = true, children }: LandscapeHeroProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? "/landscape-dark.png" : "/landscape-light.png";

  return (
    <div className={cn("relative overflow-hidden rounded-[28px]", className)}>
      <img alt="" className="h-full w-full object-cover" src={src} />
      {overlay ? (
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-50% to-card/95 dark:to-background/92" />
      ) : null}
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 px-6 pb-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
