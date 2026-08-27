import { ChevronRight, Home, ListChecks, User, X } from "lucide-react";
import { type AnimationEvent, useEffect, useRef, useState } from "react";

import { Link } from "~/components/link";
import { Button } from "~/components/ui/button";
import { pantryPath } from "~/lib/pantry-path";
import { cn } from "~/lib/utils";

type SettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pantryId: string;
  pantryName?: string;
};

type SheetLink = {
  to: string;
  label: string;
  description: string;
  icon: typeof User;
};

type SheetMotion = "enter" | "exit" | "idle";

export function SettingsSheet({ open, onOpenChange, pantryId, pantryName }: SettingsSheetProps) {
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

  const links: SheetLink[] = [
    {
      to: pantryPath(pantryId, "settings/personal"),
      label: "Personal settings",
      description: "Account and sign-out",
      icon: User,
    },
    {
      to: pantryPath(pantryId, "settings/pantry"),
      label: "Pantry settings",
      description: pantryName ? `${pantryName} · name, members, delete` : "Name, members, delete",
      icon: ListChecks,
    },
    {
      to: "/pantries",
      label: "Switch pantry",
      description: "Open or create a pantry",
      icon: Home,
    },
  ];

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
      aria-label="Settings"
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
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
          <Button
            aria-label="Close settings"
            className="h-8 w-8"
            onClick={requestClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {links.map(({ to, label, description, icon: Icon }) => (
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
              key={to}
              onClick={requestClose}
              to={to}
            >
              <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{label}</span>
                <span className="block text-muted-foreground">{description}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </nav>
      </div>
    </dialog>
  );
}
