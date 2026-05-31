import type { ReactNode } from "react";

/**
 * Liquid Glass UI primitives (web). Thin wrappers over the `.glass*` classes
 * in globals.css so pages compose consistent surfaces without repeating
 * class strings. Keep these presentational — no data fetching here.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** More opaque surface — use for the sidebar, modals, key panels. */
  strong?: boolean;
  /** Lift + brighten on hover (for clickable cards). */
  interactive?: boolean;
}

export function GlassCard({ children, className, strong, interactive }: GlassCardProps) {
  return (
    <div
      className={cx(
        strong ? "glass-strong" : "glass",
        interactive && "glass-interactive",
        "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface PageHeadingProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeading({ title, description, actions }: PageHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, hint, icon, accent }: StatCardProps) {
  return (
    <div className="glass glass-interactive p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-faint">
          {label}
        </span>
        {icon && (
          <span className={cx("text-lg", accent && "text-[var(--accent)]")}>{icon}</span>
        )}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

type StatusTone = "ok" | "warn" | "bad" | "idle";

const TONE_STYLES: Record<StatusTone, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  bad: "bg-red-500/15 text-red-600 dark:text-red-300",
  idle: "bg-white/10 text-faint",
};

export function StatusDot({ tone }: { tone: StatusTone }) {
  const color =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "bad"
          ? "bg-red-500"
          : "bg-neutral-400";
  return (
    <span className="relative flex h-2.5 w-2.5">
      {tone === "ok" && (
        <span className={cx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", color)} />
      )}
      <span className={cx("relative inline-flex h-2.5 w-2.5 rounded-full", color)} />
    </span>
  );
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_STYLES[tone],
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}
