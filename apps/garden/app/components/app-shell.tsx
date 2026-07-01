import { ListChecks, Settings } from "lucide-react";
import { Form, Link, useLocation, useParams, useRouteLoaderData } from "react-router";

import { GardenBrand } from "~/components/garden-brand";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { householdPath } from "~/lib/household-path";

import type { Route as AppRoute } from "../routes/+types/app";
import type { Route as HouseholdRoute } from "../routes/+types/household";

function getHouseholdNavItems(householdId: string) {
  return [
    { href: householdPath(householdId), label: "Dashboard", exact: true },
    { href: householdPath(householdId, "plants"), label: "Plants", exact: false },
    { href: householdPath(householdId, "areas"), label: "Areas", exact: false },
    { href: householdPath(householdId, "journal"), label: "Journal", exact: false },
  ] as const;
}

function NavLink({ href, label, exact }: { href: string; label: string; exact: boolean }) {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === href
    : location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <Link
      className={
        isActive
          ? "rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
          : "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }
      to={href}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const appData = useRouteLoaderData<AppRoute.ComponentProps["loaderData"]>("routes/app");
  const householdData =
    useRouteLoaderData<HouseholdRoute.ComponentProps["loaderData"]>("routes/household");
  const params = useParams();
  const householdId = params.householdId ?? householdData?.householdId;
  const navItems = householdId ? getHouseholdNavItems(householdId) : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <div className="flex w-full flex-row-reverse flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5 xs:gap-2">
            {appData?.isAdmin ? (
              <Button asChild className="h-9 w-9 px-0 xs:w-auto xs:px-3" variant="outline">
                <Link
                  aria-label="Allowlist"
                  className="inline-flex items-center justify-center gap-2"
                  title="Allowlist"
                  to="/admin/allowed-emails"
                >
                  <ListChecks className="size-4 shrink-0" />
                  <span className="hidden xs:inline">Allowlist</span>
                </Link>
              </Button>
            ) : null}
            <ThemeToggle />
            <Form action="/logout" method="post">
              <Button size="sm" type="submit" variant="outline">
                Sign out
              </Button>
            </Form>
          </div>
          <h1 className="mr-auto">
            <GardenBrand logoClassName="size-7 xs:size-9" titleClassName="text-xl xs:text-3xl" />
          </h1>
        </div>
        {appData ? (
          <p className="flex flex-wrap items-center gap-x-1 text-muted-foreground">
            <span>{appData.user.name ?? appData.user.email}</span>
            {householdData?.householdName && householdId ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Link className="hover:underline" to="/households">
                    {householdData.householdName}
                  </Link>
                  <Button asChild className="h-7 w-7" size="icon" variant="ghost">
                    <Link
                      aria-label="Household settings"
                      title="Household settings"
                      to={householdPath(householdId, "settings")}
                    >
                      <Settings className="size-3.5" />
                    </Link>
                  </Button>
                </span>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      {navItems ? (
        <nav className="flex flex-wrap gap-1 border-b pb-4">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      ) : null}

      {children}
    </div>
  );
}
