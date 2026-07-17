import { ChevronRight, Home, ListChecks, User, X } from "lucide-react";
import { type AnimationEvent, useEffect, useRef, useState } from "react";

import { Link } from "~/components/link";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { householdPath } from "~/lib/household-path";
import { cn } from "~/lib/utils";

type SettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  householdName?: string;
  isAdmin: boolean;
};

type SheetLink = {
  to: string;
  label: string;
  description: string;
  icon: typeof User;
};

type SheetMotion = "enter" | "exit" | "idle";

export function SettingsSheet({
  open,
  onOpenChange,
  householdId,
  householdName,
  isAdmin,
}: SettingsSheetProps) {
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

    if (dialog.open && motion !== "exit") {
      setMotion("exit");
    }
  }, [open, motion]);

  const links: SheetLink[] = [
    {
      to: householdPath(householdId, "settings/personal"),
      label: "Personal settings",
      description: "Your account and appearance",
      icon: User,
    },
    {
      to: householdPath(householdId, "settings/household"),
      label: "Household settings",
      description: householdName
        ? `${householdName} · name, members, and deletion`
        : "Name, members, and deletion",
      icon: ListChecks,
    },
    {
      to: "/households",
      label: "Switch household",
      description: "Open a different garden or create one",
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
      ref={dialogRef}
      aria-label="Settings"
      data-motion={motion}
      className={cn(
        "w-full max-w-lg overflow-visible bg-transparent p-0",
        "fixed inset-x-0 bottom-0 top-auto m-0 mt-auto",
        "sm:inset-0 sm:m-auto sm:h-fit",
      )}
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div
        className={cn(
          "rounded-t-2xl border-t bg-card p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-card-foreground shadow-lg sm:rounded-2xl sm:border",
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

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Appearance</p>
            <ThemeToggle />
          </div>

          <nav className="flex flex-col gap-1">
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
            {isAdmin ? (
              <Link
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={requestClose}
                to="/admin/allowed-emails"
              >
                <ListChecks aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">Invited emails</span>
                  <span className="block text-muted-foreground">Manage who can sign in</span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
    </dialog>
  );
}
