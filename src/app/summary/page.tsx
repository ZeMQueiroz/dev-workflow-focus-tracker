import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { CopySummaryButton } from "@/components/copy-summary-button";
import { getCurrentUserEmail } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { getProjectColorDotClass } from "@/lib/project-colors";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SummaryModeToggle } from "@/components/summary-mode-toggle";
import { InlineSignInButton } from "@/components/inline-sign-in-button";
import { SummaryCharts } from "@/components/summary-charts";

import {
  Timer,
  FolderKanban,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
} from "lucide-react";
import type { Prisma } from "@prisma/client";

type SummaryMode = "self" | "manager" | "client";
type SummaryView = "full" | "totals" | "projects" | "days";

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

  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const highlightRaw = formData.get("highlight");
  const weekStartRaw = formData.get("weekStart");

  if (typeof weekStartRaw !== "string") return;

  const trimmedHighlight =
    typeof highlightRaw === "string" ? highlightRaw.trim() : "";

  const weekStart = new Date(weekStartRaw);
  if (Number.isNaN(weekStart.getTime())) {
    return;
  }

  if (!trimmedHighlight) {
    await prisma.weeklyHighlight.deleteMany({
      where: {
        ownerEmail,
        weekStart,
      },
    });
  } else {
    await prisma.weeklyHighlight.upsert({
      where: {
        ownerEmail_weekStart: {
          ownerEmail,
          weekStart,
        },
      },
      update: {
        highlight: trimmedHighlight,
      },
      create: {
        ownerEmail,
        weekStart,
        highlight: trimmedHighlight,
      },
    });
  }

  revalidatePath("/summary");
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
  if (rawMode === "manager") {
    mode = "manager";
  } else if (rawMode === "client") {
    mode = "client";
  } else {
    mode = "self";
  }

  const isManagerMode = mode === "manager";
  const isClientMode = mode === "client";

  let view: SummaryView =
    rawView === "totals" ||
    rawView === "projects" ||
    rawView === "days" ||
    rawView === "full"
      ? rawView
      : "full";

  // For client mode, keep the content more high-level
  if (isClientMode && (view === "full" || view === "days")) {
    view = "totals";
  }

  const clientName =
    typeof rawClientName === "string" ? rawClientName.trim() : "";

  const projectFilterId =
    rawProjectId && !Number.isNaN(Number(rawProjectId))
      ? Number(rawProjectId)
      : null;

  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) {
    return (
      <Card className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <CardHeader>
          <CardTitle className="text-lg text-[var(--text-primary)]">
            Weekly summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Please sign in with GitHub using the button in the top-right to see
            your weekly summary and exports.
          </p>
          <InlineSignInButton />
        </CardContent>
      </Card>
    );
  }

  const { start, end } = getWeekRange(weekOffset);

  // Build filters for sessions – ✅ use Prisma.SessionWhereInput
  const sessionWhere: Prisma.SessionWhereInput = {
    ownerEmail,
    startTime: {
      gte: start,
      lt: end,
    },
  };
  if (projectFilterId !== null) {
    sessionWhere.projectId = projectFilterId;
  }

  const [sessions, weeklyHighlight, projects] = await Promise.all([
    prisma.session.findMany({
      where: sessionWhere,
      include: {
        project: true,
      },
      orderBy: {
        startTime: "asc",
      },
    }),
    prisma.weeklyHighlight.findUnique({
      where: {
        ownerEmail_weekStart: {
          ownerEmail,
          weekStart: start,
        },
      },
    }),
    prisma.project.findMany({
      where: { ownerEmail, isArchived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  const highlightText = weeklyHighlight?.highlight ?? "";

  const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
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
    })
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
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
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
    a.key.localeCompare(b.key)
  );

  // Chart data: per-day + per-project in minutes
  const perDayChartData = dayGroups.map((day) => {
    const totalMsForDay = day.sessions.reduce(
      (acc, s) => acc + s.durationMs,
      0
    );
    const totalMinutes = Math.round(totalMsForDay / 60000);

    // day.label is like "Mon, Nov 18" – take "Mon"
    const shortLabel = day.label.split(",")[0];

    return {
      key: day.key,
      label: shortLabel,
      totalMinutes,
    };
  });

  const perProjectChartData = projectTotalsArray.map((p) => ({
    name: p.name,
    totalMinutes: Math.round(p.totalMs / 60000),
  }));

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

  // Helper: link builder keeping current state
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
        markdown += `### ${day.label}\n`;
        day.sessions.forEach((s) => {
          const timeLabel = s.startTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          markdown += `- [${s.project.name}] ${s.intention} (${formatDuration(
            s.durationMs
          )}, ${timeLabel})\n`;
          if (!isClientMode && s.notes) {
            markdown += `  - Notes: ${s.notes}\n`;
          }
        });
        markdown += `\n`;
      });
    }
  }

  // Navigation offsets
  const prevOffset = weekOffset - 1;
  const prevHref = buildHrefForOffset(prevOffset);

  const pageSubtitle =
    mode === "client"
      ? "A client-ready snapshot of shipped work and time spent this week."
      : isManagerMode
      ? "A concise weekly update you can paste into your manager doc or sprint review."
      : "A Markdown-friendly summary of your week you can paste into Obsidian or a personal review doc.";

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1 md:max-w-2xl">
            <CardTitle className="text-lg text-[var(--text-primary)]">
              Weekly summary
            </CardTitle>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {pageSubtitle}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Week range:{" "}
              <span className="font-mono text-[var(--text-primary)]">
                {weekStartLabel} – {weekEndLabel}
              </span>
            </p>
            {isClientMode && clientName && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Client label:{" "}
                <span className="font-mono text-[var(--text-primary)]">
                  {clientName}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs md:shrink-0">
            <Button
              asChild
              variant="outline"
              className="border text-xs border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            >
              <Link href={prevHref} className="flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Link>
            </Button>
            <Button
              asChild
              variant={weekOffset === 0 ? "outline" : "default"}
              className={[
                "px-3 py-1.5 text-xs border",
                weekOffset === 0
                  ? "cursor-default border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
              ].join(" ")}
            >
              <Link
                href={buildHrefForOffset(0)}
                className="flex items-center gap-1"
              >
                {weekOffset === 0 ? (
                  <>
                    <CalendarRange className="h-4 w-4" />
                    <span>Current week</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SummaryModeToggle currentMode={mode} />

            <div className="flex flex-wrap items-center gap-3">
              <CopySummaryButton text={markdown} />
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="text-[0.7rem] uppercase tracking-wide">
                  Exports
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 text-[0.7rem] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <a href={csvHref}>CSV</a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 text-[0.7rem] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <a href={jsonHref}>JSON</a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 text-[0.7rem] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <a href={pdfHref}>{isClientMode ? "Client PDF" : "PDF"}</a>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
              Content
            </span>
            <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
              <Link
                href={buildHrefForView("full")}
                className={[
                  "rounded-full px-2.5 py-1 text-[0.7rem]",
                  view === "full"
                    ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]",
                ].join(" ")}
              >
                Full
              </Link>
              <Link
                href={buildHrefForView("totals")}
                className={[
                  "rounded-full px-2.5 py-1 text-[0.7rem]",
                  view === "totals"
                    ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]",
                ].join(" ")}
              >
                Totals
              </Link>
              <Link
                href={buildHrefForView("projects")}
                className={[
                  "rounded-full px-2.5 py-1 text-[0.7rem]",
                  view === "projects"
                    ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]",
                ].join(" ")}
              >
                Projects
              </Link>
              <Link
                href={buildHrefForView("days")}
                className={[
                  "rounded-full px-2.5 py-1 text-[0.7rem]",
                  view === "days"
                    ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]",
                ].join(" ")}
              >
                Days
              </Link>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <form
              method="get"
              className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]"
            >
              <input type="hidden" name="offset" value={String(weekOffset)} />
              {mode !== "self" && (
                <input type="hidden" name="mode" value={mode} />
              )}
              {view !== "full" && (
                <input type="hidden" name="view" value={view} />
              )}

              <span className="text-[0.7rem] uppercase tracking-wide">
                Project
              </span>
              <select
                name="projectId"
                defaultValue={projectFilterId ? String(projectFilterId) : ""}
                className="h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs text-[var(--text-primary)]"
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {isClientMode && (
                <>
                  <span className="ml-2 text-[0.7rem] uppercase tracking-wide">
                    Client label
                  </span>
                  <input
                    name="clientName"
                    defaultValue={clientName}
                    placeholder="e.g. Acme Corp"
                    className="h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs text-[var(--text-primary)]"
                  />
                </>
              )}

              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-7 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 text-[0.7rem] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              >
                Apply
              </Button>
            </form>

            <p className="text-[0.7rem] text-[var(--text-muted)]">
              Filter applies to the view, Markdown, and exports.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mt-2 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Timer className="h-4 w-4" />
              <span>{isClientMode ? "Total tracked time" : "Total time"}</span>
            </div>
            <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
              {formatDuration(totalMs)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <FolderKanban className="h-4 w-4" />
              <span>
                {isClientMode ? "Projects in scope" : "Active projects"}
              </span>
            </div>
            <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
              {activeProjectsCount}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ListChecks className="h-4 w-4" />
              <span>{isClientMode ? "Work blocks" : "Sessions"}</span>
            </div>
            <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
              {sessionsCount}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Weekly highlight
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Capture the one or two things that mattered most this week. This
            text appears at the top of your Markdown export and client PDF.
          </p>

          <form action={saveWeeklyHighlight} className="mt-2 space-y-2 text-sm">
            <textarea
              name="highlight"
              defaultValue={highlightText}
              placeholder="Shipped v1 of the billing page, closed out tech debt on auth, and unblocked the team on the deployment pipeline."
              className="h-24 w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <input type="hidden" name="weekStart" value={start.toISOString()} />
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Leave empty to remove the highlight for this week.</span>
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--accent-solid)] text-xs font-medium text-[var(--text-on-accent)] hover:brightness-110"
              >
                Save highlight
              </Button>
            </div>
          </form>
        </div>

        {sessionsCount > 0 && (
          <SummaryCharts
            perDay={perDayChartData}
            perProject={perProjectChartData}
          />
        )}

        {/* By project – breakdown */}
        {includeProjects && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {projectHeading}
              </h2>
              {totalMs > 0 && (
                <p className="text-[0.7rem] text-[var(--text-muted)]">
                  Share of total focus time for this range.
                </p>
              )}
            </div>

            {projectTotalsArray.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                No sessions logged this week.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                {projectTotalsArray
                  .sort((a, b) => b.totalMs - a.totalMs)
                  .map((p) => {
                    const isSelected = projectFilterId === p.id;
                    const percentageOfWeek =
                      totalMs > 0 ? Math.round((p.totalMs / totalMs) * 100) : 0;
                    const widthPercentRaw =
                      maxProjectMs > 0 ? (p.totalMs / maxProjectMs) * 100 : 0;
                    const widthPercent = Math.max(widthPercentRaw, 6);

                    return (
                      <li
                        key={p.id}
                        className={[
                          "rounded-lg border px-3 py-2 transition-colors",
                          isSelected
                            ? "border-[var(--border-strong)] bg-[var(--bg-surface)]"
                            : "border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] hover:border-[var(--border-strong)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={getProjectColorDotClass(p.color)}
                              />
                              <span>{p.name}</span>
                              {isSelected && (
                                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-[var(--text-on-accent)]">
                                  Current filter
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {p.count} session{p.count !== 1 ? "s" : ""} ·{" "}
                              {percentageOfWeek}% of week
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-[var(--text-primary)]">
                            {formatDuration(p.totalMs)}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 rounded-full bg-[var(--border-subtle)]">
                          <div
                            className="h-1.5 rounded-full bg-[var(--accent-solid)]/80"
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

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Markdown summary
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            This is exactly what gets copied when you click &quot;Copy as
            Markdown&quot; or used as the basis for your exports.
          </p>
          <textarea
            readOnly
            className="mt-2 h-64 w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs font-mono text-[var(--text-primary)]"
            value={markdown}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryPage;
