const CELEBRATION_COLORS = [
  "#ff6b6b",
  "#ffd93d",
  "#6bcb77",
  "#4d96ff",
  "#c77dff",
  "#ff8fab",
  "#ffffff",
];

export function shouldCelebrateSortedComplete(
  previousRemaining: number | null,
  remainingCount: number,
  ready: boolean,
): boolean {
  if (!ready) return false;
  if (previousRemaining === null) return false;
  return previousRemaining > 0 && remainingCount === 0;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Firework-like confetti bursts when the sorted shopping list hits zero remaining. */
export async function celebrateSortedComplete(): Promise<void> {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const confetti = (await import("canvas-confetti")).default;
  const defaults = {
    zIndex: 100,
    colors: CELEBRATION_COLORS,
    disableForReducedMotion: true,
  };

  confetti({
    ...defaults,
    particleCount: 55,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
    startVelocity: 45,
  });
  confetti({
    ...defaults,
    particleCount: 55,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.7 },
    startVelocity: 45,
  });
  confetti({
    ...defaults,
    particleCount: 40,
    spread: 90,
    origin: { x: 0.5, y: 0.55 },
    startVelocity: 35,
  });
}
