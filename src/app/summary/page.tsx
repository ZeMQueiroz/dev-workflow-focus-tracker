import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { CopySummaryButton } from "@/components/copy-summary-button";
import { getCurrentUserId } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { getProjectColorDotClass } from "@/lib/project-colors";

import { Button } from "@/components/ui/button";
import { SummaryModeToggle } from "@/components/summary-mode-toggle";
import { InlineSignInButton } from "@/components/inline-sign-in-button";
import { SummaryCharts } from "@/components/summary-charts";
import { getUserProStatus } from "@/lib/subscription";
import { PageContainer } from "@/components/page-container";

import {
  Timer,
  FolderKanban,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  FileText,
  Download,
  Sparkles,
  BarChart3,
  AlignLeft,
  Star,
} from "lucide-react";

import type { Prisma } from "@prisma/client";

type SummaryMode = "self" | "manager" | "client";
type SummaryView = "full" | "totals" | "projects" | "days";

type SessionWithProject = Prisma.SessionGetPayload<{
  include: { project: true };
}>;

type SummaryPageSearchParams = {
  offset?: string;
  mode?: string;
  view?: string;
  projectId?: string;
  clientName?: string;
};

type SummaryPageProps = {
  searchParams: Promise<SummaryPageSearchParams>;
};

const saveWeeklyHighlight = async (formData: FormData) => {
  "use server";

  const userId = await getCurrentUserId();
  if (!userId) return;

  const highlightRaw = formData.get("highlight");
  const weekStartRaw = formData.get("weekStart");

  if (typeof weekStartRaw !== "string") return;

  const trimmedHighlight =
    typeof highlightRaw === "string" ? highlightRaw.trim() : "";

  const weekStart = new Date(weekStartRaw);
  if (Number.isNaN(weekStart.getTime())) {
    return;
  }

  try {
    if (!trimmedHighlight) {
      await prisma.weeklyHighlight.deleteMany({
        where: { userId, weekStart },
      });
    } else {
      await prisma.weeklyHighlight.upsert({
        where: {
          userId_weekStart: { userId, weekStart },
        },
        update: { highlight: trimmedHighlight },
        create: { userId, weekStart, highlight: trimmedHighlight },
      });
    }

    revalidatePath("/summary");
  } catch (err) {
    console.error("saveWeeklyHighlight failed:", err);
  }
};

