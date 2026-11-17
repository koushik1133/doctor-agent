"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/find", label: "Find a doctor" },
  { href: "/doctors/join", label: "For doctors" },
  { href: "/admin", label: "Review queue" },
];

export function SiteHeader() {
  const path = usePathname();
  if (path?.startsWith("/patient") || path?.startsWith("/doctor/") || path === "/doctor") return null;
  return (
    <header className="print:hidden border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75 sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-[17px] font-semibold tracking-tight sm:text-[19px]">
          <Mark />
          Referral Desk
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 text-[14px] sm:gap-1 sm:text-[15px]">
          {NAV.map((n) => {
            const active = path === n.href || path?.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-2 py-1.5 transition-colors sm:px-2.5 ${
                  active ? "bg-pine-wash text-ink" : "text-ink-2 hover:text-ink"
                } ${n.href === "/admin" ? "hidden sm:inline-block" : ""}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

// A folded referral slip with a highlighter stroke.
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M4 2.5h9.5L18 7v12.5H4z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.5 2.5V7H18" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="6.5" y="10" width="9" height="3" rx="0.8" fill="var(--marker)" />
      <path d="M6.5 16h6" stroke="var(--ink-3)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
