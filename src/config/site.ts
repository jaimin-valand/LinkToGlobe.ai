/**
 * Static, non-secret site metadata. Safe to import from client or server.
 */
export const site = {
  name: "LinkToGlobe",
  tagline: "Connect professional knowledge, ideas, and content to the wider world.",
  description:
    "LinkToGlobe turns your professional knowledge into researched, quality-reviewed content — with an explicit human approval step before anything is published.",
  nav: [
    { label: "Overview", href: "/" },
    { label: "Pipeline", href: "/pipeline" },
    { label: "Approvals", href: "/approvals" },
    { label: "Analytics", href: "/analytics" },
  ],
} as const;

export type SiteNavItem = (typeof site.nav)[number];
