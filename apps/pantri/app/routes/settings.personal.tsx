import { Form } from "react-router";

import { Link } from "~/components/link";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getPantriEnv } from "~/lib/context.server";
import { pantryPath } from "~/lib/pantry-path";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/settings.personal";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Personal settings · Pantri" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, pantryId } = await requirePantriService(
    request,
    getPantriEnv(),
    params.pantryId,
  );

  return {
    pantryId,
    user: { name: session.user.name, email: session.user.email },
  };
}

export default function PersonalSettings({ loaderData }: Route.ComponentProps) {
  const { pantryId, user } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={pantryPath(pantryId, "shopping")}>
            Pantri
          </Link>{" "}
          / Personal settings ·{" "}
          <Link className="hover:underline" to={pantryPath(pantryId, "settings/pantry")}>
            Pantry settings
          </Link>
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
          <CardTitle>Switch pantry</CardTitle>
          <CardDescription>Open a different shared pantry or create one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/pantries">
            <Button type="button" variant="outline">
              View all pantries
            </Button>
          </Link>
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
