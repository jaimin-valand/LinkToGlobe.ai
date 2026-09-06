import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { site } from "@/config/site";

/**
 * The application frame: skip link, header with navigation placeholder,
 * main landmark, and footer. Real auth/user state arrives in Phase 1.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="focus:bg-signal focus:text-signal-fg sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <header className="border-border bg-surface border-b">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" aria-label={`${site.name} home`}>
            <Logo />
          </Link>
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1 text-sm">
              {site.nav.map((item) => (
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
          <p>Phase 0 · Foundation</p>
        </Container>
      </footer>
    </div>
  );
}
