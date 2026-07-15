import { ChartLine, House, Lightbulb, NotebookPen } from "lucide-react";
import { NavLink } from "react-router";

import { MomentumBrand } from "~/components/momentum-brand";
import { cn } from "~/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/workouts", label: "Workouts", icon: NotebookPen },
  { to: "/progress", label: "Progress", icon: ChartLine },
  { to: "/insights", label: "Insights", icon: Lightbulb },
] as const;

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background md:flex">
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
        <div className="flex flex-1 flex-col gap-8 p-5">
          <MomentumBrand />
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-primary-soft text-primary",
                  )
                }
                end={"end" in item ? item.end : false}
                key={item.to}
                to={item.to}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      absoluteStrokeWidth
                      fill={isActive ? "currentColor" : "none"}
                      size={20}
                      strokeWidth={1.75}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-28 pt-5 md:max-w-[34rem] md:pb-10 md:pt-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
          <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => (
              <li className="flex-1" key={item.to}>
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-medium text-muted-foreground",
                      isActive && "text-primary",
                    )
                  }
                  end={"end" in item ? item.end : false}
                  to={item.to}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        absoluteStrokeWidth
                        fill={isActive ? "currentColor" : "none"}
                        size={20}
                        strokeWidth={1.75}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
