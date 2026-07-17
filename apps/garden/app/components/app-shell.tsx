import {
  LayoutDashboard,
  Leaf,
  type LucideIcon,
  MapPinned,
  NotebookPen,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams, useRouteLoaderData } from "react-router";

import { GardenBrand } from "~/components/garden-brand";
import { Link } from "~/components/link";
import { SettingsSheet } from "~/components/settings-sheet";
import { householdPath } from "~/lib/household-path";
import { cn } from "~/lib/utils";

import type { Route as AppRoute } from "../routes/+types/app";
import type { Route as HouseholdRoute } from "../routes/+types/household";

type HouseholdNavItem = {
  href: string;
  label: string;
  exact: boolean;
  icon: LucideIcon;
};

function getHouseholdNavItems(householdId: string): HouseholdNavItem[] {
  return [
    {
      href: householdPath(householdId),
      label: "Dashboard",
      exact: true,
      icon: LayoutDashboard,
    },
    {
      href: householdPath(householdId, "plants"),
      label: "Plants",
      exact: false,
      icon: Leaf,
    },
    {
      href: householdPath(householdId, "areas"),
      label: "Areas",
      exact: false,
      icon: MapPinned,
    },
    {
      href: householdPath(householdId, "journal"),
      label: "Journal",
      exact: false,
      icon: NotebookPen,
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

function TopNavContent({
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

function TopNavLink({ href, label, exact, icon }: HouseholdNavItem) {
  const location = useLocation();
  const isActive = isNavItemActive(location.pathname, href, exact);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={topNavClassName(isActive)}
      prefetch="viewport"
      to={href}
    >
      <TopNavContent icon={icon} isActive={isActive} label={label} />
    </Link>
  );
}

function bottomNavClassName(isActive: boolean) {
  return cn(
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[0.6875rem] font-medium",
    isActive ? "text-primary" : "text-muted-foreground",
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
          isActive && "bg-primary/15",
        )}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
      </span>
      <span>{label}</span>
    </>
  );
}

function BottomNavLink({ href, label, exact, icon }: HouseholdNavItem) {
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
  const appData = useRouteLoaderData<AppRoute.ComponentProps["loaderData"]>("routes/app");
  const householdData =
    useRouteLoaderData<HouseholdRoute.ComponentProps["loaderData"]>("routes/household");
  const params = useParams();
  const location = useLocation();
  const householdId = params.householdId ?? householdData?.householdId;
  const navItems = householdId ? getHouseholdNavItems(householdId) : null;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsActive = settingsOpen || location.pathname.includes("/settings");

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4 md:gap-6 md:p-6",
        navItems && "pb-24 md:pb-6",
      )}
    >
      <header>
        <h1>
          <GardenBrand logoClassName="size-7" titleClassName="text-xl" />
        </h1>
      </header>

      {navItems ? (
        <nav aria-label="Household" className="hidden flex-wrap gap-1 border-b pb-4 md:flex">
          {navItems.map((item) => (
            <TopNavLink key={item.href} {...item} />
          ))}
          <button
            className={cn(topNavClassName(settingsActive), "ml-auto")}
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <TopNavContent icon={Settings} isActive={settingsActive} label="Settings" />
          </button>
        </nav>
      ) : null}

      {children}

      {navItems ? (
        <nav
          aria-label="Household"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="mx-auto flex max-w-3xl">
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

      {householdId ? (
        <SettingsSheet
          householdId={householdId}
          householdName={householdData?.householdName}
          isAdmin={appData?.isAdmin ?? false}
          onOpenChange={setSettingsOpen}
          open={settingsOpen}
        />
      ) : null}
    </div>
  );
}
