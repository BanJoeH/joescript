import { Link } from "react-router";

import { cn } from "~/lib/utils";

type MomentumBrandProps = {
  className?: string;
  titleClassName?: string;
  to?: string | null;
};

export function MomentumBrand({ className, titleClassName, to = "/" }: MomentumBrandProps) {
  const content = (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-xl bg-primary-soft text-primary"
      >
        <svg aria-hidden className="size-4" fill="none" viewBox="0 0 24 24">
          <title>Momentum</title>
          <path
            d="M4 16c3-6 5-9 8-9s5 3 8 9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="7" fill="currentColor" r="1.5" />
        </svg>
      </span>
      <span className={cn("text-lg font-bold tracking-tight text-foreground", titleClassName)}>
        Momentum
      </span>
    </span>
  );

  if (to === null || to === "") {
    return content;
  }

  return (
    <Link className="inline-flex" to={to}>
      {content}
    </Link>
  );
}
