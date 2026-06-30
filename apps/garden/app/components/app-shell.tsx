import { Settings } from "lucide-react";
import { Form, Link, useLocation, useParams, useRouteLoaderData } from "react-router";

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Garden</h1>
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
        </div>
        <div className="flex items-center gap-2">
          {appData?.isAdmin ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/allowed-emails">Allowlist</Link>
            </Button>
          ) : null}
          <ThemeToggle />
          <Form action="/logout" method="post">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </Form>
        </div>
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
