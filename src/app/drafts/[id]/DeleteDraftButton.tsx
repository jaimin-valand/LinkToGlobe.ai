"use client";

import { Button } from "@/components/ui/primitives";
import { deleteDraftAction } from "../actions";

export function DeleteDraftButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteDraftAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" className="text-red-600">
        Delete
      </Button>
    </form>
  );
}
