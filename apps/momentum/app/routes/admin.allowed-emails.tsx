import { Form, Link, useActionData, useLoaderData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { isMomentumAdmin } from "~/lib/admin";
import { formatDate } from "~/lib/dates";

import type { Route } from "./+types/admin.allowed-emails";

export { action, loader } from "./admin.allowed-emails.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Invited emails · Momentum" }];
}

export default function AdminAllowedEmailsPage() {
  const { emails, timeZone } =
    useLoaderData<typeof import("./admin.allowed-emails.server").loader>();
  const actionData = useActionData<typeof import("./admin.allowed-emails.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to="/">
            Home
          </Link>{" "}
          / Invited emails
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Allowed emails</h2>
        <p className="text-sm text-muted-foreground">
          Only these Google accounts can sign in to Momentum.
        </p>
      </div>

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add email</CardTitle>
          <CardDescription>
            The person must use this exact Google account when signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="add" />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="friend@example.com"
                required
                type="email"
              />
            </div>
            <Button type="submit">Add invited email</Button>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invited emails</CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No allowed emails yet.</p>
          ) : (
            <ul className="space-y-2">
              {emails.map((entry) => {
                const isAdmin = isMomentumAdmin(entry.email);

                return (
                  <li
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    key={entry.id}
                  >
                    <div>
                      <span className="font-medium">{entry.email}</span>
                      {isAdmin ? (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      ) : null}
                      <span className="block text-muted-foreground">
                        Added {formatDate(entry.createdAt, timeZone)}
                      </span>
                    </div>
                    {isAdmin ? (
                      <span className="text-xs text-muted-foreground">Protected</span>
                    ) : (
                      <DeleteForm
                        confirmMessage={`Remove ${entry.email} from the invited list?`}
                        hiddenFields={{ id: entry.id }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
