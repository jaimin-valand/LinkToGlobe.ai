"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { generateHooksAction, type GenerateState } from "./actions";

const initial: GenerateState = {};

export function GenerateHooksButton({
  ideaId,
  hasCandidates,
}: {
  ideaId: string;
  hasCandidates: boolean;
}) {
  const [state, action, pending] = useActionState(generateHooksAction, initial);

  return (
    <div className="flex flex-col gap-1.5">
      <form action={action}>
        <input type="hidden" name="ideaId" value={ideaId} />
        <Button type="submit" variant={hasCandidates ? "secondary" : "primary"} disabled={pending}>
          {pending ? "Generating…" : hasCandidates ? "Generate more" : "Generate with AI"}
        </Button>
      </form>
      {pending && (
        <p className="text-fg-muted text-xs" role="status">
          Asking the AI provider for options. This can take a few seconds.
        </p>
      )}
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {typeof state.added === "number" && !state.error && (
        <p className="text-fg-muted text-xs" role="status">
          {state.added === 0
            ? "No new hooks this time."
            : `Added ${state.added} ${state.added === 1 ? "candidate" : "candidates"}.`}
        </p>
      )}
    </div>
  );
}
