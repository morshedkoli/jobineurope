import type { CSSProperties } from "react";

/**
 * Brand identity for jobineurope. The mark is the accent-gradient tile with a
 * specular top edge (the same liquid-glass cue used across the UI) and a
 * geometric lowercase "j". Kept here as the single source of truth so the
 * sidebar, login screen, and favicon stay in sync.
 */

interface BrandMarkProps {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function BrandMark({ size = 36, className, style, title }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="bm-tile" x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#6d5efc" />
          <stop offset="1" stopColor="#5b4ef0" />
        </linearGradient>
        <linearGradient id="bm-spec" x1="32" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#bm-tile)" />
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#bm-spec)" />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="17.25"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <circle cx="37" cy="18" r="4.6" fill="#ffffff" />
      <path
        d="M37 27.5 L37 41.5 C37 50, 30 54, 22.5 50.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LogoProps {
  /** Mark size in px; the wordmark scales alongside it. */
  size?: number;
  /** Hide the "jobineurope" wordmark, showing only the mark. */
  markOnly?: boolean;
  className?: string;
}

export function Logo({ size = 36, markOnly, className }: LogoProps) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <BrandMark
        size={size}
        title="jobineurope"
        style={{ filter: "drop-shadow(0 4px 14px color-mix(in oklab, var(--accent) 45%, transparent))" }}
      />
      {!markOnly && (
        <span className="text-base font-semibold tracking-tight">jobineurope</span>
      )}
    </span>
  );
}
