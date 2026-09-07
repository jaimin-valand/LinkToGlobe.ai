/**
 * Static, non-secret site metadata. Safe to import from client or server.
 */
export const site = {
  name: "LinkToGlobe.ai",
  tagline: "Write, check, and approve professional content in one place.",
  description:
    "Draft content from your own expertise, run it through automated checks, and approve it yourself before it counts as published.",
  nav: [
    { label: "Overview", href: "/" },
    { label: "Knowledge", href: "/knowledge", auth: true },
    { label: "Drafts", href: "/drafts", auth: true },
    { label: "Approvals", href: "/approvals", auth: true },
    { label: "Analytics", href: "/analytics", auth: true },
    { label: "Integrations", href: "/settings/integrations", auth: true },
  ],
} as const;

export type SiteNavItem = (typeof site.nav)[number];
