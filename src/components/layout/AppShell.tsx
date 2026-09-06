import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { site } from "@/config/site";

export interface ShellUser {
  email: string;
  name: string | null;
}

/**
 * The application frame: skip link, header with navigation, main landmark,
 * and footer. `user` is resolved server-side in the root layout.
 */
export function AppShell({ children, user }: { children: ReactNode; user: ShellUser | null }) {
  const nav = site.nav.filter((item) => !("auth" in item && item.auth) || user);

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="focus:bg-signal focus:text-signal-fg sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="border-border bg-surface border-b">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label={`${site.name} home`}>
            <Logo />
          </Link>

          <nav aria-label="Primary" className="flex-1">
            <ul className="flex items-center gap-1 text-sm">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-fg-muted hover:bg-bg hover:text-fg rounded-md px-3 py-2 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-fg-muted hidden sm:inline">{user.name || user.email}</span>
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="border-border text-fg-muted hover:bg-bg hover:text-fg rounded-md border px-3 py-1.5 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-signal text-signal-fg rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Sign in
            </Link>
          )}
        </Container>
      </header>

      <main id="main" className="flex-1">
        <Container className="py-10">{children}</Container>
      </main>

      <footer className="border-border bg-surface border-t">
        <Container className="text-fg-muted flex flex-col gap-1 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {site.name} — {site.tagline}
          </p>
          <p>Phase 1 · Core MVP</p>
        </Container>
      </footer>
    </div>
  );
}
