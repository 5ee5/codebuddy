import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";
import { NavLinks } from "@/components/nav-links";
import { StatusBadge } from "@/components/status-badge";

/*
 * Responsive application frame (server component).
 * - The single <header> is a compact top bar on mobile and becomes a fixed
 *   sidebar with full navigation from the `md` breakpoint up.
 * - On mobile a bottom tab bar provides navigation instead of a hamburger
 *   drawer: always visible, no focus trap or open/close state to manage.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md md:h-dvh md:border-r md:border-b-0 md:bg-surface md:backdrop-blur-none">
        <div className="flex h-14 items-center justify-between gap-3 px-4 md:h-full md:flex-col md:items-stretch md:justify-start md:gap-8 md:px-3 md:py-5">
          <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-md md:px-2">
            <LogoMark />
            <span className="font-display text-lg leading-none font-semibold">CodeBuddy</span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <NavLinks variant="sidebar" />
          </nav>

          <div className="md:mt-auto md:space-y-2.5 md:border-t md:border-line md:px-2 md:pt-4">
            <StatusBadge />
            <p className="hidden text-xs leading-relaxed text-muted md:block">
              Learn and Debug answers come from Claude. Practice still shows the request that
              would be sent.
            </p>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] focus:outline-none md:pb-0"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12 lg:px-10">
          {children}
        </div>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <NavLinks variant="tabs" />
      </nav>
    </div>
  );
}
