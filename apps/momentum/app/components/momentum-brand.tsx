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
      <img
        alt=""
        aria-hidden
        className="size-8 rounded-[22%] object-cover"
        height={32}
        src="/logo-mark.png"
        width={32}
      />
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
