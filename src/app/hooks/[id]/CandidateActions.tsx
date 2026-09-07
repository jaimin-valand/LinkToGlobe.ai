"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { removeHookAction, selectHookAction, type CandidateActionState } from "./actions";

const initial: CandidateActionState = {};

export function CandidateActions({
  candidateId,
  ideaId,
  isSelected,
}: {
  candidateId: string;
  ideaId: string;
  isSelected: boolean;
}) {
  const [selectState, select, selecting] = useActionState(selectHookAction, initial);
  const [removeState, remove, removing] = useActionState(removeHookAction, initial);
  const error = selectState.error ?? removeState.error;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isSelected ? (
        <span className="text-signal text-sm font-medium">Selected for the draft</span>
      ) : (
        <form action={select}>
          <input type="hidden" name="candidateId" value={candidateId} />
          <Button type="submit" disabled={selecting}>
            {selecting ? "Selecting…" : "Use this hook"}
          </Button>
        </form>
      )}
      <form action={remove}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="ideaId" value={ideaId} />
        <Button type="submit" variant="ghost" disabled={removing}>
          {removing ? "Removing…" : "Remove"}
        </Button>
      </form>
      {error && (
        <span className="text-sm text-red-600" role="alert">
          {error}
        </span>
      )}
      {selectState.draftUpdated && !error && (
        <span className="text-fg-muted text-xs" role="status">
          The draft hook was updated too.
        </span>
      )}
    </div>
  );
}
