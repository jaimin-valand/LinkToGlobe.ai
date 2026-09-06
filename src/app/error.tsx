"use client";

import { useEffect } from "react";

/** Route-level error boundary. Next 16 passes `retry` (previously `reset`). */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Phase 6 wires this to a real error reporter.
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-fg-muted">This page hit an error. Trying again may fix it.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="bg-signal text-signal-fg rounded-md px-4 py-2 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
