import { redirect, useSearchParams } from "react-router";
import { GardenBrand } from "~/components/garden-brand";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { authClient } from "~/lib/auth.client";
import { getGardenEnv } from "~/lib/context.server";
import { gardenLogoForLocation } from "~/lib/garden-logos";
import { getOptionalGardenSession } from "~/lib/session.server";

import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalGardenSession(request, getGardenEnv());

  if (session) {
    throw redirect("/");
  }

  return null;
}

const notAllowedMessage = "Your Google account has not been invited to Garden yet.";
const noHouseholdMessage =
  "Your account is invited but you are not in a household yet. Sign in and create one, or ask someone to add you.";

function getLoginErrorMessage(error: string | null) {
  if (!error) return null;
  if (error === "no_household") {
    return noHouseholdMessage;
  }
  if (error === "not_allowed" || error.includes("not_authorized") || error.includes("authorized")) {
    return notAllowedMessage;
  }
  return null;
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const errorMessage = getLoginErrorMessage(searchParams.get("error"));

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <GardenBrand
            className="mb-2"
            logoClassName="size-20"
            logoSrc={gardenLogoForLocation({ pathname: "/login" })}
            titleClassName="text-2xl"
          />
          <CardDescription>
            Sign in with Google to access your household garden journal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button
            className="w-full"
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
