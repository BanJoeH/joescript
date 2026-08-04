import { eq } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { user } from "~/db/schema";
import { isMomentumAdmin } from "~/lib/admin";
import { getMomentumEnv } from "~/lib/context.server";
import { getOptionalString } from "~/lib/forms.server";
import { requireMomentumSession } from "~/lib/session.server";

import type { Route } from "./+types/settings";

export async function loader({ request }: Route.LoaderArgs) {
  const { session } = await requireMomentumSession(request, getMomentumEnv());
  return {
    name: session.user.name,
    preferredName: session.user.preferredName ?? "",
    email: session.user.email,
    isAdmin: isMomentumAdmin(session.user.email),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { session, db } = await requireMomentumSession(request, getMomentumEnv());
  const formData = await request.formData();
  const preferredName = (getOptionalString(formData, "preferredName") ?? "").trim();

  if (preferredName.length > 40) {
    return { error: "Keep it under 40 characters." };
  }

  await db
    .update(user)
    .set({
      preferredName: preferredName || null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  throw redirect("/settings");
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Settings · Momentum" }];
}

export default function SettingsPage({ loaderData, actionData }: Route.ComponentProps) {
  const { name, preferredName, email, isAdmin } = loaderData;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Appearance and account.</p>
      </div>

      <section className="space-y-4 rounded-[20px] border border-border bg-card p-5 shadow-soft">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Signed in as</h2>
          <div className="mt-1">
            {name ? <p className="font-semibold">{name}</p> : null}
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <Form className="space-y-3 border-t border-border pt-4" method="post">
          <div className="space-y-2">
            <Label htmlFor="preferredName">Preferred name</Label>
            <Input
              defaultValue={preferredName}
              id="preferredName"
              maxLength={40}
              name="preferredName"
              placeholder={name?.split(/\s+/)[0] ?? "Your first name"}
            />
            <p className="text-xs text-muted-foreground">
              Used in greetings. Leave blank to use your first name from Google.
            </p>
          </div>
          {actionData?.error ? (
            <p className="text-sm text-destructive">{actionData.error}</p>
          ) : null}
          <Button disabled={busy} type="submit" variant="secondary">
            {busy ? "Saving…" : "Save name"}
          </Button>
        </Form>
      </section>

      <section className="space-y-3 rounded-[20px] border border-border bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">Choose light, dark, or match the system.</p>
        </div>
        <ThemeToggle />
      </section>

      {isAdmin ? (
        <section className="rounded-[20px] border border-border bg-card p-5 shadow-soft">
          <h2 className="font-semibold">Admin</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage who can sign in.</p>
          <Link
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            to="/admin/allowed-emails"
          >
            Invited emails
          </Link>
        </section>
      ) : null}

      <Form action="/logout" method="post">
        <Button className="w-full rounded-2xl" type="submit" variant="outline">
          <LogOut size={18} strokeWidth={1.75} />
          Sign out
        </Button>
      </Form>
    </div>
  );
}
