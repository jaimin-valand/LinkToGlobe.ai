"use client";

/** Catches errors thrown by the root layout. Must render its own <html>/<body>. */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem" }}>LinkToGlobe.ai could not load</h1>
        <p style={{ color: "#5a5b74" }}>Something broke while loading. Try reloading the page.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#3b46f1",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
