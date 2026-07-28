import { type ReactNode, useState } from "react";

import { ConfirmSheet } from "~/components/confirm-sheet";
import { Button } from "~/components/ui/button";

type DeleteFormProps = {
  confirmMessage: string;
  title?: string;
  confirmLabel?: string;
  hiddenFields?: Record<string, string>;
  intent?: string;
  action?: string;
  size?: "default" | "sm" | "lg" | "icon";
  "aria-label"?: string;
  children?: ReactNode;
};

export function DeleteForm({
  confirmMessage,
  title = "Delete",
  confirmLabel = "Delete",
  hiddenFields = {},
  intent = "delete",
  action,
  size = "sm",
  "aria-label": ariaLabel,
  children = "Delete",
}: DeleteFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        aria-label={ariaLabel}
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
        size={size}
        type="button"
        variant="outline"
      >
        {children}
      </Button>
      <ConfirmSheet
        action={action}
        confirmLabel={confirmLabel}
        description={confirmMessage}
        destructive
        hiddenFields={hiddenFields}
        intent={intent}
        onOpenChange={setOpen}
        open={open}
        title={title}
      />
    </>
  );
}
