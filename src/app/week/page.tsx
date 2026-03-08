import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { getUserProStatus } from "@/lib/subscription";

import { prisma } from "@/lib/prisma";
import { getWeekRange, formatDuration } from "@/lib/time";
import { getProjectColorDotClass } from "@/lib/project-colors";
import { InlineSignInButton } from "@/components/inline-sign-in-button";

import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/page-container";

import { Button } from "@/components/ui/button";
import {
  Timer,
  ListChecks,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Lock,
  CalendarDays,
  Activity,
  TrendingUp,
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

  // ─── SIGNED-OUT STATE ──────────────────────────────────────────────────────
  if (!session || !userId) {
    return (
      <PageContainer variant='workspace'>
        <div className='flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center'>
          <div className='flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
            <CalendarRange className='h-7 w-7 text-[var(--text-muted)]' />
          </div>
          <div className='space-y-2'>
            <h2 className='text-lg font-semibold text-[var(--text-primary)]'>
              Sign in to see your weekly overview
            </h2>
            <p className='max-w-sm text-sm text-[var(--text-muted)]'>
              Your weekly focus timeline, session breakdown, and project
              distribution will appear here after you sign in.
            </p>
          </div>
          <InlineSignInButton />
        </div>
      </PageContainer>
    );
  }

  // ─── PLAN / HISTORY LIMIT ─────────────────────────────────────────────────
  const { isPro } = await getUserProStatus(userId);

  const isFreePlanWithLimit = !isPro;

  const historyLimitDate = getHistoryLimitDate();
  const { start, end } = getWeekRange(weekOffset);

  const effectiveStart =
    !isPro && start < historyLimitDate ? historyLimitDate : start;

  const isPastFreeHistory = !isPro && end <= historyLimitDate;
  const isLockedWeek = isPastFreeHistory && isFreePlanWithLimit;

  // ─── DATA FETCH ───────────────────────────────────────────────────────────
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
    0,
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
    {},
  );

  const projectTotalsArray = Object.entries(projectTotals).map(
    ([id, value]) => {
      const v = value as ProjectTotalsEntry;
      return {
        id: Number(id),
        ...v,
      };
    },
  );

  // ─── GROUP BY DAY ─────────────────────────────────────────────────────────
  type DayGroup = {
    key: string;
    label: string;
    totalMs: number;
    sessions: (typeof sessions)[number][];
  };

  const dayMap = new Map<string, DayGroup>();

  sessions.forEach((s: SessionWithProject) => {
    const d: Date = s.startTime;
    const key: string = d.toISOString().slice(0, 10);
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
    a.key.localeCompare(b.key),
  );

  // ─── DATE LABELS ──────────────────────────────────────────────────────────
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

  // ─── ACTIVE DAY LOGIC ─────────────────────────────────────────────────────
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

  // ─── WEEK DAYS STRIP DATA ─────────────────────────────────────────────────
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

  // ─── DERIVED STATS ────────────────────────────────────────────────────────
  const projectsCount = projectTotalsArray.length;
  const activeDaysCount = dayGroups.filter((d) => d.totalMs > 0).length;
  const avgPerActiveDayMs =
    activeDaysCount > 0 ? Math.round(totalMs / activeDaysCount) : 0;

  // ─── URL HELPERS ──────────────────────────────────────────────────────────
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

  // ─── ORDERED DAY GROUPS (active day first) ────────────────────────────────
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

  // ─── ACTIVE DAY LABEL (for heading) ───────────────────────────────────────
  const activeDayGroup = dayGroups.find((d) => d.key === activeDayKey);
  const activeDayLabel = activeDayGroup?.label ?? "";

  // ─── SHARED SECTION LABEL ─────────────────────────────────────────────────
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <span className='text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
      {children}
    </span>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // WEEK STRIP (shared between normal and locked states)
  // ─────────────────────────────────────────────────────────────────────────
  const WeekStrip = ({
    interactive,
    blurred,
  }: {
    interactive: boolean;
    blurred?: boolean;
  }) => (
    <div className='overflow-x-auto'>
      <div className='flex justify-center'>
        <div
          className={cn(
            "flex min-w-max gap-2 sm:gap-2.5",
            blurred && "pointer-events-none select-none blur-[3px] opacity-50",
          )}
        >
          {weekDays.map((day) => {
            const isActive = day.key === activeDayKey;
            const isWeekend = day.isWeekend;

            const tileContent = (
              <>
                {/* Day label */}
                <span
                  className={cn(
                    "text-[0.6rem] font-semibold tracking-[0.18em]",
                    isWeekend
                      ? isActive
                        ? "text-rose-300"
                        : "text-rose-400/70"
                      : isActive
                        ? "text-[var(--text-on-accent)]"
                        : "text-[var(--text-muted)]",
                  )}
                >
                  {day.label}
                </span>

                {/* Day number */}
                <span
                  className={cn(
                    "mt-1 font-mono text-2xl font-semibold leading-none",
                    isActive
                      ? "text-[var(--text-on-accent)]"
                      : "text-[var(--text-primary)]",
                  )}
                >
                  {day.dayNumber}
                </span>

                {/* Session indicator bar */}
                <div className='mt-3 h-0.5 w-4/5 rounded-full'>
                  {day.hasSessions && (
                    <div
                      className={cn(
                        "h-full w-full rounded-full",
                        isActive
                          ? "bg-[color:rgba(0,0,0,0.35)]"
                          : "bg-[var(--accent-solid)]",
                      )}
                    />
                  )}
                </div>
              </>
            );

            const tileClasses = cn(
              "flex w-[3.75rem] flex-col items-center rounded-2xl px-2 py-4 text-xs transition-all duration-300",
              "sm:w-20",
              isActive
                ? "bg-[var(--accent-solid)] shadow-lg ring-2 ring-[var(--accent-solid)] ring-offset-2 ring-offset-[var(--bg-surface-soft)]"
                : "bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-soft)] hover:-translate-y-0.5 hover:shadow-sm hover:ring-1 hover:ring-[var(--border-subtle)]",
            );

            if (!interactive) {
              return (
                <div key={day.key} className={tileClasses}>
                  {tileContent}
                </div>
              );
            }

            return (
              <Link
                key={day.key}
                href={buildHrefForDay(day.key)}
                scroll={false}
                className={tileClasses}
              >
                {tileContent}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageContainer variant='workspace'>
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* A. WEEK HEADER                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        {/* Left: identity */}
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl'>
            Weekly review
          </h1>
          <p className='max-w-md text-sm text-[var(--text-muted)]'>
            Your focus timeline, session log, and project distribution at a
            glance.
          </p>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]'>
            <span className='flex items-center gap-1.5'>
              <CalendarRange className='h-3.5 w-3.5' />
              <span className='font-mono text-[var(--text-primary)]'>
                {weekStartLabel} – {weekEndLabel}
              </span>
            </span>
            {isFreePlanWithLimit && (
              <span className='inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--text-muted)]'>
                <Lock className='h-2.5 w-2.5' />
                Free · {FREE_HISTORY_DAYS}-day history
                <Link
                  href='/settings'
                  className='ml-1 font-semibold text-[var(--accent-solid)] hover:underline'
                >
                  Upgrade
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Right: navigation */}
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
            className={cn(
              "px-3.5 py-2 text-xs border",
              weekOffset === 0
                ? "cursor-default border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]",
            )}
          >
            <Link
              href={buildHrefForOffset(0)}
              className='flex items-center gap-1.5'
            >
              {weekOffset === 0 ? (
                <>
                  <CalendarRange className='h-3.5 w-3.5' />
                  <span>Current week</span>
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

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* B. WEEK TIMELINE / STRIP                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-4 px-0.5'>
          <SectionLabel>Week timeline</SectionLabel>
          {!isLockedWeek && sessions.length > 0 && (
            <span className='hidden text-[0.65rem] text-[var(--text-muted)] sm:inline'>
              Select a day to drill into its sessions
            </span>
          )}
        </div>

        {/* Strip container */}
        <div className='relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-4 py-5 sm:px-6'>
          {isLockedWeek ? (
            <>
              <WeekStrip interactive={false} blurred />
              {/* Lock overlay */}
              <div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl'>
                <div className='flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-1.5 shadow-lg'>
                  <Lock className='h-3 w-3 text-[var(--text-muted)]' />
                  <span className='text-[0.65rem] font-semibold tracking-wide text-[var(--text-primary)]'>
                    Extended history · Pro only
                  </span>
                </div>
              </div>
            </>
          ) : (
            <WeekStrip interactive />
          )}

          <p className='mt-3 text-center text-[0.65rem] text-[var(--text-muted)] sm:hidden'>
            {isLockedWeek
              ? "This week is outside your free history window."
              : "Tap a day to see its sessions."}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LOCKED WEEK UPSELL                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {isLockedWeek && (
        <div className='rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center'>
          {/* Icon */}
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)]'>
            <Lock className='h-6 w-6 text-[var(--text-muted)]' />
          </div>

          {/* Copy */}
          <div className='mx-auto mt-5 max-w-sm space-y-2'>
            <h2 className='text-base font-semibold text-[var(--text-primary)]'>
              This week is in your extended history
            </h2>
            <p className='text-sm text-[var(--text-muted)]'>
              Weekline Free shows the last{" "}
              <span className='font-mono'>{FREE_HISTORY_DAYS}</span> days.
              Upgrade to Pro to unlock your full timeline and explore all past
              weeks.
            </p>
          </div>

          {/* Actions */}
          <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
            <Button asChild size='sm' className='text-xs px-4'>
              <Link href='/settings'>Upgrade to Pro</Link>
            </Button>
            <Link
              href={buildHrefForOffset(0)}
              className='text-xs font-medium text-[var(--accent-solid)] hover:underline'
            >
              Go to current week →
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* EMPTY WEEK STATE                                                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {!isLockedWeek && sessions.length === 0 && (
        <div className='flex flex-col items-center gap-5 rounded-2xl border border-dashed border-[var(--border-subtle)] py-20 text-center'>
          <div className='flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
            <CalendarDays className='h-7 w-7 text-[var(--text-muted)]' />
          </div>
          <div className='space-y-1.5'>
            <p className='text-sm font-semibold text-[var(--text-primary)]'>
              No sessions this week
            </p>
            <p className='max-w-xs text-xs text-[var(--text-muted)]'>
              Log focus sessions on the Today tab, then come back here to see
              your weekly patterns.
            </p>
          </div>
          <Button
            asChild
            variant='outline'
            size='sm'
            className='text-xs gap-1.5 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]'
          >
            <Link href='/today'>Start a focus session →</Link>
          </Button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* C. WEEKLY SNAPSHOT (KPI row) — only when there are sessions          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {!isLockedWeek && sessions.length > 0 && (
        <>
          {/* KPI row */}
          <div className='rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all duration-300 hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-md'>
            <div className='grid grid-cols-2 divide-x divide-[var(--border-subtle)] md:grid-cols-4'>
              {/* Total time */}
              <div className='flex flex-col gap-1 px-5 py-4'>
                <div className='flex items-center gap-1.5'>
                  <Timer className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
                  <SectionLabel>Total time</SectionLabel>
                </div>
                <div className='font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]'>
                  {formatDuration(totalMs)}
                </div>
                {avgPerActiveDayMs > 0 && (
                  <div className='text-[0.65rem] text-[var(--text-muted)]'>
                    avg {formatDuration(avgPerActiveDayMs)} / active day
                  </div>
                )}
              </div>

              {/* Sessions */}
              <div className='flex flex-col gap-1 px-5 py-4'>
                <div className='flex items-center gap-1.5'>
                  <ListChecks className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
                  <SectionLabel>Sessions</SectionLabel>
                </div>
                <div className='font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]'>
                  {sessionsCount}
                </div>
                <div className='text-[0.65rem] text-[var(--text-muted)]'>
                  focus blocks logged
                </div>
              </div>

              {/* Active days */}
              <div className='flex flex-col gap-1 px-5 py-4'>
                <div className='flex items-center gap-1.5'>
                  <Activity className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
                  <SectionLabel>Active days</SectionLabel>
                </div>
                <div className='font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]'>
                  {activeDaysCount}
                  <span className='ml-1 text-sm font-normal text-[var(--text-muted)]'>
                    / 7
                  </span>
                </div>
                <div className='text-[0.65rem] text-[var(--text-muted)]'>
                  days with sessions
                </div>
              </div>

              {/* Projects */}
              <div className='flex flex-col gap-1 px-5 py-4'>
                <div className='flex items-center gap-1.5'>
                  <FolderKanban className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
                  <SectionLabel>Projects</SectionLabel>
                </div>
                <div className='font-mono text-2xl font-semibold tracking-tight text-[var(--text-primary)]'>
                  {projectsCount}
                </div>
                <div className='text-[0.65rem] text-[var(--text-muted)]'>
                  projects touched
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* D + E. TWO-COLUMN: Day Drilldown + Project Breakdown              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className='grid gap-6 lg:grid-cols-[3fr,2fr]'>
            {/* ─────────────────────────────────────────────── D. DAY FOCUS ── */}
            <div className='space-y-3'>
              {/* Section header */}
              <div className='flex items-center gap-3 px-0.5'>
                <SectionLabel>Day focus</SectionLabel>
                {activeDayLabel && (
                  <span className='text-xs font-medium text-[var(--text-primary)]'>
                    · {activeDayLabel}
                  </span>
                )}
                <div className='h-px flex-1 bg-[var(--border-subtle)]' />
              </div>

              {/* Day panels */}
              <div className='space-y-3'>
                {orderedDayGroups.map((day, idx) => {
                  const isActiveDay = day.key === activeDayKey;

                  return (
                    <div
                      key={day.key}
                      className={cn(
                        "rounded-2xl border transition-all",
                        isActiveDay
                          ? "border-[var(--border-strong)] bg-[var(--bg-surface)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface-soft)]",
                      )}
                    >
                      {/* Day header */}
                      <div
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-t-2xl px-4 py-3 border-b",
                          isActiveDay
                            ? "bg-[var(--accent-soft)] border-[var(--border-strong)]"
                            : "border-[var(--border-subtle)]",
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              isActiveDay
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-muted)]",
                            )}
                          >
                            {day.label}
                          </span>
                          {isActiveDay && (
                            <span className='rounded-full bg-[var(--accent-solid)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--text-on-accent)]'>
                              Selected
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-3 text-[0.7rem] text-[var(--text-muted)]'>
                          <span>
                            {day.sessions.length} session
                            {day.sessions.length !== 1 ? "s" : ""}
                          </span>
                          <span className='font-mono font-medium text-[var(--text-primary)]'>
                            {formatDuration(day.totalMs)}
                          </span>
                        </div>
                      </div>

                      {/* Session list */}
                      <ul className='divide-y divide-[var(--border-subtle)] px-4'>
                        {day.sessions.map((s) => {
                          const timeLabel = s.startTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <li key={s.id} className='py-3'>
                              <div className='flex items-start justify-between gap-3'>
                                {/* Left: dot + project + intention */}
                                <div className='flex min-w-0 flex-1 items-start gap-2'>
                                  <span
                                    className={cn(
                                      getProjectColorDotClass(s.project.color),
                                      "mt-0.5 shrink-0",
                                    )}
                                  />
                                  <div className='min-w-0'>
                                    <div className='flex flex-wrap items-center gap-1.5'>
                                      <span className='rounded-sm bg-[var(--bg-surface-soft)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--text-muted)]'>
                                        {s.project.name}
                                      </span>
                                    </div>
                                    <p className='mt-0.5 truncate text-xs text-[var(--text-primary)]'>
                                      {s.intention}
                                    </p>
                                    {s.notes && (
                                      <p className='mt-0.5 text-[0.65rem] italic text-[var(--text-muted)]'>
                                        {s.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: time + duration */}
                                <div className='shrink-0 text-right'>
                                  <div className='font-mono text-xs font-medium text-[var(--text-primary)]'>
                                    {formatDuration(s.durationMs)}
                                  </div>
                                  <div className='text-[0.65rem] text-[var(--text-muted)]'>
                                    {timeLabel}
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─────────────────────────────────── E. PROJECT DISTRIBUTION ── */}
            <div className='space-y-3'>
              {/* Section header */}
              <div className='flex items-center gap-3 px-0.5'>
                <SectionLabel>Project distribution</SectionLabel>
                <div className='h-px flex-1 bg-[var(--border-subtle)]' />
              </div>

              {projectTotalsArray.length === 0 ? (
                <p className='text-sm text-[var(--text-muted)]'>
                  No sessions logged this week.
                </p>
              ) : (
                <div className='rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden'>
                  <div className='divide-y divide-[var(--border-subtle)]'>
                    {projectTotalsArray
                      .sort((a, b) => b.totalMs - a.totalMs)
                      .map((p, idx) => {
                        const ratio =
                          totalMs > 0 ? (p.totalMs / totalMs) * 100 : 0;
                        return (
                          <div key={p.id} className='px-4 py-3.5'>
                            {/* Top row: dot + name + time */}
                            <div className='flex items-center justify-between gap-2'>
                              <div className='flex min-w-0 items-center gap-2'>
                                <span
                                  className={getProjectColorDotClass(p.color)}
                                />
                                <span className='truncate text-sm font-medium text-[var(--text-primary)]'>
                                  {p.name}
                                </span>
                              </div>
                              <span className='shrink-0 font-mono text-sm font-semibold text-[var(--text-primary)]'>
                                {formatDuration(p.totalMs)}
                              </span>
                            </div>

                            {/* Second row: sessions + percent */}
                            <div className='mt-1 flex items-center justify-between gap-2 text-[0.65rem] text-[var(--text-muted)]'>
                              <span>
                                {p.count} session{p.count !== 1 ? "s" : ""}
                              </span>
                              <span className='font-medium'>
                                {Math.round(ratio)}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-surface-soft)]'>
                              <div
                                className='h-full rounded-full bg-gradient-to-r from-[var(--accent-solid)] to-[var(--accent-solid)]/60 transition-all'
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Footer total */}
                  <div className='flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-[0.65rem] text-[var(--text-muted)]'>
                    <div className='flex items-center gap-1'>
                      <TrendingUp className='h-3 w-3' />
                      <span>Week total</span>
                    </div>
                    <span className='font-mono font-semibold text-[var(--text-primary)]'>
                      {formatDuration(totalMs)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default WeekPage;
