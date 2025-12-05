// app/welcome/page.tsx
import Link from "next/link";
import { getCurrentUserEmail } from "@/lib/server-auth";
import { InlineSignInButton } from "@/components/inline-sign-in-button";
import { Card } from "@/components/ui/card";
import {
  Timer,
  CalendarRange,
  FileText,
  BarChart3,
  Sparkles,
  Users,
  FolderKanban,
  Palette,
} from "lucide-react";

const WelcomePage = async () => {
  const ownerEmail = await getCurrentUserEmail();
  const isLoggedIn = !!ownerEmail;

  return (
    <main className="w-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 md:gap-16 md:py-16">
        {/* ------------------------------------------------------------------ */}
        {/* HERO                                                              */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-8">
          {/* Beta pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Private beta · Workflow Focus Tracker</span>
          </div>

          {/* Headline + body */}
          <div className="max-w-2xl space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              Know exactly what you shipped this week.
            </h1>
            <p className="text-sm text-[var(--text-muted)] md:text-base">
              Focus Tracker is a simple weekly log for developers. Instead of
              juggling tickets and boards, you record focused work blocks and
              get a clean story of where your time actually went.
            </p>
          </div>

          {/* Centered CTA row */}
          <div className="flex flex-col items-center gap-3 md:items-center">
            {isLoggedIn ? (
              <Link
                href="/today"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-solid)] px-6 py-2.5 text-sm font-medium text-[var(--text-on-accent)] shadow-sm hover:opacity-95"
              >
                <Timer className="h-4 w-4" />
                <span>Go to app</span>
              </Link>
            ) : (
              <>
                <InlineSignInButton
                  label="Go to app"
                  className="mt-2 h-10 px-6 text-sm md:text-base"
                />
                <p className="max-w-3xl text-center text-[0.75rem] text-[var(--text-muted)] md:text-[0.8rem]">
                  Sign in with GitHub or Google to start logging focus sessions.
                  No automatic tracking — only what you choose to log.
                </p>
              </>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* KEY FEATURES – granular cards                                   */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              What Weekline includes
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 1. Focus logging */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                  <Timer className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Simple focus logging
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Add a short entry for each block of work with a project,
                  intention, and optional notes. No tickets or backlog required.
                </p>
              </div>

              {/* 2. Today timeline */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                  <CalendarRange className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Clean Today timeline
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  See your day as a simple list of focus sessions with total
                  time, session count, and your primary project at a glance.
                </p>
              </div>

              {/* 3. Weekly focus view */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                  <BarChart3 className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Weekly focus analytics
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  The Week view shows total time, session counts, and how your
                  focus was distributed across days and projects.
                </p>
              </div>

              {/* 4. Project analytics */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                  <FolderKanban className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Per-project breakdowns
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Track how much time you&apos;re investing in each project so
                  you can balance client work, side projects, and experiments.
                </p>
              </div>

              {/* 5. Themes & custom theme */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                  <Palette className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Themes & custom palette
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Switch between multiple built-in themes or design your own
                  custom color palette with a simple editor.
                </p>
              </div>

              {/* 6. Weekly Markdown export */}
              <div className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                  <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Weekly Markdown summary
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Generate a structured Markdown recap of your week that&apos;s
                  ready to paste into Notion, Obsidian, status emails, or client
                  reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* EXAMPLE VIEW                                                      */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                What your day looks like
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                A sample of the Today view once you&apos;ve logged a few focus
                sessions.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.7rem] text-[var(--text-muted)]">
              Example data
            </span>
          </div>

          <Card className="space-y-4 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
            {/* Fake top bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-surface-soft)] px-3 py-1 text-[0.7rem] text-[var(--text-muted)]">
                <CalendarRange className="h-3.5 w-3.5" />
                <span>Today · Week · Summary</span>
              </div>
              <div className="flex items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono">17h 05m focused this week</span>
              </div>
            </div>

            {/* Fake "Today" preview */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                    Today
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                    Shipping auth &amp; cleaning up bugs
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[0.7rem] text-[var(--text-muted)]">
                  <Timer className="h-3 w-3" />
                  <span>3h 45m logged</span>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5 text-[0.72rem] text-[var(--text-primary)]">
                <li className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="truncate">
                      [Client API] Wire up new billing endpoints
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[var(--text-muted)]">
                    1h 15m
                  </span>
                </li>
                <li className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="truncate">
                      [Product site] Fix flaky image loading bug
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[var(--text-muted)]">
                    45m
                  </span>
                </li>
                <li className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="truncate">
                      [Exploration] Notes from testing new auth flow
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[var(--text-muted)]">
                    1h 45m
                  </span>
                </li>
              </ul>
            </div>
          </Card>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* BUILT FOR                                                         */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Who it&apos;s built for
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Focus Tracker is opinionated: it&apos;s designed for people who
              think in weeks and projects, not in task backlogs.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-surface-soft)]">
                  <Users className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Individual devs
                </span>
              </div>
              <ul className="mt-1 space-y-1.5 text-[0.8rem] text-[var(--text-primary)]">
                <li>• Solo devs &amp; indie hackers</li>
                <li>• Freelancers &amp; consultants with multiple clients</li>
                <li>• Engineers tracking impact for 1:1s &amp; perf reviews</li>
              </ul>
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-surface-soft)]">
                  <Sparkles className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Use it alongside your tools
                </span>
              </div>
              <ul className="mt-1 space-y-1.5 text-[0.8rem] text-[var(--text-primary)]">
                <li>
                  • Works next to Jira, Linear, or GitHub — not instead of
                </li>
                <li>• A clean “what actually happened this week” layer</li>
                <li>• Easy to paste into your own notes or docs</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* ROADMAP                                                           */}
        {/* ------------------------------------------------------------------ */}
        <section className="space-y-4 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              What&apos;s on the roadmap
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              The core is a solid weekly focus log. Around that, we&apos;re
              adding a few sharp tools — not a full project management suite.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Short term */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-[0.8rem] text-[var(--text-primary)]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Short term
              </div>
              <ul className="space-y-1.5">
                <li>• Notion &amp; Obsidian export presets</li>
                <li>• Automatic weekly email recap</li>
                <li>• Simple streaks and weekly goals</li>
                <li>• Small analytics upgrades (trends &amp; charts)</li>
              </ul>
            </div>

            {/* Further out */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-[0.8rem] text-[var(--text-primary)]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />A bit
                further out
              </div>
              <ul className="space-y-1.5">
                <li>• Compact “mini window” timer you can keep on screen</li>
                <li>• Optional Pomodoro-style focus mode</li>
                <li>• Calendar &amp; task integrations (Pro)</li>
                <li>• Richer visualizations for projects and weeks</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default WelcomePage;
