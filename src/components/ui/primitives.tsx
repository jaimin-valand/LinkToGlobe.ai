import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const variants = {
  primary: "bg-signal text-signal-fg hover:opacity-90",
  secondary: "border border-border bg-surface hover:bg-bg",
  danger:
    "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40",
  ghost: "text-fg-muted hover:bg-bg hover:text-fg",
} as const;

type Variant = keyof typeof variants;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(buttonBase, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(buttonBase, variants[variant], className)} {...props} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-fg-muted text-xs">{hint}</p>}
    </div>
  );
}

const controlBase =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-24 resize-y", className)} {...props} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("border-border bg-surface rounded-lg border p-5", className)}>
      {children}
    </div>
  );
}

const badgeTone = {
  neutral: "bg-bg text-fg-muted border border-border",
  signal: "bg-signal/10 text-signal",
  reach: "bg-reach/15 text-reach",
  green: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof badgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        badgeTone[tone],
      )}
    >
      {children}
    </span>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-fg-muted mt-1 text-sm">{children}</div>}
    </div>
  );
}
