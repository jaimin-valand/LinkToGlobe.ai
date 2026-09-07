"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { clearSelectionAction, type CandidateActionState } from "./actions";

const initial: CandidateActionState = {};

export function ClearSelectionButton({ ideaId }: { ideaId: string }) {
  const [state, action, pending] = useActionState(clearSelectionAction, initial);

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="ideaId" value={ideaId} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "Clearing…" : "Clear selection"}
      </Button>
      {state.error && (
        <span className="text-sm text-red-600" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
