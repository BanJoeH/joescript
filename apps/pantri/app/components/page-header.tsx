import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "overflow-hidden rounded-md border-[1.5px] border-border bg-card shadow-[4px_4px_8px_0_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold uppercase tracking-[0.08em]">{title}</h2>
          {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="border-t border-border px-4 py-3">{children}</div> : null}
    </header>
  );
}
