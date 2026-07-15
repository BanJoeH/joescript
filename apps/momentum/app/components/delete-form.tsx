import { Form } from "react-router";

import { Button } from "~/components/ui/button";

type DeleteFormProps = {
  confirmMessage: string;
  hiddenFields?: Record<string, string>;
  intent?: string;
  className?: string;
};

export function DeleteForm({
  confirmMessage,
  hiddenFields = {},
  intent = "delete",
  className,
}: DeleteFormProps) {
  return (
    <Form
      className={className}
      method="post"
      onSubmit={(event) => {
        if (!confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input name="intent" type="hidden" value={intent} />
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <Button
        className="text-destructive hover:text-destructive"
        size="sm"
        type="submit"
        variant="outline"
      >
        Delete
      </Button>
    </Form>
  );
}
