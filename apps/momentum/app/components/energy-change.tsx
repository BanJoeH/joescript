import { cn } from "~/lib/utils";

type EnergyChangeBadgeProps = {
  before: number | null | undefined;
  after: number | null | undefined;
  className?: string;
  size?: "sm" | "md";
};

type EnergyShift = "up" | "steady" | "down";

function resolveShift(before: number, after: number): EnergyShift {
  const delta = after - before;
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "steady";
}

const shiftTone: Record<EnergyShift, string> = {
  up: "border-primary/40 bg-primary-soft text-primary",
  steady: "border-blue/35 bg-blue-soft text-blue",
  // Soft amber — declining energy is recovery, not failure.
  down: "border-amber/40 bg-amber-soft text-amber",
};

const shiftLabel: Record<EnergyShift, string> = {
  up: "Energy lifted",
  steady: "Energy steady",
  down: "Energy eased",
};

/** Simple diagonal / neutral arrows. Decorative — label lives on the badge. */
function EnergyShiftMark({ shift, className }: { shift: EnergyShift; className?: string }) {
  if (shift === "steady") {
    return (
      <svg
        aria-hidden="true"
        className={cn("size-5", className)}
        fill="none"
        focusable="false"
        viewBox="0 0 20 20"
      >
        <path
          d="M4 10h11.5M12.5 6.5 16.5 10l-4 3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.85"
        />
      </svg>
    );
  }

  if (shift === "up") {
    return (
      <svg
        aria-hidden="true"
        className={cn("size-5", className)}
        fill="none"
        focusable="false"
        viewBox="0 0 20 20"
      >
        <path
          d="M5.5 14.5 14.5 5.5M8 5.5h6.5V12"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.85"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={cn("size-5", className)}
      fill="none"
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path
        d="M5.5 5.5 14.5 14.5M8 14.5h6.5V8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
    </svg>
  );
}

export function EnergyChangeBadge({
  before,
  after,
  className,
  size = "md",
}: EnergyChangeBadgeProps) {
  if (before == null || after == null) return null;

  const shift = resolveShift(before, after);
  const dim = size === "sm" ? "size-7" : "size-10";
  const markClass = size === "sm" ? "size-3.5" : "size-5";
  const label = shiftLabel[shift];

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full border",
        dim,
        shiftTone[shift],
        className,
      )}
      role="img"
      title={label}
    >
      <EnergyShiftMark className={markClass} shift={shift} />
    </span>
  );
}

export function formatEnergyDelta(
  before: number | null | undefined,
  after: number | null | undefined,
) {
  if (before == null || after == null) return null;
  const delta = after - before;
  if (delta === 0) return "Steady";
  return delta > 0 ? `+${delta}` : `${delta}`;
}
