import { ShoppingBasket } from "lucide-react";

import { cn } from "~/lib/utils";

type PantriBrandProps = {
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
};

export function PantriBrand({ className, iconClassName, titleClassName }: PantriBrandProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 xs:max-w-full", className)}>
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
          iconClassName,
        )}
      >
        <ShoppingBasket aria-hidden className="size-5" />
      </span>
      <span className={cn("font-semibold tracking-tight xs:truncate", titleClassName)}>Pantri</span>
    </span>
  );
}
