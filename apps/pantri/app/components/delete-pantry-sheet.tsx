import { X } from "lucide-react";
import { type AnimationEvent, useEffect, useId, useRef, useState } from "react";
import { Form } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

const CONFIRM_WORD = "DELETE";

type DeletePantrySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pantryName: string;
};

type SheetMotion = "enter" | "exit" | "idle";

export function DeletePantrySheet({ open, onOpenChange, pantryName }: DeletePantrySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputId = useId();
  const [motion, setMotion] = useState<SheetMotion>("idle");
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === CONFIRM_WORD;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      setConfirmText("");
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
    <dialog
      aria-label="Delete pantry"
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 mt-auto w-full max-w-lg overflow-visible bg-transparent p-0",
        "sm:inset-0 sm:m-auto sm:h-fit",
      )}
      data-motion={motion}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
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
            <h2 className="text-lg font-semibold tracking-tight text-destructive">Delete pantry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deletes <span className="font-medium text-foreground">{pantryName}</span>, its
              recipes, shopping lists, and odd bits. Cannot be undone.
            </p>
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

        <Form className="mt-6 space-y-4" method="post">
          <input name="intent" type="hidden" value="delete" />
          <input name="confirm" type="hidden" value={confirmText} />
          <div className="space-y-2">
            <Label htmlFor={inputId}>
              Type <span className="font-semibold text-foreground">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              autoComplete="off"
              autoFocus
              id={inputId}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={CONFIRM_WORD}
              spellCheck={false}
              value={confirmText}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={requestClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40"
              disabled={!canDelete}
              type="submit"
            >
              Delete pantry
            </Button>
          </div>
        </Form>
      </div>
    </dialog>
  );
}
