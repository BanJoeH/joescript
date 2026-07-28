import { Copy } from "lucide-react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";

import { DeletePantrySheet } from "~/components/delete-pantry-sheet";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.settings";
import type { loader } from "./pantry.settings.server";

export { action, loader } from "./pantry.settings.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pantry settings · Pantri" }];
}

function inviteInstructions(email: string, pantryName: string) {
  return `You're invited to join “${pantryName}” on Pantri.\n\nSign in with Google using ${email}, then open the app — you'll get access automatically.`;
}

export default function PantrySettings() {
  const { pantry, members, pantryId, currentUserId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof import("./pantry.settings.server").action>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const activeMembers = members.filter((member) => !member.pending);
  const pendingMembers = members.filter((member) => member.pending);
  const isLastMember = members.length === 1;
  const flash = actionData && "inviteFlash" in actionData ? actionData.inviteFlash : null;

  async function copyInvite(membershipId: string, email: string) {
    try {
      await navigator.clipboard.writeText(inviteInstructions(email, pantry.name));
      setCopiedId(membershipId);
      window.setTimeout(
        () => setCopiedId((current) => (current === membershipId ? null : current)),
        2000,
      );
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={
          <>
            {pantry.name} ·{" "}
            <Link className="hover:underline" to={pantryPath(pantryId, "settings/personal")}>
              Personal settings
            </Link>
          </>
        }
        title="Pantry settings"
      />

      {actionData && "error" in actionData && actionData.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      {flash ? (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {flash.status === "joined" ? (
            <>
              <span className="font-medium">{flash.email}</span> already had an account and was
              added to this pantry.
            </>
          ) : (
            <>
              Invited <span className="font-medium">{flash.email}</span>. They get access when they
              sign in with Google using that address — no email is sent from Pantri.
            </>
          )}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Rename pantry</CardTitle>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="update" />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input defaultValue={pantry.name} id="name" name="name" required />
            </div>
            <Button type="submit">Save name</Button>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Invite by email. No message is sent — share that they should sign in with Google using
            that address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Active
            </h3>
            {activeMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active members yet.</p>
            ) : (
              <ul className="space-y-2">
                {activeMembers.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  return (
                    <li
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                      key={member.membershipId}
                    >
                      <div className="min-w-0">
                        <span className="font-medium">
                          {member.name}
                          {isSelf ? " (you)" : ""}
                        </span>
                        <span className="block truncate text-muted-foreground">{member.email}</span>
                      </div>
                      <Form method="post">
                        <input name="intent" type="hidden" value="remove-member" />
                        <input name="membershipId" type="hidden" value={member.membershipId} />
                        <Button
                          disabled={isLastMember}
                          size="sm"
                          title={isLastMember ? "Cannot remove the last member" : undefined}
                          type="submit"
                          variant="outline"
                        >
                          {isSelf ? "Leave" : "Remove"}
                        </Button>
                      </Form>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Pending invites
            </h3>
            {pendingMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <ul className="space-y-2">
                {pendingMembers.map((member) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    key={member.membershipId}
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{member.email}</span>
                      <span className="ml-2 text-xs text-muted-foreground">Invited</span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        onClick={() => copyInvite(member.membershipId, member.email)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Copy className="size-4" />
                        {copiedId === member.membershipId ? "Copied" : "Copy invite"}
                      </Button>
                      <Form method="post">
                        <input name="intent" type="hidden" value="cancel-invite" />
                        <input name="membershipId" type="hidden" value={member.membershipId} />
                        <Button size="sm" type="submit" variant="outline">
                          Cancel
                        </Button>
                      </Form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="add-member" />
            <div className="space-y-2">
              <Label htmlFor="email">Invite by email</Label>
              <Input
                autoComplete="email"
                id="email"
                name="email"
                placeholder="friend@example.com"
                required
                type="email"
              />
            </div>
            <Button type="submit">Invite</Button>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete pantry</CardTitle>
          <CardDescription>
            Permanently removes this pantry and all its recipes, shopping lists, and odd bits.
            Members lose access. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            type="button"
            variant="outline"
          >
            Delete pantry
          </Button>
        </CardContent>
      </Card>

      <DeletePantrySheet onOpenChange={setDeleteOpen} open={deleteOpen} pantryName={pantry.name} />
    </div>
  );
}
