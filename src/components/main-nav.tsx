"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  SunMedium,
  CalendarRange,
  FileText,
  FolderKanban,
  Settings as SettingsIcon,
} from "lucide-react";
import logo from "../../public/weekline-icon.png";

const navItems = [
  { href: "/", label: "Today", icon: SunMedium },
  { href: "/week", label: "Week", icon: CalendarRange },
  { href: "/summary", label: "Summary", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const MainNav = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        {/* Left: logo + product name */}
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <Image
              src={logo}
              alt="Weekline logo"
              fill
              sizes="32px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden flex-col text-xs text-[var(--text-muted)] sm:flex">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Weekline
            </span>
            <span>Quiet Stack Labs · Focus tracking</span>
          </div>
        </div>

        {/* Center: nav tabs */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
                    isActive
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right: auth */}
        <div className="flex items-center gap-2">
          {isAuthenticated && session?.user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-1 text-xs text-[var(--text-muted)] sm:flex">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[0.7rem] font-semibold text-[var(--text-primary)]">
                  {(session.user.name || session.user.email || "?")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="max-w-[140px] truncate">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                onClick={() =>
                  signOut({
                    callbackUrl: "/",
                  })
                }
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="bg-[var(--accent-solid)] text-xs font-medium text-slate-900 hover:brightness-75"
              onClick={() => signIn()} // shows provider chooser (GitHub / Google)
            >
              Sign in
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex gap-1 border-t border-[var(--border-subtle)] px-2 py-2 text-xs text-[var(--text-muted)] md:hidden">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <button
                aria-current={isActive ? "page" : undefined}
                className={[
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[0.7rem] transition",
                  isActive
                    ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export { MainNav };
