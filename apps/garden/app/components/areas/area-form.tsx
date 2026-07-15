import { useState } from "react";
import { Form, Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { SUGGESTED_AREA_NAMES } from "~/lib/suggested-areas";
import { cn } from "~/lib/utils";

type AreaFormProps = {
  cancelTo: string;
  defaultName?: string;
  error?: string | null;
  quickAdd?: boolean;
  submitLabel: string;
  suggestedNames?: readonly string[];
};

export function AreaForm({
  cancelTo,
  defaultName = "",
  error,
  quickAdd = false,
  submitLabel,
  suggestedNames = SUGGESTED_AREA_NAMES,
}: AreaFormProps) {
  const [name, setName] = useState(defaultName);

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
          autoFocus={quickAdd}
          id="name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Front border"
          required
          value={name}
        />
        {quickAdd && suggestedNames.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestedNames.map((suggestion) => (
              <button
                aria-pressed={name === suggestion}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent",
                  name === suggestion && "border-primary bg-primary/10",
                )}
                key={suggestion}
                onClick={() => setName(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        {quickAdd ? (
          <>
            <Button name="intent" type="submit" value="saveAndAddAnother">
              Add and add another
            </Button>
            <Button name="intent" type="submit" value="save" variant="outline">
              {submitLabel}
            </Button>
          </>
        ) : (
          <Button name="intent" type="submit" value="save">
            {submitLabel}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to={cancelTo}>Cancel</Link>
        </Button>
      </div>
      {quickAdd ? (
        <p className="text-sm text-muted-foreground">
          <button
            className="text-primary underline-offset-4 hover:underline"
            name="intent"
            type="submit"
            value="saveAndAddPlants"
          >
            Save this area and add plants
          </button>
        </p>
      ) : null}
    </Form>
  );
}
