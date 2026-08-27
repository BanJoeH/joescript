import { StickyNote, Trash2, X } from "lucide-react";
import { type AnimationEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { QuantityInput } from "~/components/recipes/quantity-input";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

type SheetMotion = "enter" | "exit" | "idle";

type IngredientEditorRowProps = {
  name: string;
  notes: string;
  amount: number | null;
  unit: string | null;
  autoFocusQuantity?: boolean;
  quantityId?: string;
  nameId?: string;
  onQuantityChange: (value: { amount: number | null; unit: string | null }) => void;
  onNameChange: (name: string) => void;
  onNotesChange: (notes: string) => void;
  onRemove: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function IngredientNotesSheet({
  open,
  onOpenChange,
  ingredientName,
  notes,
  onNotesChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientName: string;
  notes: string;
  onNotesChange: (notes: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [motion, setMotion] = useState<SheetMotion>("idle");
  const title = ingredientName.trim() ? `Notes · ${ingredientName}` : "Notes";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setMotion("enter");
      if (!dialog.open) dialog.showModal();
      return;
    }

    setMotion((current) => (dialog.open && current !== "exit" ? "exit" : current));
  }, [open]);

  function requestClose() {
    if (motion !== "exit") onOpenChange(false);
  }

  function handlePanelAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || motion !== "exit") return;
    dialogRef.current?.close();
    setMotion("idle");
  }

  return (
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
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em]">{title}</h2>
          <Button
            aria-label="Close notes"
            className="size-8"
            onClick={requestClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <Textarea
          aria-label="Ingredient notes"
          autoFocus
          className="mt-4 min-h-24"
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="minced, room temperature…"
          rows={3}
          value={notes}
        />

        <Button className="mt-4 w-full" onClick={requestClose} type="button">
          Done
        </Button>
      </div>
    </dialog>
  );
}

export function IngredientEditorRow({
  name,
  notes,
  amount,
  unit,
  autoFocusQuantity = false,
  quantityId,
  nameId,
  onQuantityChange,
  onNameChange,
  onNotesChange,
  onRemove,
  onKeyDown,
}: IngredientEditorRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const notesLabelId = useId();
  const hasNotes = notes.trim().length > 0;
  const notesLabel = hasNotes
    ? `Edit notes${name.trim() ? ` for ${name}` : ""}`
    : `Add notes${name.trim() ? ` for ${name}` : ""}`;

  return (
    <div className="grid grid-cols-[6.5rem_1fr_auto] gap-2 overflow-visible sm:grid-cols-[7rem_1fr_auto]">
      <QuantityInput
        amount={amount}
        autoFocus={autoFocusQuantity}
        id={quantityId}
        onChange={onQuantityChange}
        onKeyDown={onKeyDown}
        placeholder="Qty"
        unit={unit}
      />
      <Input
        aria-label="Ingredient name"
        id={nameId}
        onChange={(event) => onNameChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ingredient"
        value={name}
      />
      <div className="flex">
        <Button
          aria-describedby={hasNotes ? notesLabelId : undefined}
          aria-expanded={notesOpen}
          aria-haspopup="dialog"
          aria-label={notesLabel}
          className="relative size-10"
          onClick={() => setNotesOpen(true)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <StickyNote className={cn("size-4", hasNotes && "text-foreground")} />
          {hasNotes ? (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-foreground"
            />
          ) : null}
        </Button>
        <Button
          aria-label="Remove ingredient"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {hasNotes ? (
        <span className="sr-only" id={notesLabelId}>
          {notes}
        </span>
      ) : null}

      <IngredientNotesSheet
        ingredientName={name}
        notes={notes}
        onNotesChange={onNotesChange}
        onOpenChange={setNotesOpen}
        open={notesOpen}
      />
    </div>
  );
}
