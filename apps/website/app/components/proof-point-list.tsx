import type { proofPoints } from "~/content/site";

export function ProofPointList({ points }: { points: typeof proofPoints }) {
  return (
    <ul className="proof-list">
      {points.map((point) => (
        <li key={point.value}>
          <p className="font-serif text-[1.75rem] leading-tight text-accent">{point.value}</p>
          <p className="mt-1">{point.label}</p>
        </li>
      ))}
    </ul>
  );
}
