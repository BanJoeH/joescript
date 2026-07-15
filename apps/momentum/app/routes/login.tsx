import { redirect, useSearchParams } from "react-router";

import { MomentumBrand } from "~/components/momentum-brand";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { authClient } from "~/lib/auth.client";
import { getMomentumEnv } from "~/lib/context.server";
import { getOptionalMomentumSession } from "~/lib/session.server";

import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalMomentumSession(request, getMomentumEnv());

  if (session) {
    throw redirect("/");
  }

  return null;
}

const notAllowedMessage = "Your Google account has not been invited to Momentum yet.";

function getLoginErrorMessage(error: string | null) {
  if (!error) return null;
  if (error === "not_allowed" || error.includes("not_authorized") || error.includes("authorized")) {
    return notAllowedMessage;
  }
  return null;
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const errorMessage = getLoginErrorMessage(searchParams.get("error"));

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md rounded-2xl shadow-soft">
        <CardHeader className="items-center text-center">
          <MomentumBrand className="mb-2 justify-center" titleClassName="text-2xl" to="" />
          <CardDescription>Sign in with Google to access your workout journal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button
            className="btn-primary-gradient w-full"
            onClick={() => {
              void authClient.signIn.social({
                provider: "google",
                callbackURL: "/",
                errorCallbackURL: "/login?error=not_allowed",
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
