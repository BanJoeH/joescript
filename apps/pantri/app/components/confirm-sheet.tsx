import { X } from "lucide-react";
import { type AnimationEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Form } from "react-router";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type SheetMotion = "enter" | "exit" | "idle";

type ConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  action?: string;
  intent?: string;
  hiddenFields?: Record<string, string>;
  destructive?: boolean;
};

export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  action,
  intent = "delete",
  hiddenFields = {},
  destructive = false,
}: ConfirmSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [motion, setMotion] = useState<SheetMotion>("idle");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      setMotion("enter");
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    setMotion((current) => (dialog.open && current !== "exit" ? "exit" : current));
  }, [open]);

  function requestClose() {
    if (motion !== "exit") {
      onOpenChange(false);
    }
  }

  function handlePanelAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || motion !== "exit") {
      return;
    }

    dialogRef.current?.close();
    setMotion("idle");
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click dismiss; Escape via onCancel
    <dialog
      aria-label={title}
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 mt-auto w-full max-w-lg overflow-visible bg-transparent p-0",
        "sm:inset-0 sm:m-auto sm:h-fit",
      )}
      data-motion={motion}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <div
        className={cn(
          "rounded-t-2xl border-t border-border bg-card p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-card-foreground shadow-lg sm:rounded-2xl sm:border",
          motion === "enter" && "animate-in fade-in slide-in-from-bottom duration-300",
          motion === "exit" && "animate-out fade-out slide-out-to-bottom duration-200",
        )}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className={cn(
                "text-lg font-semibold tracking-tight",
                destructive && "text-destructive",
              )}
            >
              {title}
            </h2>
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          </div>
          <Button
            aria-label="Close"
            className="h-8 w-8 shrink-0"
            onClick={requestClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <Form action={action} className="mt-6 flex flex-wrap justify-end gap-2" method="post">
          <input name="intent" type="hidden" value={intent} />
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <Button onClick={requestClose} type="button" variant="outline">
            {cancelLabel}
          </Button>
          <Button
            className={
              destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined
            }
            type="submit"
          >
            {confirmLabel}
          </Button>
        </Form>
      </div>
    </dialog>
  );
}
