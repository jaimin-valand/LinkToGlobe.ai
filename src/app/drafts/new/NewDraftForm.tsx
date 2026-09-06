"use client";

import { useActionState } from "react";
import { Button, Field, FormError, Input } from "@/components/ui/primitives";
import { createDraftAction, type CreateState } from "../actions";

const initial: CreateState = {};

export function NewDraftForm() {
  const [state, action, pending] = useActionState(createDraftAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field label="Title" htmlFor="title" hint="You can change this later.">
        <Input id="title" name="title" required autoFocus maxLength={200} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
