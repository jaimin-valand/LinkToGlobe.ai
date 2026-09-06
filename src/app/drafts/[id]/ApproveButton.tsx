"use client";

import { Button } from "@/components/ui/primitives";
import { approveAction } from "../actions";

export function ApproveButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={approveAction}
      onSubmit={(e) => {
        if (!window.confirm(`Approve and publish "${title}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit">Approve and publish</Button>
    </form>
  );
}
