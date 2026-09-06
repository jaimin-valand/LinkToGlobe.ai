/** Route-level loading state, shown while a server segment streams in. */
export default function Loading() {
  return (
    <div className="text-fg-muted flex items-center gap-3 py-16" role="status" aria-live="polite">
      <span
        className="border-border border-t-signal h-4 w-4 animate-spin rounded-full border-2"
        aria-hidden="true"
      />
      <span>Loading…</span>
    </div>
  );
}
