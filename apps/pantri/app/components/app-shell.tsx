import { ListChecks, type LucideIcon, Settings, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { useLocation, useParams, useRouteLoaderData } from "react-router";

import { Link } from "~/components/link";
import { PantriBrand } from "~/components/pantri-brand";
import { pantryPath } from "~/lib/pantry-path";
import { cn } from "~/lib/utils";

import type { Route as PantryRoute } from "../routes/+types/pantry";

type PantryNavItem = {
  href: string;
  label: string;
  exact: boolean;
  icon: LucideIcon;
};

function getPantryNavItems(pantryId: string): PantryNavItem[] {
  return [
    {
      href: pantryPath(pantryId, "shopping"),
      label: "Shopping",
      exact: false,
      icon: ShoppingCart,
    },
    {
      href: pantryPath(pantryId, "sorted"),
      label: "Sorted",
      exact: false,
      icon: ListChecks,
    },
    {
      href: pantryPath(pantryId, "recipes"),
      label: "Recipes",
      exact: false,
      icon: UtensilsCrossed,
    },
    {
      href: pantryPath(pantryId, "settings"),
      label: "Settings",
      exact: false,
      icon: Settings,
    },
  ];
}

function isNavItemActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function topNavClassName(isActive: boolean) {
  return cn(
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

function NavContent({
  icon: Icon,
  label,
  isActive,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <>
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
      <span>{label}</span>
    </>
  );
}

function TopNavLink({ href, label, exact, icon }: PantryNavItem) {
  const location = useLocation();
  const isActive = isNavItemActive(location.pathname, href, exact);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={topNavClassName(isActive)}
      prefetch="viewport"
      to={href}
    >
      <NavContent icon={icon} isActive={isActive} label={label} />
    </Link>
  );
}

function bottomNavClassName(isActive: boolean) {
  return cn(
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[0.6875rem] font-medium",
    isActive ? "text-primary" : "text-muted-foreground",
  );
}

function BottomNavLink({ href, label, exact, icon: Icon }: PantryNavItem) {
  const location = useLocation();
  const isActive = isNavItemActive(location.pathname, href, exact);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={bottomNavClassName(isActive)}
      prefetch="viewport"
      to={href}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full px-3 py-1",
          isActive && "bg-primary/15",
        )}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pantryData = useRouteLoaderData<PantryRoute.ComponentProps["loaderData"]>("routes/pantry");
  const params = useParams();
  const pantryId = params.pantryId ?? pantryData?.pantryId;
  const navItems = pantryId ? getPantryNavItems(pantryId) : null;

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4 md:gap-6 md:p-6",
        navItems && "pb-24 md:pb-6",
      )}
    >
      <header className="flex items-center justify-between">
        <h1>
          <PantriBrand titleClassName="text-xl" />
        </h1>
        {pantryData?.pantryName ? (
          <Link className="text-sm text-muted-foreground hover:underline" to="/pantries">
            {pantryData.pantryName}
          </Link>
        ) : null}
      </header>

      {navItems ? (
        <nav aria-label="Pantry" className="hidden flex-wrap gap-1 border-b pb-4 md:flex">
          {navItems.map((item) => (
            <TopNavLink key={item.href} {...item} />
          ))}
        </nav>
      ) : null}

      {children}

      {navItems ? (
        <nav
          aria-label="Pantry"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="mx-auto flex max-w-3xl">
            {navItems.map((item) => (
              <BottomNavLink key={item.href} {...item} />
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
