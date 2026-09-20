import { ProofPointList } from "~/components/proof-point-list";
import type { proofPoints } from "~/content/site";

export function Hero({
  eyebrow,
  heading,
  body,
  points,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  points: typeof proofPoints;
}) {
  return (
    <div>
      <p className="label">{eyebrow}</p>
      <h1 className="hero-heading mt-4">{heading}</h1>
      <p className="lede">{body}</p>
      <ProofPointList points={points} />
    </div>
  );
}
