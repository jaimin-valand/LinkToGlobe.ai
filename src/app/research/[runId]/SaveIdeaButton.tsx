"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";
import { saveIdeaAction, type SaveIdeaState } from "../actions";

const initial: SaveIdeaState = {};

export function SaveIdeaButton({
  signalId,
  runId,
  savedIdeaId,
}: {
  signalId: string;
  runId: string;
  savedIdeaId: string | null;
}) {
  const [state, action, pending] = useActionState(saveIdeaAction, initial);
  const ideaId = savedIdeaId ?? state.ideaId;

  if (ideaId) {
    return (
      <p className="text-fg-muted text-sm">
        Saved as an idea.{" "}
        <Link href={`/ideas/${ideaId}`} className="text-signal underline underline-offset-2">
          View idea
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="signalId" value={signalId} />
      <input type="hidden" name="runId" value={runId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save as idea"}
      </Button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
