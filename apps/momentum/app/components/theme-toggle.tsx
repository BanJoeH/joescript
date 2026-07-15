import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "~/components/theme-provider";
import { Button } from "~/components/ui/button";
import type { ThemePreference } from "~/lib/theme";
import { cn } from "~/lib/utils";

const options = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
] satisfies Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}>;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <fieldset
      aria-label="Theme"
      className={cn("inline-flex rounded-md border border-border bg-card p-0.5", className)}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          aria-label={label}
          aria-pressed={theme === value}
          className="h-8 w-8"
          key={value}
          onClick={() => setTheme(value)}
          size="icon"
          title={label}
          type="button"
          variant={theme === value ? "default" : "ghost"}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </fieldset>
  );
}
