import { redirect } from "react-router";
import { PantriBrand } from "~/components/pantri-brand";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { authClient } from "~/lib/auth.client";
import { getPantriEnv } from "~/lib/context.server";
import { getOptionalPantriSession } from "~/lib/session.server";

import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalPantriSession(request, getPantriEnv());

  if (session) {
    throw redirect("/");
  }

  return null;
}

export default function Login() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <PantriBrand className="mb-2" iconClassName="size-16" titleClassName="text-2xl" />
          <CardDescription>Sign in with Google to access your shared pantry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => {
              void authClient.signIn.social({
                provider: "google",
                callbackURL: "/",
              });
            }}
            type="button"
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
