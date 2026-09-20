import type { Outcome } from "~/content/work.server";

export function OutcomeGrid({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <ul className="outcome-grid">
      {outcomes.map((outcome) => (
        <li key={outcome.value} className="border-t border-line pt-4">
          <p className="font-serif text-[1.75rem] leading-tight text-accent">{outcome.value}</p>
          <p className="mt-2 text-muted">{outcome.label}</p>
        </li>
      ))}
    </ul>
  );
}
