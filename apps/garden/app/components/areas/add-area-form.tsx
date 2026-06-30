import { useEffect, useState } from "react";
import { useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type CreateActionData = { created: true } | { error: string };

export function AddAreaForm() {
  const fetcher = useFetcher<CreateActionData>();
  const [name, setName] = useState("");
  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && "created" in fetcher.data) {
      setName("");
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form className="space-y-4" method="post">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Front border"
          required
          value={name}
        />
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Adding…" : "Add area"}
      </Button>
    </fetcher.Form>
  );
}
