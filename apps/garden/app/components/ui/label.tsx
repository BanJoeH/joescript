/** biome-ignore-all lint/a11y/noLabelWithoutControl: <reusable component> */
import type * as React from "react";

import { cn } from "~/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
