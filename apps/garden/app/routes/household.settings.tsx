import { Form, Link, useActionData, useLoaderData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { householdPath } from "~/lib/household-path";

import type { Route } from "./+types/household.settings";

export { action, loader } from "./household.settings.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Household settings · Garden" }];
}

export default function HouseholdSettings() {
  const { household, members, householdId } =
    useLoaderData<typeof import("./household.settings.server").loader>();
  const actionData = useActionData<typeof import("./household.settings.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId)}>
            {household.name}
          </Link>{" "}
          / Settings
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Household settings</h2>
      </div>

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rename household</CardTitle>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="update" />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input defaultValue={household.name} id="name" name="name" required />
            </div>
            <Button type="submit">Save name</Button>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Only allowlisted Google accounts can be added. Invited members get access when they
            sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                key={member.membershipId}
              >
                <div>
                  <span className="font-medium">{member.name}</span>
                  {member.pending ? (
                    <span className="ml-2 text-xs text-muted-foreground">(invited)</span>
                  ) : null}
                  <span className="block text-muted-foreground">{member.email}</span>
                </div>
                <Form method="post">
                  <input name="intent" type="hidden" value="remove-member" />
                  <input name="membershipId" type="hidden" value={member.membershipId} />
                  <Button size="sm" type="submit" variant="outline">
                    Remove
                  </Button>
                </Form>
              </li>
            ))}
          </ul>

          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="add-member" />
            <div className="space-y-2">
              <Label htmlFor="email">Add member by email</Label>
              <Input id="email" name="email" placeholder="test@example.com" required type="email" />
            </div>
            <Button type="submit">Add member</Button>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete household</CardTitle>
          <CardDescription>
            Soft-deletes this household and all its areas, plants, care rules, and journal entries.
            Members lose access. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteForm
            confirmMessage={`Delete "${household.name}" and all its garden data? This cannot be undone.`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
