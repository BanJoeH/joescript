import { Form } from "react-router";

import { Link } from "~/components/link";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/settings.personal";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Personal settings · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, householdId } = await requireGardenService(
    request,
    getGardenEnv(),
    params.householdId,
  );

  return {
    householdId,
    user: { name: session.user.name, email: session.user.email },
  };
}

export default function PersonalSettings({ loaderData }: Route.ComponentProps) {
  const { householdId, user } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId)}>
            Dashboard
          </Link>{" "}
          / Personal settings
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Personal settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>The Google account you signed in with.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {user.name ? <p className="font-medium">{user.name}</p> : null}
          <p className="text-muted-foreground">{user.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose a light, dark, or system theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>End your session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form action="/logout" method="post">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
