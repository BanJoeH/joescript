import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type AreaFormProps = {
  cancelTo: string;
  defaultName?: string;
  error?: string | null;
  submitLabel: string;
};

export function AreaForm({
  cancelTo,
  defaultName = "",
  error,
  submitLabel,
}: AreaFormProps) {
  return (
    <Form className="space-y-4" method="post">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          defaultValue={defaultName}
          id="name"
          name="name"
          placeholder="Front border"
          required
        />
      </div>
      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button asChild variant="outline">
          <Link to={cancelTo}>Cancel</Link>
        </Button>
      </div>
    </Form>
  );
}
