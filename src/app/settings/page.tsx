import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { getCurrentUserEmail } from "@/lib/server-auth";
import { ThemeSelector } from "@/components/theme-selector";
import { InlineSignInButton } from "@/components/inline-sign-in-button";
import {
  LayoutDashboard,
  Palette,
  Database,
  Timer,
  History,
  User,
} from "lucide-react";

const SettingsPage = async () => {
  const session = await getServerSession(authOptions);
  const ownerEmail = await getCurrentUserEmail();

  if (!session || !ownerEmail) {
    return (
      <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="mt-2">
          Please sign in using the button in the top-right (GitHub or Google) to
          view your profile and appearance settings.
        </p>
        <InlineSignInButton />
      </div>
    );
  }

  const user = session.user;
  const { start, end } = getWeekRange(0);

  const [sessionsThisWeek, lifetimeStats] = await Promise.all([
    prisma.session.findMany({
      where: {
        ownerEmail,
        startTime: {
          gte: start,
          lt: end,
        },
      },
      select: {
        durationMs: true,
      },
    }),
    prisma.session.aggregate({
      where: { ownerEmail },
      _sum: { durationMs: true },
      _count: { _all: true },
    }),
  ]);

  const totalWeekMs = sessionsThisWeek.reduce(
    (acc, s) => acc + s.durationMs,
    0
  );
  const lifetimeMs = lifetimeStats._sum.durationMs ?? 0;
  const lifetimeSessions = lifetimeStats._count._all ?? 0;

  return (
    <div className="-mx-4 md:-mx-8">
      {/* Page header */}
      <header className="px-4 pb-4 md:px-8">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your account and how Focus Tracker feels to use.
        </p>
      </header>

      <div className="flex gap-4 px-4 pb-6 md:gap-6 md:px-8">
        {/* LEFT: sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-[4.5rem] flex h-[calc(100vh-5rem)] flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {/* User */}
            <div className="border-b border-[var(--border-subtle)] px-4 py-4">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? user.email ?? "User avatar"}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border border-[var(--border-subtle)] object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)]">
                    {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {user.name || user.email}
                  </div>
                  {user.email && (
                    <div className="truncate text-[0.7rem] text-[var(--text-muted)]">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>

              <dl className="mt-3 space-y-1.5 text-[0.7rem] text-[var(--text-muted)]">
                <div className="flex items-center justify-between">
                  <dt>Status</dt>
                  <dd className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <User className="h-3 w-3" />
                    Signed in
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>This week</dt>
                  <dd className="inline-flex items-center gap-1 font-mono text-[var(--text-muted)]">
                    <Timer className="h-3 w-3" />
                    {formatDuration(totalWeekMs)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-3 text-xs">
              <div className="px-2 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Sections
              </div>
              <ul className="mt-2 space-y-1">
                <li>
                  <a
                    href="#general"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>General</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#appearance"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <Palette className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Appearance</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#data"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <Database className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Data &amp; exports</span>
                  </a>
                </li>
              </ul>
            </nav>

            <div className="border-t border-[var(--border-subtle)] px-4 py-3 text-[0.65rem] text-[var(--text-muted)]">
              Future settings (notifications, integrations, Pro features) can
              live here as we grow the app.
            </div>
          </div>
        </aside>

        {/* RIGHT: main content */}
        <main className="flex-1 space-y-6">
          {/* Mobile user header */}
          <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:hidden">
            <div className="flex items-center gap-3">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? user.email ?? "User avatar"}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border border-[var(--border-subtle)] object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)]">
                  {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {user.name || user.email}
                </div>
                {user.email && (
                  <div className="truncate text-[0.7rem] text-[var(--text-muted)]">
                    {user.email}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <User className="h-3 w-3" />
                Signed in
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 font-mono text-[var(--text-primary)]">
                <Timer className="h-3 w-3" />
                {formatDuration(totalWeekMs)} this week
              </span>
            </div>
          </section>

          {/* GENERAL */}
          <section
            id="general"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              General
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Account details and a quick snapshot of your focused time.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    This week
                  </div>
                  <Timer className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="mt-2 text-2xl font-mono text-[var(--text-primary)]">
                  {formatDuration(totalWeekMs)}
                </div>
                <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                  Logged in the current week.
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Lifetime focus
                  </div>
                  <History className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="mt-2 text-2xl font-mono text-[var(--text-primary)]">
                  {formatDuration(lifetimeMs)}
                </div>
                <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                  Total tracked time across all sessions.
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Sessions logged
                  </div>
                  <LayoutDashboard className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="mt-2 text-2xl font-mono text-[var(--text-primary)]">
                  {lifetimeSessions}
                </div>
                <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                  Individual focus blocks you&apos;ve created.
                </p>
              </div>
            </div>
          </section>

          {/* APPEARANCE */}
          <section
            id="appearance"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Appearance
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Choose one of the built-in themes. Changes apply instantly and are
              remembered for your next visit.
            </p>

            <ThemeSelector />

            {/* Roadmap / disabled extras */}
            <div className="mt-5 space-y-3 text-sm text-[var(--text-primary)]">
              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-[var(--text-muted)] opacity-60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Extra palettes
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
                    Roadmap
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  More community-inspired palettes and seasonal themes will
                  appear here later.
                </p>
              </div>

              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-[var(--text-muted)] opacity-60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Custom theme builder
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
                    Pro roadmap
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Eventually you&apos;ll be able to tune accent, base, and
                  typography here and save your own presets.
                </p>
              </div>
            </div>
          </section>

          {/* DATA & EXPORTS */}
          <section
            id="data"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Data &amp; exports
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Control how your tracking data is exported and, in the future, how
              it syncs with other tools.
            </p>

            <div className="mt-4 space-y-3 text-sm text-[var(--text-primary)]">
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Weekly exports
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  You can already export CSV / JSON from the Weekly summary
                  page. This section will later let you configure destinations
                  and automation.
                </p>
              </div>

              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-[var(--text-muted)] opacity-60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Automatic exports
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
                    Roadmap
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Schedule weekly or monthly exports to email, storage, or
                  another app once this feature ships.
                </p>
              </div>

              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-[var(--text-muted)] opacity-60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Integrations
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
                    Pro roadmap
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Notion, Obsidian, and calendar sync will live here once we add
                  them. For now, exports are manual only.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