const SummaryPage = async ({ searchParams }: SummaryPageProps) => {
  const resolvedSearchParams = await searchParams;
  const rawOffset = resolvedSearchParams?.offset;
  const rawMode = resolvedSearchParams?.mode;
  const rawView = resolvedSearchParams?.view;
  const rawProjectId = resolvedSearchParams?.projectId;
  const rawClientName = resolvedSearchParams?.clientName;

  const weekOffset = rawOffset ? Number(rawOffset) || 0 : 0;

  let mode: SummaryMode;
  if (rawMode === "manager") mode = "manager";
  else if (rawMode === "client") mode = "client";
  else mode = "self";

  const isManagerMode = mode === "manager";
  const isClientMode = mode === "client";

  let view: SummaryView =
    rawView === "totals" ||
    rawView === "projects" ||
    rawView === "days" ||
    rawView === "full"
      ? rawView
      : "full";

  if (isClientMode && (view === "full" || view === "days")) {
    view = "totals";
  }

  const clientName =
    typeof rawClientName === "string" ? rawClientName.trim() : "";

  const projectFilterId =
    rawProjectId && !Number.isNaN(Number(rawProjectId))
      ? Number(rawProjectId)
      : null;

  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <PageContainer variant='workspace'>
        {/* Sign-in state */}
        <div className='flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center'>
          <div className='flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
            <FileText className='h-7 w-7 text-[var(--text-muted)]' />
          </div>
          <div className='space-y-2'>
            <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
              Sign in to view your weekly summary
            </h2>
            <p className='max-w-sm text-sm text-[var(--text-muted)]'>
              Your weekly report, markdown export, and chart breakdowns will
              appear here after you log in.
            </p>
          </div>
          <InlineSignInButton />
        </div>
      </PageContainer>
    );
  }

  const { start, end } = getWeekRange(weekOffset);

  const sessionWhere: Prisma.SessionWhereInput = {
    ownerId: userId,
    startTime: { gte: start, lt: end },
  };

  if (projectFilterId !== null) {
    sessionWhere.projectId = projectFilterId;
  }

  let sessions: SessionWithProject[] = [];

  let weeklyHighlightRecord = null;
  interface ProjectListItem {
    id: number;
    name: string;
  }

  let projects: ProjectListItem[] = [];
  let proStatus: Awaited<ReturnType<typeof getUserProStatus>> = {
    isPro: false,
    plan: "FREE",
    proExpiresAt: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
  };

  try {
    sessions = (await prisma.session.findMany({
      where: sessionWhere,
      include: { project: true },
      orderBy: { startTime: "asc" },
    })) as SessionWithProject[];

    weeklyHighlightRecord = await prisma.weeklyHighlight.findUnique({
      where: {
        userId_weekStart: { userId, weekStart: start },
      },
    });

    projects = await prisma.project.findMany({
      where: { ownerId: userId, isArchived: false },
      orderBy: { name: "asc" },
    });

    proStatus = await getUserProStatus(userId);
  } catch (err) {
    console.error("SummaryPage: failed to load summary data.", err);
  }

  const highlightText = weeklyHighlightRecord?.highlight ?? "";
  const { isPro } = proStatus;

  const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
  const totalMinutes = Math.round(totalMs / 60000);
  const sessionsCount = sessions.length;

  const projectTotals = sessions.reduce<
    Record<
      number,
      { name: string; color: string | null; totalMs: number; count: number }
    >
  >((acc, s) => {
    if (!acc[s.projectId]) {
      acc[s.projectId] = {
        name: s.project.name,
        color: s.project.color ?? null,
        totalMs: 0,
        count: 0,
      };
    }
    acc[s.projectId].totalMs += s.durationMs;
    acc[s.projectId].count += 1;
    return acc;
  }, {});

  const projectTotalsArray = Object.entries(projectTotals).map(
    ([id, value]) => ({
      id: Number(id),
      ...value,
    }),
  );

  const activeProjectsCount = projectTotalsArray.length;

  const maxProjectMs =
    projectTotalsArray.length > 0
      ? Math.max(...projectTotalsArray.map((p) => p.totalMs))
      : 0;

  type DayGroup = {
    key: string;
    label: string;
    sessions: (typeof sessions)[number][];
  };

  const dayMap = new Map<string, DayGroup>();

  sessions.forEach((s) => {
    const d = s.startTime;
    const key = d.toISOString().slice(0, 10);
    if (!dayMap.has(key)) {
      const label = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      dayMap.set(key, { key, label, sessions: [] });
    }
    dayMap.get(key)!.sessions.push(s);
  });

  const dayGroups = Array.from(dayMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  const perDayChartData = dayGroups.map((day) => {
    const totalMsForDay = day.sessions.reduce(
      (acc, s) => acc + s.durationMs,
      0,
    );
    const minutesForDay = Math.round(totalMsForDay / 60000);
    const shortLabel = day.label.split(",")[0];
    return { key: day.key, label: shortLabel, totalMinutes: minutesForDay };
  });

  const perProjectChartData = projectTotalsArray.map((p) => ({
    name: p.name,
    totalMinutes: Math.round(p.totalMs / 60000),
  }));

  const daysWithSessions = dayGroups.length;
  const avgMinutesPerActiveDay =
    daysWithSessions > 0 ? Math.round(totalMinutes / daysWithSessions) : 0;
  const avgMinutesPerSession =
    sessionsCount > 0 ? Math.round(totalMinutes / sessionsCount) : 0;

  const busiestDayEntry =
    perDayChartData.length > 0
      ? perDayChartData.reduce((max, d) =>
          d.totalMinutes > max.totalMinutes ? d : max,
        )
      : null;

  const topProjectEntry =
    projectTotalsArray.length > 0
      ? [...projectTotalsArray].sort((a, b) => b.totalMs - a.totalMs)[0]
      : null;

  const weekStartLabel = start.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const lastDay = new Date(end);
  lastDay.setDate(end.getDate() - 1);
  const weekEndLabel = lastDay.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const projectHeading = isClientMode
    ? "Projects & deliverables"
    : isManagerMode
      ? "Projects worked on"
      : "By project";

  const sessionsByDayHeading = isClientMode
    ? "Work by day"
    : isManagerMode
      ? "Activities by day"
      : "Sessions by day";

  const includeTotals = view === "full" || view === "totals";
  const includeProjects = view === "full" || view === "projects";
  const includeDays = !isClientMode && (view === "full" || view === "days");

  const buildHrefForOffset = (offset: number) => {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    if (mode !== "self") params.set("mode", mode);
    if (view !== "full") params.set("view", view);
    if (projectFilterId !== null)
      params.set("projectId", String(projectFilterId));
    if (clientName) params.set("clientName", clientName);
    const qs = params.toString();
    return qs ? `/summary?${qs}` : "/summary";
  };

  const buildHrefForView = (newView: SummaryView) => {
    const params = new URLSearchParams();
    params.set("offset", String(weekOffset));
    if (mode !== "self") params.set("mode", mode);
    if (newView !== "full") params.set("view", newView);
    if (projectFilterId !== null)
      params.set("projectId", String(projectFilterId));
    if (clientName) params.set("clientName", clientName);
    const qs = params.toString();
    return qs ? `/summary?${qs}` : "/summary";
  };

  const buildExportHref = (format: "csv" | "json") => {
    const params = new URLSearchParams();
    if (weekOffset) params.set("offset", String(weekOffset));
    if (mode !== "self") params.set("mode", mode);
    if (projectFilterId !== null)
      params.set("projectId", String(projectFilterId));
    if (clientName) params.set("clientName", clientName);
    const qs = params.toString();
    return `/api/exports/week/${format}${qs ? `?${qs}` : ""}`;
  };

  const buildPdfHref = () => {
    const params = new URLSearchParams();
    if (weekOffset) params.set("offset", String(weekOffset));
    if (mode !== "self") params.set("mode", mode);
    if (projectFilterId !== null)
      params.set("projectId", String(projectFilterId));
    if (clientName) params.set("client", clientName);
    const qs = params.toString();
    return `/api/exports/week/pdf${qs ? `?${qs}` : ""}`;
  };

  const csvHref = buildExportHref("csv");
  const jsonHref = buildExportHref("json");
  const pdfHref = buildPdfHref();

  // Build Markdown summary
  let markdown = "";

  if (isClientMode) {
    markdown += `# Weekly client update (${weekStartLabel} – ${weekEndLabel})\n\n`;
    if (clientName) {
      markdown += `Client: ${clientName}\n\n`;
    }
    markdown +=
      "This is a brief, client-facing snapshot of shipped work, progress, and time spent this week.\n\n";
  } else if (isManagerMode) {
    markdown += `# Weekly update (${weekStartLabel} – ${weekEndLabel})\n\n`;
    markdown +=
      "This update summarizes what I worked on this week for visibility and planning.\n\n";
  } else {
    markdown += `# Weekly dev log (${weekStartLabel} – ${weekEndLabel})\n\n`;
  }

  if (highlightText.trim()) {
    markdown += `## Weekly highlight\n\n${highlightText.trim()}\n\n`;
  }

  if (sessionsCount === 0) {
    markdown += `No focus sessions logged this week.\n`;
  } else {
    if (includeTotals) {
      if (isClientMode) {
        markdown += `Total tracked time: ${formatDuration(totalMs)}\n`;
        markdown += `Work blocks: ${sessionsCount}\n`;
        markdown += `Projects: ${activeProjectsCount}\n\n`;
      } else {
        markdown += `Total time: ${formatDuration(totalMs)}\n`;
        markdown += `Sessions: ${sessionsCount}\n`;
        markdown += `Projects: ${activeProjectsCount}\n\n`;
      }
    }

    if (includeProjects && projectTotalsArray.length > 0) {
      markdown += `## ${projectHeading}\n`;
      projectTotalsArray
        .sort((a, b) => b.totalMs - a.totalMs)
        .forEach((p) => {
          markdown += `- ${p.name} — ${formatDuration(p.totalMs)} (${
            p.count
          } session${p.count !== 1 ? "s" : ""})\n`;
        });
      markdown += `\n`;
    }

    if (includeDays) {
      markdown += `## ${sessionsByDayHeading}\n\n`;
      dayGroups.forEach((day) => {
        const totalMsForDay = day.sessions.reduce(
          (acc, s) => acc + s.durationMs,
          0,
        );
        markdown += `### ${day.label} (${formatDuration(totalMsForDay)})\n`;
        day.sessions.forEach((s) => {
          const timeLabel = s.startTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          markdown += `- [${s.project.name}] ${s.intention} (${formatDuration(
            s.durationMs,
          )}, ${timeLabel})\n`;
          if (!isClientMode && s.notes) {
            markdown += `  - Notes: ${s.notes}\n`;
          }
        });
        markdown += `\n`;
      });
    }
  }

  const prevOffset = weekOffset - 1;
  const prevHref = buildHrefForOffset(prevOffset);

  const pageSubtitle =
    mode === "client"
      ? "Client-ready snapshot of shipped work and time spent."
      : isManagerMode
        ? "Concise weekly update for your manager doc or sprint review."
        : "Markdown-ready dev log for Obsidian, personal retros, or sharing.";

  const modeBadgeLabel =
    mode === "client"
      ? "Client mode"
      : isManagerMode
        ? "Manager mode"
        : "Self review";

  const modeColors: Record<SummaryMode, string> = {
    self: "bg-[var(--accent-soft)] text-[var(--accent-solid)]",
    manager: "bg-blue-500/10 text-blue-400",
    client: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <PageContainer variant='workspace'>
      {/* ─────────────────────────────────────────────────────── */}
      {/* A. REPORT HEADER                                         */}
      {/* ─────────────────────────────────────────────────────── */}
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        {/* Left: identity */}
        <div className='space-y-2'>
          <div className='flex flex-wrap items-center gap-2.5'>
            <h1 className='text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl'>
              Weekly report
            </h1>
            {isPro && (
              <span className='inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--accent-solid)]'>
                Pro
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${modeColors[mode]}`}
            >
              {modeBadgeLabel}
            </span>
          </div>

          <p className='max-w-xl text-sm text-[var(--text-muted)]'>
            {pageSubtitle}
          </p>

          <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]'>
            <span className='flex items-center gap-1.5'>
              <CalendarRange className='h-3.5 w-3.5' />
              <span className='font-mono text-[var(--text-primary)]'>
                {weekStartLabel} – {weekEndLabel}
              </span>
            </span>
            {isClientMode && clientName && (
              <span className='flex items-center gap-1.5'>
                <span>Client:</span>
                <span className='font-mono text-[var(--text-primary)]'>
                  {clientName}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: week navigation */}
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            asChild
            variant='outline'
            className='border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]'
          >
            <Link href={prevHref} className='flex items-center gap-1.5'>
              <ChevronLeft className='h-3.5 w-3.5' />
              <span>Previous</span>
            </Link>
          </Button>

          <Button
            asChild
            variant={weekOffset === 0 ? "outline" : "default"}
            className={[
              "px-3.5 py-2 text-xs border",
              weekOffset === 0
                ? "cursor-default border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]",
            ].join(" ")}
          >
            <Link
              href={buildHrefForOffset(0)}
              className='flex items-center gap-1.5'
            >
              {weekOffset === 0 ? (
                <>
                  <CalendarRange className='h-3.5 w-3.5' />
                  <span>This week</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className='h-3.5 w-3.5' />
                </>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* B. REPORT CONTROLS                                       */}
      {/* ─────────────────────────────────────────────────────── */}
      <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3.5'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:gap-6'>
          {/* Content view toggle */}
          <div className='flex items-center gap-3'>
            <span className='shrink-0 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
              View
            </span>
            <div className='inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-0.5'>
              {(
                [
                  { key: "full", label: "Full" },
                  { key: "totals", label: "Totals" },
                  { key: "projects", label: "Projects" },
                  ...(!isClientMode
                    ? [{ key: "days" as SummaryView, label: "Days" }]
                    : []),
                ] as { key: SummaryView; label: string }[]
              ).map(({ key, label }) => (
                <Link
                  key={key}
                  href={buildHrefForView(key)}
                  className={[
                    "rounded-md px-3 py-1.5 text-[0.7rem] font-medium transition-colors",
                    view === key
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Divider on desktop */}
          <div className='hidden h-5 w-px bg-[var(--border-subtle)] md:block' />

          {/* Project / client filter */}
          <form method='get' className='flex flex-wrap items-center gap-2.5'>
            <input type='hidden' name='offset' value={String(weekOffset)} />
            {mode !== "self" && (
              <input type='hidden' name='mode' value={mode} />
            )}
            {view !== "full" && (
              <input type='hidden' name='view' value={view} />
            )}

            <span className='shrink-0 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
              Project
            </span>
            <select
              name='projectId'
              defaultValue={projectFilterId ? String(projectFilterId) : ""}
              className='h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none'
            >
              <option value=''>All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {isClientMode && (
              <>
                <span className='shrink-0 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                  Client
                </span>
                <input
                  name='clientName'
                  defaultValue={clientName}
                  placeholder='e.g. Acme Corp'
                  className='h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none'
                />
              </>
            )}

            <Button
              type='submit'
              size='sm'
              variant='outline'
              className='h-8 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            >
              Apply
            </Button>
          </form>
        </div>

        <p className='mt-2.5 text-[0.65rem] text-[var(--text-muted)]'>
          Filters apply to stats, charts, breakdowns, Markdown, and exports.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* C. KPI OVERVIEW                                          */}
      {/* ─────────────────────────────────────────────────────── */}
      <div>
        <div className='mb-3 flex items-center gap-2'>
          <BarChart3 className='h-4 w-4 text-[var(--text-muted)]' />
          <h2 className='text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
            At a glance
          </h2>
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          {/* Total time */}
          <div className='group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all duration-300 hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-md'>
            <div className='flex items-start justify-between'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)]'>
                <Timer className='h-4.5 w-4.5 text-[var(--accent-solid)]' />
              </div>
              {sessionsCount === 0 && (
                <span className='text-[0.65rem] text-[var(--text-muted)]'>
                  no data
                </span>
              )}
            </div>
            <div className='mt-4'>
              <div className='font-mono text-3xl font-semibold tracking-tight text-[var(--text-primary)]'>
                {sessionsCount > 0 ? formatDuration(totalMs) : "—"}
              </div>
              <div className='mt-1 text-xs text-[var(--text-muted)]'>
                {isClientMode ? "Total tracked time" : "Total focus time"}
              </div>
            </div>
          </div>

          {/* Active projects */}
          <div className='group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all duration-300 hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-md'>
            <div className='flex items-start justify-between'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)]'>
                <FolderKanban className='h-4.5 w-4.5 text-[var(--accent-solid)]' />
              </div>
            </div>
            <div className='mt-4'>
              <div className='font-mono text-3xl font-semibold tracking-tight text-[var(--text-primary)]'>
                {activeProjectsCount > 0 ? activeProjectsCount : "—"}
              </div>
              <div className='mt-1 text-xs text-[var(--text-muted)]'>
                {isClientMode ? "Projects in scope" : "Active projects"}
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className='group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all duration-300 hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-md'>
            <div className='flex items-start justify-between'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)]'>
                <ListChecks className='h-4.5 w-4.5 text-[var(--accent-solid)]' />
              </div>
            </div>
            <div className='mt-4'>
              <div className='font-mono text-3xl font-semibold tracking-tight text-[var(--text-primary)]'>
                {sessionsCount > 0 ? sessionsCount : "—"}
              </div>
              <div className='mt-1 text-xs text-[var(--text-muted)]'>
                {isClientMode ? "Work blocks" : "Focus sessions"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* Charts                                                   */}
      {/* ─────────────────────────────────────────────────────── */}
      {sessionsCount > 0 && (
        <SummaryCharts
          key={`${weekOffset}-${projectFilterId ?? "all"}-${view}-${mode}`}
          perDay={perDayChartData}
          perProject={perProjectChartData}
        />
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* D. BREAKDOWN SECTIONS                                    */}
      {/* ─────────────────────────────────────────────────────── */}
      {sessionsCount === 0 ? (
        /* ---- Empty state ---- */
        <div className='flex flex-col items-center gap-5 rounded-xl border border-dashed border-[var(--border-subtle)] py-16 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
            <CalendarRange className='h-6 w-6 text-[var(--text-muted)]' />
          </div>
          <div className='space-y-1.5'>
            <p className='text-sm font-medium text-[var(--text-primary)]'>
              No sessions this week
            </p>
            <p className='max-w-xs text-xs text-[var(--text-muted)]'>
              {weekOffset === 0
                ? "Start a focus session today and your summary will appear here."
                : "No focus sessions were logged for this week."}
            </p>
          </div>
          {weekOffset !== 0 && (
            <Link
              href='/summary'
              className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]'
            >
              <ChevronRight className='h-3.5 w-3.5' />
              Go to current week
            </Link>
          )}
        </div>
      ) : (
        <div className='space-y-0'>
          {/* Weekly Totals */}
          {includeTotals && (
            <div className='py-6 first:pt-0'>
              <div className='mb-4 flex items-center gap-2'>
                <h2 className='text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                  Weekly totals
                </h2>
                <div className='h-px flex-1 bg-[var(--border-subtle)]' />
              </div>

              <div className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4'>
                {[
                  {
                    label: "Days with focus",
                    value:
                      daysWithSessions > 0 ? String(daysWithSessions) : "—",
                  },
                  {
                    label: "Avg per active day",
                    value:
                      daysWithSessions > 0
                        ? formatDuration(avgMinutesPerActiveDay * 60000)
                        : "—",
                  },
                  {
                    label: "Avg per session",
                    value:
                      sessionsCount > 0
                        ? formatDuration(avgMinutesPerSession * 60000)
                        : "—",
                  },
                  {
                    label: "Busiest day",
                    value: busiestDayEntry
                      ? `${busiestDayEntry.label} · ${formatDuration(busiestDayEntry.totalMinutes * 60000)}`
                      : "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className='rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3'
                  >
                    <div className='text-[0.65rem] font-medium uppercase tracking-wide text-[var(--text-muted)]'>
                      {label}
                    </div>
                    <div className='mt-1.5 font-mono text-sm font-semibold text-[var(--text-primary)]'>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {topProjectEntry && (
                <div className='mt-2.5 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-xs'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={getProjectColorDotClass(topProjectEntry.color)}
                    />
                    <span className='text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]'>
                      Top project
                    </span>
                    <span className='font-medium text-[var(--text-primary)]'>
                      {topProjectEntry.name}
                    </span>
                  </div>
                  <span className='font-mono text-[var(--text-muted)]'>
                    {formatDuration(topProjectEntry.totalMs)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* By project */}
          {includeProjects && (
            <div className='py-6 border-t border-[var(--border-subtle)]'>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <h2 className='text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                    {projectHeading}
                  </h2>
                  <div className='h-px w-8 bg-[var(--border-subtle)]' />
                </div>
                {totalMs > 0 && (
                  <span className='text-[0.65rem] text-[var(--text-muted)]'>
                    Share of total
                  </span>
                )}
              </div>

              {projectTotalsArray.length === 0 ? (
                <p className='text-sm text-[var(--text-muted)]'>
                  No sessions logged this week.
                </p>
              ) : (
                <ul className='space-y-2'>
                  {projectTotalsArray
                    .sort((a, b) => b.totalMs - a.totalMs)
                    .map((p) => {
                      const isSelected = projectFilterId === p.id;
                      const percentageOfWeek =
                        totalMs > 0
                          ? Math.round((p.totalMs / totalMs) * 100)
                          : 0;
                      const widthPercentRaw =
                        maxProjectMs > 0 ? (p.totalMs / maxProjectMs) * 100 : 0;
                      const widthPercent = Math.max(widthPercentRaw, 6);

                      return (
                        <li
                          key={p.id}
                          className={[
                            "rounded-xl border px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm",
                            isSelected
                              ? "border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-md"
                              : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]",
                          ].join(" ")}
                        >
                          <div className='flex items-center justify-between gap-3'>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-2'>
                                <span
                                  className={getProjectColorDotClass(p.color)}
                                />
                                <span className='truncate text-sm font-medium text-[var(--text-primary)]'>
                                  {p.name}
                                </span>
                                {isSelected && (
                                  <span className='shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--accent-solid)]'>
                                    Filtered
                                  </span>
                                )}
                              </div>
                              <div className='mt-0.5 text-[0.7rem] text-[var(--text-muted)]'>
                                {p.count} session{p.count !== 1 ? "s" : ""} ·{" "}
                                {percentageOfWeek}% of week
                              </div>
                            </div>
                            <span className='shrink-0 font-mono text-sm font-semibold text-[var(--text-primary)]'>
                              {formatDuration(p.totalMs)}
                            </span>
                          </div>

                          <div className='mt-2.5 h-1 rounded-full bg-[var(--border-subtle)]'>
                            <div
                              className='h-full rounded-full bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-solid)]/60'
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}

          {/* Sessions by day */}
          {includeDays && dayGroups.length > 0 && (
            <div className='py-6 border-t border-[var(--border-subtle)]'>
              <div className='mb-4 flex items-center gap-2'>
                <h2 className='text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                  {sessionsByDayHeading}
                </h2>
                <div className='h-px flex-1 bg-[var(--border-subtle)]' />
              </div>

              <div className='space-y-3'>
                {dayGroups.map((day) => {
                  const totalMsForDay = day.sessions.reduce(
                    (acc, s) => acc + s.durationMs,
                    0,
                  );
                  return (
                    <div key={day.key}>
                      {/* Day header */}
                      <div className='flex items-center justify-between px-0.5 py-1.5'>
                        <span className='text-xs font-semibold text-[var(--text-primary)]'>
                          {day.label}
                        </span>
                        <span className='font-mono text-[0.7rem] text-[var(--text-muted)]'>
                          {formatDuration(totalMsForDay)} ·{" "}
                          {day.sessions.length} session
                          {day.sessions.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Session rows */}
                      <ul className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]'>
                        {day.sessions.map((s) => {
                          const timeLabel = s.startTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <li
                              key={s.id}
                              className='flex items-start justify-between gap-3 px-4 py-2.5 text-xs'
                            >
                              <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5'>
                                  <span className='rounded bg-[var(--bg-surface-soft)] px-1.5 py-0.5 text-[0.65rem] text-[var(--text-muted)]'>
                                    {s.project.name}
                                  </span>
                                  <span className='truncate text-[var(--text-primary)]'>
                                    {s.intention || "(no title)"}
                                  </span>
                                </div>
                                {!isClientMode && s.notes && (
                                  <p className='mt-0.5 text-[0.65rem] text-[var(--text-muted)]'>
                                    {s.notes}
                                  </p>
                                )}
                              </div>
                              <span className='shrink-0 font-mono text-[0.7rem] text-[var(--text-muted)]'>
                                {timeLabel} · {formatDuration(s.durationMs)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* E. EXPORT STUDIO                                         */}
      {/* ─────────────────────────────────────────────────────── */}
      <div className='rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden'>
        {/* Studio header */}
        <div className='flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]'>
              <Download className='h-4 w-4 text-[var(--accent-solid)]' />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-[var(--text-primary)]'>
                Export studio
              </h2>
              <p className='text-[0.65rem] text-[var(--text-muted)]'>
                Set the tone, add your highlight, then export.
              </p>
            </div>
          </div>

          {/* Tone toggle */}
          <SummaryModeToggle currentMode={mode} />
        </div>

        {/* Export actions row */}
        <div className='flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
          <CopySummaryButton text={markdown} />

          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
              Download
            </span>

            <a
              href={csvHref}
              className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors'
            >
              <Download className='h-3.5 w-3.5 text-[var(--text-muted)]' />
              CSV
            </a>

            <a
              href={jsonHref}
              className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors'
            >
              <Download className='h-3.5 w-3.5 text-[var(--text-muted)]' />
              JSON
            </a>

            {/* PDF – Pro-gated */}
            {isPro ? (
              <a
                href={pdfHref}
                className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors'
              >
                <Download className='h-3.5 w-3.5 text-[var(--text-muted)]' />
                {isClientMode ? "Client PDF" : "PDF"}
                <span className='rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400'>
                  Pro
                </span>
              </a>
            ) : (
              <button
                disabled
                className='inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]'
              >
                {isClientMode ? "Client PDF" : "PDF"}
                <span className='rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400'>
                  Pro
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Weekly highlight editor */}
        <div className='px-5 py-5 border-b border-[var(--border-subtle)]'>
          <div className='mb-3 flex items-center gap-2'>
            <Star className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
            <h3 className='text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)]'>
              Weekly highlight
            </h3>
          </div>
          <p className='mb-3 text-[0.7rem] text-[var(--text-muted)]'>
            This narrative appears at the top of your Markdown summary and
            client PDF. Write a 1–3 sentence summary of your most important work
            this week.
          </p>

          <form action={saveWeeklyHighlight} className='space-y-3'>
            <textarea
              name='highlight'
              defaultValue={highlightText}
              placeholder='Shipped v1 of the billing page, closed out tech debt on auth, and unblocked the team on the deployment pipeline.'
              className='h-20 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3.5 py-3 text-xs font-normal leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)]'
            />
            <input type='hidden' name='weekStart' value={start.toISOString()} />
            <div className='flex items-center justify-between'>
              <span className='text-[0.65rem] text-[var(--text-muted)]'>
                Leave empty to remove the highlight for this week.
              </span>
              <Button
                type='submit'
                size='sm'
                className='bg-[var(--accent-solid)] text-xs font-medium text-[var(--text-on-accent)] hover:brightness-110'
              >
                Save highlight
              </Button>
            </div>
          </form>
        </div>

        {/* Markdown preview */}
        <div className='px-5 py-5'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <AlignLeft className='h-3.5 w-3.5 text-[var(--text-muted)]' />
              <span className='text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                Markdown preview
              </span>
            </div>
            <span className='text-[0.65rem] text-[var(--text-muted)]'>
              Reflects tone, highlight, filters & week range
            </span>
          </div>
          <textarea
            readOnly
            className='h-72 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3.5 font-mono text-xs leading-relaxed text-[var(--text-primary)] focus:outline-none'
            value={markdown}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default SummaryPage;
