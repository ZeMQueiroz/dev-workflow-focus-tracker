import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { getProjectColorDotClass } from "@/lib/project-colors";
import { InlineSignInButton } from "@/components/inline-sign-in-button";

import { cn } from "@/lib/utils";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Timer,
  ListChecks,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Lock,
} from "lucide-react";

const FREE_HISTORY_DAYS = 30;

type SessionWithProject = Prisma.SessionGetPayload<{
  include: { project: true };
}>;

interface ProjectTotalsEntry {
  name: string;
  color: string | null;
  totalMs: number;
  count: number;
}

type ProjectTotalsRecord = Record<number, ProjectTotalsEntry>;

type WeekPageSearchParams = {
  offset?: string;
  day?: string;
};

type WeekPageProps = {
  searchParams: Promise<WeekPageSearchParams>;
};

function getHistoryLimitDate() {
  const d = new Date();
  d.setDate(d.getDate() - FREE_HISTORY_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

const WeekPage = async ({ searchParams }: WeekPageProps) => {
  const resolvedSearchParams = await searchParams;
  const rawOffset = resolvedSearchParams?.offset;
  const rawDay = resolvedSearchParams?.day;

  const weekOffset = rawOffset ? Number(rawOffset) || 0 : 0;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!session || !userId) {
    return (
      <Card className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <CardHeader>
          <CardTitle className="text-lg text-[var(--text-primary)]">
            Weekly overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Please sign in with GitHub using the button in the top-right to see
            your weekly overview.
          </p>
          <InlineSignInButton />
        </CardContent>
      </Card>
    );
  }

  // --- PLAN / HISTORY LIMIT SETUP (Option A: UserSettings) -----------------

  const userSettings = (prisma as any).userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const isPro = userSettings.isPro || userSettings.plan === "PRO";

  const isFreePlanWithLimit = !isPro;

  const historyLimitDate = getHistoryLimitDate();
  const { start, end } = getWeekRange(weekOffset);

  // For free users, never fetch sessions older than the limit.
  const effectiveStart =
    !isPro && start < historyLimitDate ? historyLimitDate : start;

  // Whole week is strictly before the free window (so it’s “locked” for Free)
  const isPastFreeHistory = !isPro && end <= historyLimitDate;
  const isLockedWeek = isPastFreeHistory && isFreePlanWithLimit;

  // --- DATA FETCH ----------------------------------------------------------

  const sessions = await prisma.session.findMany({
    where: {
      ownerId: userId,
      startTime: {
        gte: effectiveStart,
        lt: end,
      },
    },
    include: {
      project: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const totalMs: number = sessions.reduce<number>(
    (acc: number, s: SessionWithProject) => acc + s.durationMs,
    0
  );
  const sessionsCount = sessions.length;

  const projectTotals = sessions.reduce<ProjectTotalsRecord>(
    (acc: ProjectTotalsRecord, s: SessionWithProject) => {
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
    },
    {}
  );

  const projectTotalsArray = Object.entries(projectTotals).map(
    ([id, value]) => {
      const v = value as ProjectTotalsEntry;
      return {
        id: Number(id),
        ...v,
      };
    }
  );

  // Group by day
  type DayGroup = {
    key: string;
    label: string;
    totalMs: number;
    sessions: (typeof sessions)[number][];
  };

  const dayMap = new Map<string, DayGroup>();

  sessions.forEach((s: SessionWithProject) => {
    const d: Date = s.startTime;
    const key: string = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!dayMap.has(key)) {
      const label: string = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      dayMap.set(key, { key, label, totalMs: 0, sessions: [] } as DayGroup);
    }
    const group: DayGroup = dayMap.get(key)!;
    group.sessions.push(s);
    group.totalMs += s.durationMs;
  });

  const dayGroups = Array.from(dayMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );

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

  // Active day logic for the strip
  const rawDayCandidate = rawDay || undefined;
  let activeDayKey: string | null = null;

  if (rawDayCandidate) {
    const d = new Date(rawDayCandidate);
    if (!Number.isNaN(d.getTime()) && d >= start && d < end) {
      activeDayKey = d.toISOString().slice(0, 10);
    }
  }

  if (!activeDayKey) {
    const today = new Date();
    if (today >= start && today < end) {
      activeDayKey = today.toISOString().slice(0, 10);
    }
  }
  if (!activeDayKey) {
    activeDayKey = start.toISOString().slice(0, 10);
  }

  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    const key = d.toISOString().slice(0, 10);
    const label = d
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase();
    const dayNumber = d.getDate();
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const totalForDay = dayMap.get(key)?.totalMs ?? 0;
    const hasSessions = totalForDay > 0;

    return {
      key,
      label,
      dayNumber,
      isWeekend,
      hasSessions,
      totalMs: totalForDay,
    };
  });

  const projectsCount = projectTotalsArray.length;

  // For the “By day” totals line
  const activeDaysCount = dayGroups.filter((d) => d.totalMs > 0).length;
  const avgPerActiveDayMs =
    activeDaysCount > 0 ? Math.round(totalMs / activeDaysCount) : 0;

  // URL helpers
  const buildHrefForOffset = (offset: number) => {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    const qs = params.toString();
    return qs ? `/week?${qs}` : "/week";
  };

  const buildHrefForDay = (dayKey: string) => {
    const params = new URLSearchParams();
    params.set("offset", String(weekOffset));
    params.set("day", dayKey);
    const qs = params.toString();
    return `/week?${qs}`;
  };

  const prevOffset = weekOffset - 1;
  const prevHref = buildHrefForOffset(prevOffset);

  // Reorder dayGroups so the active day shows first
  let orderedDayGroups = dayGroups;
  if (activeDayKey) {
    const active = dayGroups.find((d) => d.key === activeDayKey);
    if (active) {
      orderedDayGroups = [
        active,
        ...dayGroups.filter((d) => d.key !== activeDayKey),
      ];
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-[var(--text-primary)]">
              Weekly overview
            </CardTitle>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              See how your focus time is distributed across the week and
              projects.
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Week range:{" "}
              <span className="font-mono text-[var(--text-primary)]">
                {weekStartLabel} – {weekEndLabel}
              </span>
            </p>

            {isFreePlanWithLimit && (
              <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                Free plan shows the last{" "}
                <span className="font-mono">{FREE_HISTORY_DAYS}</span> days of
                history.{" "}
                <Link
                  href="/settings"
                  className="font-medium text-[var(--accent-solid)] hover:underline"
                >
                  Upgrade to Pro
                </Link>{" "}
                to unlock your full Weekline.
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Button
                asChild
                variant="outline"
                className="border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              >
                <Link
                  href={prevHref}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Link>
              </Button>
              <Button
                asChild
                variant={weekOffset === 0 ? "outline" : "default"}
                className={cn(
                  "px-3 py-1.5 text-xs border",
                  weekOffset === 0
                    ? "cursor-default border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                )}
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
        </div>
      </CardHeader>

      <CardContent>
        {/* LOCKED WEEK (free user scrolling beyond 30 days) */}
        {sessions.length === 0 && isLockedWeek ? (
          <div className="space-y-4">
            {/* Week label row */}
            <div className="mb-1 flex items-center justify-between gap-4 px-1 sm:px-2">
              <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Week
              </span>
              <span className="hidden text-[0.7rem] text-[var(--text-muted)] sm:inline">
                Older weeks are part of your extended history.
              </span>
            </div>

            {/* Week strip with blur overlay */}
            <div
              className={cn(
                "relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-4 sm:px-6 sm:py-5",
                "overflow-hidden"
              )}
            >
              <div className="mx-auto max-w-full overflow-x-auto">
                <div className="flex min-w-max justify-start gap-2 blur-[2px] opacity-60 sm:gap-3">
                  {weekDays.map((day) => {
                    const isActive = day.key === activeDayKey;
                    const isWeekend = day.isWeekend;

                    return (
                      <div
                        key={day.key}
                        className={cn(
                          "flex w-16 flex-col items-center rounded-2xl px-2.5 py-2.5 text-xs sm:w-20",
                          isActive
                            ? "bg-[var(--accent-solid)] text-[var(--bg-app)] shadow-md"
                            : "bg-[var(--bg-surface)] text-[var(--text-primary)]"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[0.65rem] font-semibold tracking-[0.16em]",
                            isWeekend
                              ? isActive
                                ? "text-red-600"
                                : "text-red-400"
                              : isActive
                              ? "text-[var(--bg-app)]"
                              : "text-[var(--text-muted)]"
                          )}
                        >
                          {day.label}
                        </span>
                        <span
                          className={cn(
                            "mt-1 text-lg font-mono",
                            isActive
                              ? "text-[var(--bg-app)]"
                              : "text-[var(--text-primary)]"
                          )}
                        >
                          {day.dayNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-4 text-center text-[0.65rem] text-[var(--text-muted)] sm:hidden">
                Older weeks are part of your extended history.
              </p>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-[color:rgba(0,0,0,0.7)] px-4 py-1 text-[0.7rem] font-medium text-[var(--text-primary)]">
                  Weekline Pro unlocks this week&apos;s details
                </div>
              </div>
            </div>

            {/* Upsell message under the strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-4 py-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-surface)]">
                  <Lock className="h-3 w-3 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-primary)]">
                    This week is outside your free history window.
                  </p>
                  <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                    Weekline Free keeps the last {FREE_HISTORY_DAYS} days of
                    activity visible. Upgrade to Pro to unlock your full
                    timeline and explore all past weeks.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" className="text-xs">
                  <Link href="/settings">Upgrade to Pro</Link>
                </Button>
                <Link
                  href={buildHrefForOffset(0)}
                  className="text-[0.7rem] font-medium text-[var(--accent-solid)] hover:underline"
                >
                  Jump back to recent weeks →
                </Link>
              </div>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          // NORMAL EMPTY STATE (no sessions, but week is within free window)
          <div className="mt-2 space-y-2 text-sm text-[var(--text-muted)]">
            <p>
              No sessions logged this week yet. Log a few focus sessions on the{" "}
              <span className="font-medium text-[var(--text-primary)]">
                Today
              </span>{" "}
              tab, then come back here to see your weekly patterns.
            </p>
            <Link
              href="/today"
              className="inline-flex items-center text-xs font-medium text-[var(--accent-solid)] hover:underline"
            >
              Go to Today →
            </Link>
          </div>
        ) : (
          <>
            {/* Week strip + quick stats */}
            <div className="space-y-4">
              {/* Week label row */}
              <div className="mb-1 flex items-center justify-between gap-4 px-1 sm:px-2">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Week
                </span>
                <span className="hidden text-[0.7rem] text-[var(--text-muted)] sm:inline">
                  Click a day to focus it in the list below.
                </span>
              </div>

              {/* Week strip (normal, interactive) */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-full overflow-x-auto">
                  <div className="flex min-w-max justify-start gap-2 sm:gap-3">
                    {weekDays.map((day) => {
                      const isActive = day.key === activeDayKey;
                      const isWeekend = day.isWeekend;

                      return (
                        <Link
                          key={day.key}
                          href={buildHrefForDay(day.key)}
                          scroll={false}
                          className={cn(
                            "flex w-16 flex-col items-center rounded-2xl px-2.5 py-2.5 text-xs transition sm:w-20",
                            isActive
                              ? "bg-[var(--accent-solid)] text-[var(--bg-app)] shadow-md"
                              : "bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]"
                          )}
                        >
                          <span
                            className={cn(
                              "text-[0.65rem] font-semibold tracking-[0.16em]",
                              isWeekend
                                ? isActive
                                  ? "text-red-600"
                                  : "text-red-400"
                                : isActive
                                ? "text-[var(--bg-app)]"
                                : "text-[var(--text-muted)]"
                            )}
                          >
                            {day.label}
                          </span>
                          <span
                            className={cn(
                              "mt-1 text-lg font-mono",
                              isActive
                                ? "text-[var(--bg-app)]"
                                : "text-[var(--text-primary)]"
                            )}
                          >
                            {day.dayNumber}
                          </span>
                          {day.hasSessions && (
                            <span
                              className={cn(
                                "mt-2 h-1.5 w-1.5 rounded-full",
                                isActive
                                  ? "bg-[color:rgba(0,0,0,0.5)]"
                                  : "bg-[var(--accent-solid)]"
                              )}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <p className="mt-4 text-center text-[0.65rem] text-[var(--text-muted)] sm:hidden">
                  Swipe left/right to pick a day and see its sessions below.
                </p>
              </div>

              {/* At-a-glance stats */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Timer className="h-4 w-4" />
                    <span>Total time</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
                    {formatDuration(totalMs)}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <ListChecks className="h-4 w-4" />
                    <span>Sessions</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
                    {sessionsCount}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <FolderKanban className="h-4 w-4" />
                    <span>Projects</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono text-[var(--text-primary)]">
                    {projectsCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Main layout */}
            <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1fr]">
              {/* Left: days */}
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  By day
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Each day shows its total focus time and the sessions logged.
                  The selected day from the strip appears first.
                </p>

                <div className="mt-3 space-y-3">
                  {orderedDayGroups.map((day) => (
                    <div
                      key={day.key}
                      className={cn(
                        "rounded-lg border bg-[var(--bg-surface-soft)] p-3",
                        day.key === activeDayKey
                          ? "border-[var(--border-strong)]"
                          : "border-[var(--border-subtle)]"
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {day.label}
                          {day.key === activeDayKey && (
                            <span className="ml-2 rounded-full bg-[color:rgba(255,255,255,0.06)] px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)]">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-primary)]">
                        {day.sessions.map((s) => {
                          const timeLabel = s.startTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <li key={s.id} className="leading-snug">
                              <div className="flex justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={getProjectColorDotClass(
                                      s.project.color
                                    )}
                                  />
                                  <span className="truncate">
                                    [{s.project.name}] {s.intention}
                                  </span>
                                </span>

                                <span className="shrink-0 font-mono text-[var(--text-muted)]">
                                  {formatDuration(s.durationMs)}, {timeLabel}
                                </span>
                              </div>
                              {s.notes && (
                                <div className="mt-0.5 text-[0.7rem] text-[var(--text-muted)]">
                                  Notes: {s.notes}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2 text-[0.7rem] text-[var(--text-muted)]">
                        <span>Day total</span>
                        <div className="flex items-center gap-3">
                          <span>
                            {day.sessions.length} session
                            {day.sessions.length !== 1 ? "s" : ""}
                          </span>
                          <span className="font-mono text-[var(--text-primary)]">
                            {formatDuration(day.totalMs)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: projects */}
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  By project
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Total time per project for this week, with a bar showing its
                  share of your focus time.
                </p>

                {projectTotalsArray.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">
                    No sessions logged this week.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                    {projectTotalsArray
                      .sort((a, b) => b.totalMs - a.totalMs)
                      .map((p) => {
                        const ratio =
                          totalMs > 0 ? (p.totalMs / totalMs) * 100 : 0;
                        return (
                          <li
                            key={p.id}
                            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={getProjectColorDotClass(p.color)}
                                />
                                <span>{p.name}</span>
                              </div>
                              <span className="font-mono text-[var(--text-primary)]">
                                {formatDuration(p.totalMs)}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              {p.count} session{p.count !== 1 ? "s" : ""}
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                              <div
                                className="h-full bg-[var(--accent-solid)]"
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WeekPage;
