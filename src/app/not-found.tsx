import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-fg-muted font-mono text-sm">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-fg-muted">We could not find that page.</p>
      <Link href="/" className="text-signal underline underline-offset-4">
        Back to the overview
      </Link>
    </div>
  );
}
