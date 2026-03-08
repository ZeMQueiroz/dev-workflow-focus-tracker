// src/app/settings/page.tsx
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { ThemeSelector } from "@/components/theme-selector";
import { InlineSignInButton } from "@/components/inline-sign-in-button";
import { getUserProStatus } from "@/lib/subscription";
import { BillingSection } from "@/components/billing-section";
import { PageContainer } from "@/components/page-container";

import {
  LayoutDashboard,
  Palette,
  Database,
  Timer,
  History,
  User,
  CreditCard,
  Bell,
  Plug,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const SettingsPage = async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  // Not signed in
  if (!session?.user || !userId) {
    return (
      <PageContainer variant='workspace'>
        <div className='w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]'>
          <h1 className='text-xl font-semibold text-[var(--text-primary)]'>
            Settings
          </h1>
          <p className='mt-2'>
            Please sign in using the button in the top-right (GitHub or Google)
            to view your Weekline account and settings.
          </p>
          <InlineSignInButton />
        </div>
      </PageContainer>
    );
  }

  const user = session.user;
  const { start, end } = getWeekRange(0);

  const [sessionsThisWeek, lifetimeStats, proStatus] = await Promise.all([
    prisma.session.findMany({
      where: {
        ownerId: userId,
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
      where: { ownerId: userId },
      _sum: { durationMs: true },
      _count: { _all: true },
    }),
    getUserProStatus(userId),
  ]);

  type Milliseconds = number;
  interface SessionThisWeek {
    durationMs: Milliseconds;
  }

  const totalWeekMs: Milliseconds = sessionsThisWeek.reduce<Milliseconds>(
    (acc: Milliseconds, s: SessionThisWeek) => acc + s.durationMs,
    0,
  );
  const lifetimeMs = lifetimeStats._sum.durationMs ?? 0;
  const lifetimeSessions = lifetimeStats._count._all ?? 0;

  const { isPro, proExpiresAt } = proStatus;
  const currentPlan: "free" | "pro" = isPro ? "pro" : "free";

  return (
    <PageContainer variant='workspace'>
      <div>
        {/* Page header */}
        <header className='pb-6'>
          <h1 className='text-2xl font-semibold text-[var(--text-primary)]'>
            Settings
          </h1>
          <p className='mt-1.5 text-sm text-[var(--text-muted)]'>
            Manage your account, plan, and how Weekline fits into your workflow.
          </p>
        </header>

        <div className='grid gap-6 pb-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10'>
          {/* ====================================================== */}
          {/* LEFT: Sidebar                                          */}
          {/* ====================================================== */}
          <aside className='hidden lg:block'>
            <div className='sticky top-[4.5rem] flex h-[calc(100vh-5rem)] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
              {/* User summary */}
              <div className='border-b border-[var(--border-subtle)] px-5 py-5'>
                <div className='flex items-center gap-3'>
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? user.email ?? "User avatar"}
                      width={44}
                      height={44}
                      className='h-11 w-11 rounded-full border border-[var(--border-subtle)] object-cover'
                    />
                  ) : (
                    <div className='flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm font-semibold text-[var(--text-primary)]'>
                      {(user.name || user.email || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}

                  <div className='min-w-0'>
                    <div className='truncate text-sm font-medium text-[var(--text-primary)]'>
                      {user.name || user.email}
                    </div>
                    {user.email && (
                      <div className='truncate text-xs text-[var(--text-muted)]'>
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className='mt-3.5 flex flex-wrap gap-1.5'>
                  <span className='inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 py-1 text-xs text-[var(--text-muted)]'>
                    <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                    Signed in
                  </span>
                  <span className='inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 py-1 text-xs text-[var(--text-muted)]'>
                    <CreditCard className='h-3 w-3' />
                    {isPro ? "Pro" : "Free"}
                  </span>
                </div>
              </div>

              {/* Nav */}
              <nav className='flex-1 overflow-y-auto px-3 py-4'>
                <div className='mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                  Settings
                </div>
                <ul className='space-y-0.5'>
                  {[
                    {
                      href: "#account",
                      icon: LayoutDashboard,
                      label: "Account",
                    },
                    { href: "#appearance", icon: Palette, label: "Appearance" },
                    {
                      href: "#plan",
                      icon: CreditCard,
                      label: "Plan & billing",
                    },
                  ].map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className='flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-soft)]'
                      >
                        <item.icon className='h-[18px] w-[18px] text-[var(--text-muted)]' />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>

                <div className='mb-2 mt-5 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                  Coming soon
                </div>
                <ul className='space-y-0.5'>
                  {[
                    {
                      href: "#data-privacy",
                      icon: Database,
                      label: "Data & privacy",
                    },
                    {
                      href: "#integrations",
                      icon: Plug,
                      label: "Integrations",
                    },
                    {
                      href: "#notifications",
                      icon: Bell,
                      label: "Notifications",
                    },
                  ].map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className='flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-soft)]'
                      >
                        <item.icon className='h-[18px] w-[18px] opacity-60' />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className='border-t border-[var(--border-subtle)] px-5 py-3.5 text-[0.7rem] text-[var(--text-muted)]'>
                More settings will appear as we ship the roadmap.
              </div>
            </div>
          </aside>

          {/* ====================================================== */}
          {/* RIGHT: Main content                                    */}
          {/* ====================================================== */}
          <main className='min-w-0 space-y-10'>
            {/* Mobile user header */}
            <section className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 lg:hidden'>
              <div className='flex items-center gap-3'>
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? user.email ?? "User avatar"}
                    width={40}
                    height={40}
                    className='h-10 w-10 rounded-full border border-[var(--border-subtle)] object-cover'
                  />
                ) : (
                  <div className='flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)]'>
                    {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium text-[var(--text-primary)]'>
                    {user.name || user.email}
                  </div>
                  {user.email && (
                    <div className='truncate text-[0.7rem] text-[var(--text-muted)]'>
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <div className='mt-3 flex flex-wrap gap-2 text-[0.7rem] text-[var(--text-muted)]'>
                <span className='inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                  <User className='h-3 w-3' />
                  Signed in
                </span>
                <span className='inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 font-mono text-[var(--text-primary)]'>
                  <Timer className='h-3 w-3' />
                  {formatDuration(totalWeekMs)} this week
                </span>
                <span className='inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[var(--text-primary)]'>
                  <CreditCard className='h-3 w-3' />
                  {isPro ? "Pro plan" : "Free plan"}
                </span>
              </div>
            </section>

            {/* ================================================== */}
            {/* ACCOUNT                                             */}
            {/* ================================================== */}
            <section id='account' className='scroll-mt-24'>
              <div className='mb-5'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
                  Account
                </h2>
                <p className='mt-1 text-sm text-[var(--text-muted)]'>
                  Your Weekline usage at a glance.
                </p>
              </div>

              {/* Stat cards – cleaner design without inner borders */}
              <div className='grid gap-4 sm:grid-cols-3'>
                <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]'>
                      This week
                    </span>
                    <Timer className='h-4 w-4 text-[var(--accent-solid)] opacity-60' />
                  </div>
                  <div
                    className='mt-3 text-2xl font-semibold tabular-nums text-[var(--text-primary)]'
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {formatDuration(totalWeekMs)}
                  </div>
                  <p className='mt-1 text-xs text-[var(--text-muted)]'>
                    Logged in the current week
                  </p>
                </div>

                <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]'>
                      Lifetime focus
                    </span>
                    <History className='h-4 w-4 text-[var(--accent-solid)] opacity-60' />
                  </div>
                  <div
                    className='mt-3 text-2xl font-semibold tabular-nums text-[var(--text-primary)]'
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {formatDuration(lifetimeMs)}
                  </div>
                  <p className='mt-1 text-xs text-[var(--text-muted)]'>
                    Total tracked across all sessions
                  </p>
                </div>

                <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]'>
                      Sessions logged
                    </span>
                    <LayoutDashboard className='h-4 w-4 text-[var(--accent-solid)] opacity-60' />
                  </div>
                  <div
                    className='mt-3 text-2xl font-semibold tabular-nums text-[var(--text-primary)]'
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {lifetimeSessions}
                  </div>
                  <p className='mt-1 text-xs text-[var(--text-muted)]'>
                    Individual focus blocks captured
                  </p>
                </div>
              </div>

              {/* Sign-in note – lighter */}
              <p className='mt-4 text-xs text-[var(--text-muted)] opacity-70'>
                Signed in with OAuth. Additional login methods will appear here
                when available.
              </p>
            </section>

            {/* ================================================== */}
            {/* APPEARANCE                                          */}
            {/* ================================================== */}
            <section id='appearance' className='scroll-mt-24'>
              <div className='mb-5'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
                  Appearance
                </h2>
                <p className='mt-1 text-sm text-[var(--text-muted)]'>
                  Customize your theme, colors, and motion effects. Changes
                  apply instantly and are remembered on this device.
                </p>
              </div>

              <ThemeSelector />
            </section>

            {/* ================================================== */}
            {/* PLAN & BILLING                                      */}
            {/* ================================================== */}
            <section id='plan' className='scroll-mt-24'>
              <div className='mb-5'>
                <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
                  Plan &amp; billing
                </h2>
                <p className='mt-1 text-sm text-[var(--text-muted)]'>
                  Manage your subscription and billing details.
                </p>
              </div>

              <BillingSection />
            </section>

            {/* ================================================== */}
            {/* COMING SOON – Lighter, grouped region                */}
            {/* ================================================== */}
            <section className='scroll-mt-24'>
              <div className='mb-5 flex items-center gap-2'>
                <div className='h-px flex-1 bg-[var(--border-subtle)]' />
                <span className='shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] opacity-60'>
                  Coming soon
                </span>
                <div className='h-px flex-1 bg-[var(--border-subtle)]' />
              </div>

              <div className='space-y-4 opacity-75'>
                {/* Data & Privacy */}
                <div
                  id='data-privacy'
                  className='scroll-mt-24 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 p-5'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <Database className='h-4 w-4 text-[var(--text-muted)]' />
                      <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
                        Data &amp; privacy
                      </h3>
                    </div>
                    <span className='rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]'>
                      Roadmap
                    </span>
                  </div>
                  <p className='mt-2 text-xs text-[var(--text-muted)]'>
                    Data retention controls, one-click export, and account
                    deletion will be available here. Your data is kept while
                    your account is active.
                  </p>
                </div>

                {/* Integrations & API */}
                <div
                  id='integrations'
                  className='scroll-mt-24 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 p-5'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <Plug className='h-4 w-4 text-[var(--text-muted)]' />
                      <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
                        Integrations &amp; API
                      </h3>
                    </div>
                    <span className='rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]'>
                      Pro roadmap
                    </span>
                  </div>
                  <p className='mt-2 text-xs text-[var(--text-muted)]'>
                    Push summaries to Notion or Obsidian, sync with your
                    calendar, and access the API with webhooks.
                  </p>
                </div>

                {/* Notifications */}
                <div
                  id='notifications'
                  className='scroll-mt-24 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 p-5'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <Bell className='h-4 w-4 text-[var(--text-muted)]' />
                      <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
                        Notifications
                      </h3>
                    </div>
                    <span className='rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]'>
                      Roadmap
                    </span>
                  </div>
                  <p className='mt-2 text-xs text-[var(--text-muted)]'>
                    Weekly email summaries and light-touch session reminders
                    will be configurable here.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
