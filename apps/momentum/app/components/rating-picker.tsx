import { Star } from "lucide-react";

import { cn } from "~/lib/utils";

const ENERGY_LABELS = ["Exhausted", "Low", "Okay", "Good", "Great"] as const;
const WORTH_IT_LABELS = ["Not really", "A little", "Somewhat", "Yes", "Absolutely"] as const;

type RatingPickerProps = {
  name: string;
  value?: number;
  kind?: "energy" | "worth";
  className?: string;
  onChange?: (value: number) => void;
};

export function RatingPicker({
  name,
  value,
  kind = "energy",
  className,
  onChange,
}: RatingPickerProps) {
  if (kind === "worth") {
    return (
      <fieldset className={cn("space-y-3", className)}>
        <div className="grid grid-cols-5 gap-2">
          {WORTH_IT_LABELS.map((label, index) => {
            const score = index + 1;
            const filled = value != null && score <= value;
            return (
              <label
                aria-label={`${score}: ${label}`}
                className="flex cursor-pointer flex-col items-center gap-1.5"
                key={score}
                title={label}
              >
                <input
                  checked={value === score}
                  className="sr-only"
                  name={name}
                  onChange={() => onChange?.(score)}
                  type="radio"
                  value={score}
                />
                <Star
                  absoluteStrokeWidth
                  className={cn(
                    "size-10 transition",
                    filled ? "fill-primary text-primary" : "fill-transparent text-border",
                  )}
                  strokeWidth={1.5}
                />
                <span className="text-center text-[10px] leading-tight text-muted-foreground">
                  {score}
                </span>
              </label>
            );
          })}
        </div>
        <p className="min-h-4 text-center text-sm text-muted-foreground">
          {value != null && value >= 1 && value <= 5 ? WORTH_IT_LABELS[value - 1] : "\u00a0"}
        </p>
      </fieldset>
    );
  }

  return (
    <fieldset className={cn("space-y-3", className)}>
      <div className="grid grid-cols-5 gap-2">
        {ENERGY_LABELS.map((label, index) => {
          const score = index + 1;
          return (
            <label className="group flex cursor-pointer flex-col items-center gap-1.5" key={score}>
              <input
                checked={value === score}
                className="peer sr-only"
                name={name}
                onChange={() => onChange?.(score)}
                type="radio"
                value={score}
              />
              <span className="flex size-11 items-center justify-center rounded-2xl border border-border bg-secondary text-sm font-semibold text-muted-foreground transition peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary">
                {score}
              </span>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function formatEnergyLabel(value: number | null | undefined) {
  if (value == null || value < 1 || value > 5) return "Unknown";
  return ENERGY_LABELS[value - 1];
}

export function formatWorthItLabel(value: number | null | undefined) {
  if (value == null || value < 1 || value > 5) return "Unknown";
  return WORTH_IT_LABELS[value - 1];
}
