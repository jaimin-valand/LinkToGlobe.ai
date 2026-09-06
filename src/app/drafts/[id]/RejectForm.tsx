"use client";

import { useActionState } from "react";
import { Button, FormError, Textarea } from "@/components/ui/primitives";
import { rejectAction, type RejectState } from "../actions";

const initial: RejectState = {};

export function RejectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(rejectAction, initial);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <FormError message={state.error} />
      <Textarea
        name="reason"
        rows={2}
        placeholder="What needs to change before this can be published?"
        required
        aria-label="Reason for sending back"
      />
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Working…" : "Send back with this reason"}
        </Button>
      </div>
    </form>
  );
}
