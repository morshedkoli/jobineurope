"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/jobs", label: "Jobs", icon: "search" },
  { href: "/applied", label: "Applied", icon: "briefcase" },
  { href: "/profile", label: "Profile", icon: "user" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

const ICONS = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  briefcase: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.8 7.8 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.8 7.8 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7.8 7.8 0 0 0-1.7 1l-2.3-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.8 7.8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.8 7.8 0 0 0 1.7-1l2.3 1 2-3.4z",
} as const;

function NavIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-muted hover:bg-white/40 hover:text-[var(--fg)] dark:hover:bg-white/5",
            ].join(" ")}
          >
            <span
              className={
                active
                  ? "text-[var(--accent)]"
                  : "text-faint transition-colors group-hover:text-[var(--fg)]"
              }
            >
              <NavIcon name={item.icon} />
            </span>
            {item.label}
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="glass-btn !px-2.5"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
        <Brand />
        <span className="w-9" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="glass-strong absolute left-0 top-0 h-full w-72 rounded-none rounded-r-3xl p-5">
            <Brand />
            <div className="mt-6">{nav}</div>
          </aside>
        </div>
      )}

      {/* Desktop fixed sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:p-4">
        <div className="glass-strong flex h-full flex-col rounded-3xl p-5">
          <Brand />
          <div className="mt-8 flex-1">{nav}</div>
          <div className="px-3">
            <div className="section-divider" />
            <p className="text-xs text-faint">
              DE · RO · job search
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <Link href="/" className="px-1">
      <Logo size={34} />
    </Link>
  );
}
