import { RotateCcw } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type ShoppingGotItSectionProps = {
  count: number;
  onResetAll?: () => void;
  children: React.ReactNode;
  className?: string;
};

export function ShoppingGotItSection({
  count,
  onResetAll,
  children,
  className,
}: ShoppingGotItSectionProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="my-3 flex items-center gap-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          Got it ({count})
          {onResetAll ? (
            <Button
              aria-label={`Re-add all ${count} checked ingredients`}
              className="size-7 text-muted-foreground"
              onClick={onResetAll}
              size="icon"
              type="button"
              variant="ghost"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          ) : null}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="w-full opacity-[0.85]">{children}</div>
    </div>
  );
}
