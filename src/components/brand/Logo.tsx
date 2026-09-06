import type { SVGProps } from "react";

/**
 * LinkToGlobe.ai mark: a meridian globe with an orbiting link node.
 * Original artwork; no third-party brand elements.
 */
export function LogoMark({
  title = "LinkToGlobe.ai",
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="15" cy="17" r="9" stroke="var(--color-meridian)" strokeWidth="2" />
      <path
        d="M15 8c3 2.6 4.5 5.7 4.5 9s-1.5 6.4-4.5 9M15 8c-3 2.6-4.5 5.7-4.5 9s1.5 6.4 4.5 9M6.4 13.5h17.2M6.4 20.5h17.2"
        stroke="var(--color-meridian)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="26" cy="7" r="3.5" fill="var(--color-signal)" />
      <path d="M23.2 9.8 18 15" stroke="var(--color-reach)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
    >
      <LogoMark width={28} height={28} />
      <span className="text-lg font-semibold tracking-tight">
        Link<span className="text-signal">To</span>Globe
        <span className="text-fg-muted font-normal">.ai</span>
      </span>
    </span>
  );
}
