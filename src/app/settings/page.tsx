// src/app/settings/page.tsx
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { getCurrentUserEmail } from "@/lib/server-auth";
import { ThemeSelector } from "@/components/theme-selector";
import { InlineSignInButton } from "@/components/inline-sign-in-button";
import { PlanModalTrigger } from "@/components/plan-modal-trigger";
import { getUserProStatus } from "@/lib/subscription";
import { UpgradeToProButton } from "@/components/upgrade-to-pro-button";
import ManageBillingButton from "@/components/manage-billing-button";

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
} from "lucide-react";

const SettingsPage = async () => {
  const session = await getServerSession(authOptions);
  const ownerEmail = await getCurrentUserEmail();

  // Not signed in
  if (!session?.user || !ownerEmail) {
    return (
      <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="mt-2">
          Please sign in using the button in the top-right (GitHub or Google) to
          view your Weekline account and settings.
        </p>
        <InlineSignInButton />
      </div>
    );
  }

  const user = session.user;
  const { start, end } = getWeekRange(0);

  const [sessionsThisWeek, lifetimeStats, proStatus] = await Promise.all([
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
    getUserProStatus(ownerEmail),
  ]);

  const totalWeekMs = sessionsThisWeek.reduce(
    (acc, s) => acc + s.durationMs,
    0
  );
  const lifetimeMs = lifetimeStats._sum.durationMs ?? 0;
  const lifetimeSessions = lifetimeStats._count._all ?? 0;

  const { isPro, proExpiresAt } = proStatus;
  const currentPlan: "free" | "pro" = isPro ? "pro" : "free";

  return (
    <div className="-mx-4 md:-mx-8">
      {/* Page header */}
      <header className="px-4 pb-4 md:px-8">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your account, plan, and how Weekline fits into your workflow.
        </p>
      </header>

      <div className="flex gap-4 px-4 pb-6 md:gap-6 md:px-8">
        {/* LEFT: sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-[4.5rem] flex h-[calc(100vh-5rem)] flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {/* User summary */}
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
                  <dt>Plan</dt>
                  <dd className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--text-muted)]">
                    <CreditCard className="h-3 w-3" />
                    {isPro ? "Pro" : "Free"}
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
                Settings
              </div>
              <ul className="mt-2 space-y-1">
                <li>
                  <a
                    href="#account"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Account</span>
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
                    href="#plan"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Plan &amp; billing</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#data-privacy"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <Database className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Data &amp; privacy</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#integrations"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <Plug className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Integrations &amp; API</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#notifications"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                  >
                    <Bell className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>Notifications</span>
                  </a>
                </li>
              </ul>
            </nav>

            <div className="border-t border-[var(--border-subtle)] px-4 py-3 text-[0.65rem] text-[var(--text-muted)]">
              Plan, integrations, and notification controls will grow here as we
              ship more of the Weekline roadmap.
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
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[var(--text-primary)]">
                <CreditCard className="h-3 w-3" />
                {isPro ? "Pro plan" : "Free plan"}
              </span>
            </div>
          </section>

          {/* ACCOUNT */}
          <section
            id="account"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Account
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              High-level stats for how you&apos;re using Weekline.
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
                  Individual blocks you&apos;ve captured in Weekline.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-3 text-xs text-[var(--text-muted)]">
              <div>
                <div className="text-[0.7rem] font-medium uppercase tracking-wide">
                  Sign-in
                </div>
                <p className="mt-1 text-[0.75rem]">
                  You&apos;re currently signed in with OAuth. Passwordless
                  login, SSO, and additional providers will show up here when
                  they&apos;re available.
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
              Switch themes and motion backgrounds. Changes apply instantly and
              are remembered on this device.
            </p>

            <ThemeSelector />
          </section>

          {/* PLAN & BILLING */}
          <section
            id="plan"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Plan &amp; billing
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              See your current plan and manage billing.
            </p>

            <div className="mt-4">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Current plan
                      </span>
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
                          isPro
                            ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/40"
                            : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]",
                        ].join(" ")}
                      >
                        <CreditCard className="h-3 w-3" />
                        {isPro ? "Pro" : "Free"}
                      </span>
                    </div>

                    {/* Short status line only */}
                    <p className="mt-2 text-[0.75rem] text-[var(--text-muted)]">
                      {isPro
                        ? proExpiresAt
                          ? `Renews on ${proExpiresAt.toLocaleDateString()}.`
                          : "Active subscription."
                        : "Free plan with no active billing."}
                    </p>
                  </div>
                  <ShieldCheck className="hidden h-8 w-8 text-[var(--text-muted)] md:block" />
                </div>

                {/* Actions + short Stripe note */}
                <div className="mt-5 space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {isPro ? (
                      <>
                        <ManageBillingButton />
                        <PlanModalTrigger currentPlan={currentPlan} />
                      </>
                    ) : (
                      <>
                        <UpgradeToProButton />
                        <PlanModalTrigger currentPlan={currentPlan} />
                      </>
                    )}
                  </div>

                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Use <span className="font-medium">Manage billing</span> to
                    update your card, download invoices, or cancel your
                    subscription at any time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* DATA & PRIVACY */}
          <section
            id="data-privacy"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Data &amp; privacy
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Control how long Weekline keeps your data and how you can take it
              with you.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)]">
                <div className="text-[0.7rem] font-medium uppercase tracking-wide">
                  Data retention
                </div>
                <p className="mt-1">
                  Today, session data is kept while your account is active. A
                  retention control (for example, &quot;keep last 12
                  months&quot;) will be added here.
                </p>
              </div>

              <div className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-80">
                <div className="flex items-center justify-between">
                  <div className="text-[0.7rem] font-medium uppercase tracking-wide">
                    Download your data
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem]">
                    Roadmap
                  </span>
                </div>
                <p className="mt-1">
                  A one-click export of all your sessions, projects, and
                  summaries in a single archive will live here.
                </p>
              </div>

              <div className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-80">
                <div className="flex items-center justify-between">
                  <div className="text-[0.7rem] font-medium uppercase tracking-wide">
                    Delete account
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem]">
                    Danger zone
                  </span>
                </div>
                <p className="mt-1">
                  A strict self-service flow to permanently remove your account
                  and all associated data from Weekline&apos;s servers will be
                  added here.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)]">
              <div className="text-[0.7rem] font-medium uppercase tracking-wide">
                Privacy
              </div>
              <p className="mt-1">
                Weekline stores only the information needed to render your
                sessions, projects, and summaries. As we add integrations and
                team features, finer-grained privacy controls will appear here.
              </p>
            </div>
          </section>

          {/* INTEGRATIONS & API */}
          <section
            id="integrations"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Integrations &amp; API
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Connect Weekline to the rest of your stack. These are roadmap
              items for now.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-70">
                <div className="flex items-center justify-between">
                  <div className="font-medium uppercase tracking-wide">
                    Notes &amp; docs
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem]">
                    Pro roadmap
                  </span>
                </div>
                <p className="mt-1">
                  Push summaries directly into Notion or Obsidian instead of
                  copying by hand.
                </p>
              </div>

              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-70">
                <div className="flex items-center justify-between">
                  <div className="font-medium uppercase tracking-wide">
                    Calendar &amp; tasks
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem]">
                    Roadmap
                  </span>
                </div>
                <p className="mt-1">
                  Sync blocks to your calendar or task manager so Weekline fits
                  around your schedule.
                </p>
              </div>

              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-70">
                <div className="flex items-center justify-between">
                  <div className="font-medium uppercase tracking-wide">
                    API &amp; webhooks
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem]">
                    Pro roadmap
                  </span>
                </div>
                <p className="mt-1">
                  Generate API keys and subscribe to webhooks when sessions are
                  created, updated, or completed.
                </p>
              </div>
            </div>
          </section>

          {/* NOTIFICATIONS */}
          <section
            id="notifications"
            className="scroll-mt-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Notifications
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Configure optional nudges so Weekline keeps you consistent, not
              overwhelmed.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-70">
                <div className="flex items-center justify-between">
                  <div className="font-medium uppercase tracking-wide">
                    Weekly email summary
                  </div>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem]">
                    Pro roadmap
                  </span>
                </div>
                <p className="mt-1">
                  Get a snapshot of your week in your inbox, based on the same
                  summary you see in Weekline.
                </p>
              </div>

              <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-muted)] opacity-70">
                <div className="font-medium uppercase tracking-wide">
                  Session reminders
                </div>
                <p className="mt-1">
                  Light-touch reminders to start a block at your usual times
                  will live here when we support push / email notifications.
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
