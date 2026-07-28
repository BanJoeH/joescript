import type * as React from "react";

import { cn } from "~/lib/utils";

/** One bordered panel of stacked rows — first/last corners from the container. */
function CardList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border-[1.5px] border-border bg-card text-card-foreground shadow-[4px_4px_8px_0_rgba(0,0,0,0.2)]",
        className,
      )}
      data-slot="card-list"
      {...props}
    />
  );
}

/** A row inside a CardList. Separators via border-bottom on all but the last child. */
function CardListItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-b border-border last:border-b-0", className)}
      data-slot="card-list-item"
      {...props}
    />
  );
}

export { CardList, CardListItem };
