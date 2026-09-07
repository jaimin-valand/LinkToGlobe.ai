"use client";

import { useActionState, useRef } from "react";
import { Button, Field, Textarea } from "@/components/ui/primitives";
import { addHookAction, type AddHookState } from "./actions";

const initial: AddHookState = {};

export function AddHookForm({ ideaId }: { ideaId: string }) {
  const [state, action, pending] = useActionState(addHookAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await action(fd);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="ideaId" value={ideaId} />
      <Field
        label="Write your own"
        htmlFor="hook-text"
        hint="It gets the same checks as the AI options."
      >
        <Textarea
          id="hook-text"
          name="text"
          required
          maxLength={400}
          rows={2}
          placeholder="An opening line in your own words"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add candidate"}
        </Button>
        {state.error && (
          <span className="text-sm text-red-600" role="alert">
            {state.error}
          </span>
        )}
        {state.ok && !state.error && (
          <span className="text-fg-muted text-xs" role="status">
            Added.
          </span>
        )}
      </div>
    </form>
  );
}
