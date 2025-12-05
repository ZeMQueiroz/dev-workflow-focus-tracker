"use client";

import { useEffect, useState } from "react";
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
  Sparkles,
  ChevronDown,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlanModalTrigger } from "@/components/plan-modal-trigger";
import logo from "../../public/weekline-icon.png";

const navItems = [
  { href: "/today", label: "Today", icon: SunMedium },
  { href: "/week", label: "Week", icon: CalendarRange },
  { href: "/summary", label: "Summary", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

const MainNav = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [isPro, setIsPro] = useState<boolean | null>(null);

  // Welcome / marketing page?
  const isWelcome = pathname === "/welcome";

  // Fetch plan status only on the client when signed in
  useEffect(() => {
    if (!isAuthenticated) {
      setIsPro(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/subscription/status");
        if (!res.ok) throw new Error("Failed to fetch subscription status");
        const data = await res.json();
        if (!cancelled) {
          setIsPro(Boolean(data.isPro) || data.plan === "PRO");
        }
      } catch {
        if (!cancelled) {
          // If it fails, worst case we still show an upgrade CTA
          setIsPro(false);
        }
      }
    };

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const initials = (session?.user?.name || session?.user?.email || "?")
    .slice(0, 2)
    .toUpperCase();
  const displayName = session?.user?.name || session?.user?.email || "Account";

  return (
    <header className="app-nav sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
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
            <span>by Quiet Stack Labs</span>
          </div>
        </div>

        {/* Center: nav tabs (hidden on /welcome) */}
        {!isWelcome && (
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navItems.map((item) => {
              const isActive =
                item.href === "/today"
                  ? pathname === "/today"
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
        )}

        {/* Right: auth + upgrade CTA + user dropdown */}
        <div className="flex items-center gap-2">
          {isAuthenticated && session?.user ? (
            <>
              {/* Upgrade pill for free users (desktop only, not on welcome) */}
              {!isWelcome && isPro === false && (
                <PlanModalTrigger currentPlan="free">
                  <Button
                    size="sm"
                    className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--accent-solid)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-on-accent)] shadow-sm hover:brightness-110"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Upgrade</span>
                  </Button>
                </PlanModalTrigger>
              )}

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                    aria-label="Account menu"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-surface)] text-[0.7rem] font-semibold text-[var(--text-primary)]">
                      {initials}
                    </div>
                    <span className="hidden max-w-[140px] truncate sm:inline">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-44 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                >
                  <DropdownMenuLabel className="flex items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
                    <User className="h-3 w-3" />
                    <span className="truncate">{displayName}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 text-[var(--text-primary)]"
                    >
                      <Settings className="h-3 w-3 text-[var(--text-muted)]" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="flex items-center gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-200"
                    onClick={(event) => {
                      event.preventDefault();
                      signOut({ callbackUrl: "/welcome" });
                    }}
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              className="bg-[var(--accent-solid)] text-xs font-medium text-slate-900 hover:brightness-75"
              onClick={() => signIn(undefined, { callbackUrl: "/today" })}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav – hidden on /welcome */}
      {!isWelcome && (
        <nav className="flex gap-1 border-t border-[var(--border-subtle)] px-2 py-2 text-xs text-[var(--text-muted)] md:hidden">
          {navItems.map((item) => {
            const isActive =
              item.href === "/today"
                ? pathname === "/today"
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
      )}
    </header>
  );
};

export { MainNav };
