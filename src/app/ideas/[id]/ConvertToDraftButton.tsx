"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { convertIdeaToDraftAction, type ConvertIdeaState } from "../actions";

const initial: ConvertIdeaState = {};

export function ConvertToDraftButton({ ideaId }: { ideaId: string }) {
  const [state, action, pending] = useActionState(convertIdeaToDraftAction, initial);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="ideaId" value={ideaId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating draft…" : "Turn into draft"}
      </Button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
