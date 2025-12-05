import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTodayRange, formatDuration } from "@/lib/time";
import { NewSessionForm } from "@/components/new-session-form";
import { getCurrentUserEmail } from "@/lib/server-auth";
import { SessionList } from "@/components/session-list";
import { InlineSignInButton } from "@/components/inline-sign-in-button";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Timer,
  ListChecks,
  FolderKanban,
  CalendarRange,
  FileText,
  BarChart3,
  Sparkles,
  Users,
} from "lucide-react";

import type { Prisma } from "@prisma/client";

// ✅ Correct type for sessions including the project relation
type SessionWithProject = Prisma.SessionGetPayload<{
  include: { project: true };
}>;

type Project = Prisma.ProjectGetPayload<{}>;

type TodayPageSearchParams = {
  onboarding?: string;
};

type TodayPageProps = {
  searchParams: Promise<TodayPageSearchParams>;
};

const TodayPage = async ({ searchParams }: TodayPageProps) => {
  const resolvedSearchParams = await searchParams;
  const onboardingParam = resolvedSearchParams?.onboarding;

  const onboardingMode =
    onboardingParam === "1" ||
    onboardingParam === "true" ||
    onboardingParam === "yes";

  const ownerEmail = await getCurrentUserEmail();

  /* ------------------------------------------------------------------ */
  /* ONBOARDING (LOGGED OUT, /?onboarding=1)                            */
  /* ------------------------------------------------------------------ */

  if (!ownerEmail && onboardingMode) {
    return (
      <Card className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <CardContent className="p-6 md:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr),minmax(0,1.1fr)] lg:items-center">
            {/* LEFT: hero + CTA */}
            <div className="space-y-7">
              {/* Beta pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Private beta · Dev Workflow Focus Tracker</span>
              </div>

              {/* Hero copy */}
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  Know exactly what you shipped this week.
                </h1>
                <p className="max-w-xl text-sm text-[var(--text-muted)] md:text-base">
                  Focus Tracker turns your day into a clean timeline of what you
                  actually worked on — perfect for weekly reviews, 1:1s,
                  stand-ups, and client updates.
                </p>
              </div>

              {/* Benefits */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                    <Timer className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Log focus, not tasks
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      One quick entry per block of work. No backlog grooming or
                      ticket hygiene required.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                    <BarChart3 className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      See where time really went
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Week and project views show your actual focus — not just a
                      list of tickets.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 sm:col-span-2">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)]">
                    <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Weekly summary in one click
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      The Summary tab generates a Markdown report you can paste
                      directly into Obsidian or email — no formatting needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA row */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <InlineSignInButton
                    label="Sign in with GitHub or Google"
                    className="mt-0 h-10 px-5 text-sm md:text-base"
                  />
                  <span className="text-xs text-[var(--text-muted)] md:text-sm">
                    Free while in beta.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[0.75rem] text-[var(--text-muted)]">
                  <Link
                    href="/"
                    className="font-medium text-[var(--accent-solid)] hover:underline"
                  >
                    Skip intro and open the app →
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT: fake preview */}
            <div className="space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-surface-soft)] to-[var(--bg-surface)] p-4 sm:p-5">
              {/* Fake top bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-surface-soft)] px-3 py-1 text-[0.7rem] text-[var(--text-muted)]">
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span>Today · Week · Summary</span>
                </div>
                <div className="flex items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono">17h 05m this week</span>
                </div>
              </div>

              {/* Fake preview */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                      Today
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                      Shipping auth &amp; cleaning up bugs
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.7rem] text-[var(--text-muted)]">
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

              {/* Who it's for */}
              <div className="grid gap-3 text-[0.75rem] text-[var(--text-primary)] sm:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--bg-surface-soft)]">
                      <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Built for
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.7rem]">
                      Solo devs &amp; indies
                    </span>
                    <span className="rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.7rem]">
                      Freelancers &amp; consultants
                    </span>
                    <span className="rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.7rem]">
                      Engineers tracking impact
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--bg-surface-soft)]">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      On the roadmap
                    </span>
                  </div>
                  <ul className="mt-1 space-y-1 text-[0.7rem] text-[var(--text-muted)]">
                    <li>• Notion &amp; Obsidian export presets</li>
                    <li>• Automatic weekly email recap</li>
                    <li>• Calendar &amp; task integrations (Pro)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* LOGGED OUT (NO ONBOARDING PARAM) */
  /* ------------------------------------------------------------------ */

  if (!ownerEmail) {
    return (
      <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Today&apos;s focus
        </h1>
        <p className="mt-2">
          Please sign in using the button in the top-right to log sessions.
        </p>
        <InlineSignInButton label="Sign in to Focus Tracker" />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* AUTHENTICATED FLOW */
  /* ------------------------------------------------------------------ */

  const { start, end } = getTodayRange();

  let projects: Project[] = [];
  let sessions: SessionWithProject[] = [];

  try {
    const [projectsResult, sessionsResultRaw] = await Promise.all([
      prisma.project.findMany({
        where: { ownerEmail, isArchived: false },
        orderBy: { createdAt: "asc" },
      }),
      prisma.session.findMany({
        where: {
          ownerEmail,
          startTime: { gte: start, lt: end },
        },
        include: { project: true },
        orderBy: { startTime: "asc" },
      }),
    ]);

    projects = projectsResult;
    sessions = sessionsResultRaw as SessionWithProject[];
  } catch (err) {
    console.error(
      "TodayPage: failed to load projects/sessions, falling back to empty lists.",
      err
    );
  }

  const totalMs = sessions.reduce<number>((acc, s) => acc + s.durationMs, 0);
  const sessionsCount = sessions.length;

  // Lookup by id
  const projectById = new Map<number, Project>(projects.map((p) => [p.id, p]));

  // Determine primary project
  let primaryProjectName = "—";
  if (sessions.length > 0) {
    const perProject = sessions.reduce<
      Record<number, { name: string; totalMs: number }>
    >((acc, s) => {
      const proj = projectById.get(s.projectId);
      const projName = proj?.name ?? "—";
      if (!acc[s.projectId]) {
        acc[s.projectId] = { name: projName, totalMs: 0 };
      }
      acc[s.projectId].totalMs += s.durationMs;
      return acc;
    }, {});

    const top = Object.values(perProject).sort(
      (a, b) => b.totalMs - a.totalMs
    )[0];
    if (top) primaryProjectName = top.name;
  }

  const projectSummaries = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));

  const todayLabel = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const sessionItems = sessions.map((s) => {
    const proj = projectById.get(s.projectId);
    return {
      id: s.id,
      projectName: proj?.name ?? "—",
      projectColor: proj?.color ?? "#999999",
      intention: s.intention,
      durationMs: s.durationMs,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      notes: s.notes,
    };
  });

  return (
    <div className="w-full space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Today
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Let&apos;s track today&apos;s focus.
          </h1>
        </div>
        <p className="text-sm text-[var(--text-muted)]">{todayLabel}</p>
      </header>

      <div className="flex w-full flex-col gap-6 lg:flex-row">
        {/* LEFT: new session */}
        <NewSessionForm projects={projectSummaries} totalTodayMs={totalMs} />

        {/* RIGHT: today's log */}
        <Card className="flex-1">
          <CardHeader className="border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">
                Today&apos;s log
              </CardTitle>
              <span className="text-xs text-[var(--text-muted)]">
                {sessionsCount} session{sessionsCount === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              A simple timeline of your focus blocks.
            </p>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Total time</span>
                  <Timer className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
                  {formatDuration(totalMs)}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Sessions</span>
                  <ListChecks className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
                  {sessionsCount}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Primary project</span>
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
                  {primaryProjectName}
                </div>
              </div>
            </div>

            <SessionList sessions={sessionItems} totalMs={totalMs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TodayPage;
