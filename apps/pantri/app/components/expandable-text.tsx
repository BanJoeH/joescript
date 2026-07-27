import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

type ExpandableTextProps = {
  text: string;
  className?: string;
  clampClassName?: string;
};

export function ExpandableText({
  text,
  className,
  clampClassName = "line-clamp-3",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Remeasure when `text` changes; biome incorrectly flags it as an unnecessary dep.
  // biome-ignore lint/correctness/useExhaustiveDependencies: text is a prop that must retrigger measurement
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }

    if (expanded) {
      setCanExpand(true);
      return;
    }

    const measure = () => {
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className={cn("mt-1", className)}>
      <p
        ref={textRef}
        className={cn("whitespace-pre-wrap text-muted-foreground", !expanded && clampClassName)}
      >
        {text}
      </p>
      {canExpand || expanded ? (
        <button
          className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
