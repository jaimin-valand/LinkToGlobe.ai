"use client";

import { useActionState } from "react";
import { Button, FormError, Input } from "@/components/ui/primitives";
import { runResearchAction, type RunResearchState } from "./actions";

const initial: RunResearchState = {};

export function SearchForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(runResearchAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="query"
          type="search"
          required
          minLength={3}
          maxLength={200}
          placeholder="What do you want to research?"
          aria-label="Research query"
          disabled={!configured || pending}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={!configured || pending}>
          {pending ? "Researching…" : "Research"}
        </Button>
      </div>
      <FormError message={state.error} />
      {state.notConfigured && (
        <p role="alert" className="text-fg-muted text-sm">
          Research provider not configured. See the panel below.
        </p>
      )}
      {!configured && (
        <p className="text-fg-muted text-sm">Set up a research provider to enable search.</p>
      )}
    </form>
  );
}
