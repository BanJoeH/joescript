import { cn } from "~/lib/utils";
import type { Insight } from "~/services/insights.engine";

const confidenceClass: Record<Insight["confidence"], string> = {
  high: "bg-primary-soft text-primary",
  medium: "bg-blue-soft text-blue",
  low: "bg-amber-soft text-amber",
};

type InsightCardProps = {
  insight: Insight;
  className?: string;
};

export function InsightCard({ insight, className }: InsightCardProps) {
  return (
    <article className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
            confidenceClass[insight.confidence],
          )}
        >
          {insight.confidence} confidence
        </span>
        <span className="text-[11px] capitalize text-muted-foreground">{insight.category}</span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{insight.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{insight.summary}</p>
      <p className="mt-3 text-sm text-foreground/80">{insight.evidence}</p>
    </article>
  );
}
