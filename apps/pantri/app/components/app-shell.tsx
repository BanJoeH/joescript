import { type LucideIcon, Settings, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams, useRouteLoaderData } from "react-router";

import { Link } from "~/components/link";
import { PantriBrand } from "~/components/pantri-brand";
import { SettingsSheet } from "~/components/settings-sheet";
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
      href: pantryPath(pantryId, "recipes"),
      label: "Recipes",
      exact: false,
      icon: UtensilsCrossed,
    },
  ];
}

function isNavItemActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function topNavClassName(isActive: boolean) {
  return cn(
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]",
    isActive
      ? "bg-accent text-foreground"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
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
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em]",
    isActive ? "text-foreground" : "text-muted-foreground",
  );
}

function BottomNavContent({
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
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full px-3 py-1",
          isActive && "bg-accent",
        )}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
      </span>
      <span>{label}</span>
    </>
  );
}

function BottomNavLink({ href, label, exact, icon }: PantryNavItem) {
  const location = useLocation();
  const isActive = isNavItemActive(location.pathname, href, exact);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={bottomNavClassName(isActive)}
      prefetch="viewport"
      to={href}
    >
      <BottomNavContent icon={icon} isActive={isActive} label={label} />
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pantryData = useRouteLoaderData<PantryRoute.ComponentProps["loaderData"]>("routes/pantry");
  const params = useParams();
  const location = useLocation();
  const pantryId = params.pantryId ?? pantryData?.pantryId;
  const navItems = pantryId ? getPantryNavItems(pantryId) : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsActive = settingsOpen || location.pathname.includes("/settings");

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen w-full max-w-180 flex-col gap-4 px-[2.5%] py-4 md:gap-6 md:py-6",
        navItems && "pb-24 md:pb-6",
      )}
    >
      <header className="sticky top-0 z-30 mx-[-2.5%] flex items-center justify-between border-b border-border bg-background/95 px-[2.5%] py-3 backdrop-blur-sm">
        <h1>
          <Link to={pantryId ? pantryPath(pantryId, "shopping") : "/pantries"}>
            <PantriBrand titleClassName="text-base" />
          </Link>
        </h1>
        {pantryData?.pantryName ? (
          <Link
            className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground"
            to="/pantries"
          >
            {pantryData.pantryName}
          </Link>
        ) : null}
      </header>

      {navItems ? (
        <nav aria-label="Pantry" className="hidden flex-wrap gap-1 md:flex">
          {navItems.map((item) => (
            <TopNavLink key={item.href} {...item} />
          ))}
          <button
            className={cn(topNavClassName(settingsActive), "ml-auto")}
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <NavContent icon={Settings} isActive={settingsActive} label="Settings" />
          </button>
        </nav>
      ) : null}

      <div className="pantri-page flex flex-1 flex-col gap-4 md:gap-6">{children}</div>

      {navItems ? (
        <nav
          aria-label="Pantry"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
        >
          <div className="mx-auto flex max-w-180">
            {navItems.map((item) => (
              <BottomNavLink key={item.href} {...item} />
            ))}
            <button
              className={bottomNavClassName(settingsActive)}
              onClick={() => setSettingsOpen(true)}
              type="button"
            >
              <BottomNavContent icon={Settings} isActive={settingsActive} label="Settings" />
            </button>
          </div>
        </nav>
      ) : null}

      {pantryId ? (
        <SettingsSheet
          onOpenChange={setSettingsOpen}
          open={settingsOpen}
          pantryId={pantryId}
          pantryName={pantryData?.pantryName}
        />
      ) : null}
    </div>
  );
}
