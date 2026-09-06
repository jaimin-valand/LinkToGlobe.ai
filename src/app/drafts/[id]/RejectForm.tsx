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
      <Textarea name="reason" rows={2} placeholder="Why is this being rejected?" required />
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "…" : "Reject"}
        </Button>
      </div>
    </form>
  );
}
