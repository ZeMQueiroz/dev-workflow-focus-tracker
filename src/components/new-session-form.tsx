"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useFormStatus } from "react-dom";
import { createSession } from "@/app/actions/session-actions";
import { formatDuration } from "@/lib/time";
import { getProjectColorDotClass } from "@/lib/project-colors";
import { useActiveSession } from "@/components/active-session-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  PenLine,
  Timer,
  ChevronDown,
} from "lucide-react";

type ProjectSummary = {
  id: number;
  name: string;
  color: string | null;
};

type NewSessionFormProps = {
  projects: ProjectSummary[];
  totalTodayMs: number;
};

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const LAST_PROJECT_KEY = "weekline:last-project";
const POMODORO_MINUTES = 25;

type SessionMode = "manual" | "timer" | "pomodoro";

const MODE_LABELS: { mode: SessionMode; label: string; icon: typeof Timer }[] =
  [
    { mode: "timer", label: "Standard", icon: Timer },
    { mode: "manual", label: "Manual", icon: PenLine },
    { mode: "pomodoro", label: "Pomodoro", icon: Clock },
  ];

/* ── SVG circular ring (larger, thicker, glowing) ── */
const RING_SIZE = 360;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CircularRing = ({
  progress,
  isRunning,
  isPaused,
}: {
  progress: number; // 0–1
  isRunning: boolean;
  isPaused: boolean;
}) => {
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <svg
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className='absolute inset-0 h-full w-full'
      style={{
        transform: "rotate(-90deg)",
        animation: isRunning
          ? "timer-ring-glow 3s ease-in-out infinite"
          : "none",
      }}
    >
      {/* Background track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill='none'
        stroke='var(--border-subtle)'
        strokeWidth={RING_STROKE}
        opacity={0.35}
      />
      {/* Progress arc */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill='none'
        stroke={
          isRunning
            ? "var(--accent-solid)"
            : isPaused
              ? "var(--accent-solid)"
              : "var(--border-strong)"
        }
        strokeWidth={RING_STROKE}
        strokeLinecap='round'
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        opacity={isPaused ? 0.5 : 1}
        className='transition-[stroke-dashoffset] duration-1000 ease-linear'
      />
    </svg>
  );
};

const SubmitButton = ({ disabled }: { disabled: boolean }) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type='submit'
      className='w-full rounded-xl bg-[var(--accent-solid)] px-6 py-3 text-sm font-semibold text-[var(--text-on-accent)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50'
      disabled={pending || disabled}
    >
      {pending ? "Saving…" : "Save session"}
    </Button>
  );
};

const NewSessionForm = ({ projects, totalTodayMs }: NewSessionFormProps) => {
  // ---- Project selection / last used ----
  const hasProjects = projects.length > 0;
  const [projectId, setProjectId] = useState<string | "new">(() => {
    if (!hasProjects) return "new";

    if (typeof window === "undefined") {
      return String(projects[0].id);
    }

    const stored = window.localStorage.getItem(LAST_PROJECT_KEY);
    if (stored && projects.some((p) => String(p.id) === stored)) {
      return stored;
    }

    return String(projects[0].id);
  });

  useEffect(() => {
    if (!projectId) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_PROJECT_KEY, projectId);
  }, [projectId]);

  const {
    state: active,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
  } = useActiveSession();

  const [intention, setIntention] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    if (!intention && active.intention) {
      setIntention(active.intention);
    }
  }, [active.intention, intention]);

  const [manualDuration, setManualDuration] = useState("25");
  const [sessionMode, setSessionMode] = useState<SessionMode>("timer");

  const disableForm = !hasProjects;
  const hasIntention = intention.trim().length > 0;

  const isPomodoro = sessionMode === "pomodoro";
  const useTimer = sessionMode === "timer" || sessionMode === "pomodoro";

  const hasElapsed = active.elapsedMs > 0;

  let effectiveDurationMinutes: number;

  if (sessionMode === "manual") {
    effectiveDurationMinutes = manualDuration ? Number(manualDuration) || 0 : 0;
  } else if (sessionMode === "timer") {
    effectiveDurationMinutes = hasElapsed
      ? Math.max(1, Math.round(active.elapsedMs / 60000))
      : 0;
  } else {
    if (!hasElapsed) {
      effectiveDurationMinutes = POMODORO_MINUTES;
    } else {
      const elapsedMinutes = Math.max(1, Math.round(active.elapsedMs / 60000));
      effectiveDurationMinutes = Math.min(POMODORO_MINUTES, elapsedMinutes);
    }
  }

  const canSubmit =
    !disableForm && hasIntention && effectiveDurationMinutes > 0;

  const isRunning = useTimer && active.isRunning;
  const isIdle = !isRunning && active.elapsedMs === 0;
  const isPaused = !isRunning && active.elapsedMs > 0;

  const handleModeChange = (nextMode: SessionMode) => {
    setSessionMode(nextMode);
    if (nextMode === "manual") {
      resetSession();
    }
    if (nextMode === "pomodoro") {
      setManualDuration(String(POMODORO_MINUTES));
    }
  };

  const handlePlayPauseTimer = () => {
    if (!useTimer || disableForm) return;

    if (!active.isRunning && active.elapsedMs === 0) {
      if (!hasIntention) return;

      const project = projects.find((p) => String(p.id) === projectId);
      const projectName = project?.name ?? "Untitled project";

      startSession({
        projectName,
        intention: intention.trim() || "Focused work",
      });
      return;
    }

    if (active.isRunning) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  const handleResetTimer = () => {
    if (!useTimer) return;
    resetSession();
  };

  // ---- Timer display ----
  const rawElapsedMs = useTimer ? active.elapsedMs : 0;
  const pomodoroTargetMs = POMODORO_MINUTES * 60 * 1000;

  const displayMs =
    isPomodoro && pomodoroTargetMs > 0
      ? Math.max(0, pomodoroTargetMs - rawElapsedMs)
      : rawElapsedMs;

  // Ring progress (0–1): pomodoro = elapsed/target, standard = loops every 60 min
  let ringProgress = 0;
  if (isPomodoro && pomodoroTargetMs > 0) {
    ringProgress = Math.min(1, rawElapsedMs / pomodoroTargetMs);
  } else if (rawElapsedMs > 0) {
    // Standard: progress within the current hour
    const totalSeconds = Math.floor(rawElapsedMs / 1000);
    ringProgress = (totalSeconds % 3600) / 3600;
  }

  // State label + color
  const stateLabel = isRunning
    ? "Focusing"
    : isPaused
      ? "Paused"
      : isPomodoro
        ? "Pomodoro"
        : "Ready";

  const stateDotColor = isRunning
    ? "bg-emerald-400"
    : isPaused
      ? "bg-amber-400"
      : "bg-[var(--border-strong)]";

  // Primary action label
  const primaryActionLabel = isRunning
    ? "Pause"
    : isPaused
      ? "Resume"
      : "Start";

  return (
    <form action={createSession}>
      {/* Hidden fields */}
      <input type='hidden' name='projectId' value={projectId} />
      <input
        type='hidden'
        name='durationMinutes'
        value={effectiveDurationMinutes}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HERO FOCUS CARD — single unified surface                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        className={[
          "relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[var(--bg-surface-soft)] to-[var(--bg-surface)] p-5 sm:p-8 transition-all duration-700",
          isRunning
            ? "border-[color-mix(in_srgb,var(--accent-solid)_40%,var(--border-subtle))] shadow-[0_0_40px_-12px_var(--accent-soft)]"
            : "border-[var(--border-subtle)]",
        ].join(" ")}
      >
        {/* Ambient glow when running */}
        <div
          className={[
            "pointer-events-none absolute -top-1/3 left-1/2 h-2/3 w-2/3 -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-1000",
            isRunning ? "opacity-30" : "opacity-0",
          ].join(" ")}
          style={{ background: "var(--accent-soft)" }}
        />

        {/* ─── MODE TABS ─── */}
        <div className='relative flex justify-center mb-6'>
          <div
            className='inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1'
            role='tablist'
            aria-label='Timer mode'
          >
            {MODE_LABELS.map(({ mode, label, icon: Icon }) => {
              const selected = sessionMode === mode;
              return (
                <button
                  key={mode}
                  type='button'
                  role='tab'
                  aria-selected={selected}
                  onClick={() => handleModeChange(mode)}
                  className={[
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm",
                    selected
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  <Icon className='h-3.5 w-3.5' />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── TIMER DISPLAY ─── */}
        <div className='relative flex flex-col items-center gap-4 py-2 sm:py-4'>
          {sessionMode === "manual" ? (
            /* Manual: ring wrapping a number input */
            <div
              className='relative flex items-center justify-center'
              style={{ width: RING_SIZE, height: RING_SIZE }}
            >
              {/* Static ring */}
              <svg
                width={RING_SIZE}
                height={RING_SIZE}
                className='absolute inset-0'
              >
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill='none'
                  stroke='var(--border-subtle)'
                  strokeWidth={RING_STROKE}
                  opacity={0.3}
                />
              </svg>
              <div className='relative z-10 flex flex-col items-center gap-1'>
                <Input
                  type='number'
                  min={0}
                  disabled={disableForm}
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className='w-28 border-none bg-transparent text-center font-mono text-6xl font-semibold text-[var(--text-primary)] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-7xl'
                  placeholder='25'
                  style={{ MozAppearance: "textfield" } as React.CSSProperties}
                />
                <span className='text-[0.7rem] font-medium uppercase tracking-widest text-[var(--text-muted)]'>
                  minutes
                </span>
              </div>
            </div>
          ) : (
            /* Timer / Pomodoro: ring + big digits */
            <div
              className='relative flex items-center justify-center'
              style={{ width: RING_SIZE, height: RING_SIZE }}
            >
              <CircularRing
                progress={ringProgress}
                isRunning={isRunning}
                isPaused={isPaused}
              />

              {/* Inner content */}
              <div className='relative z-10 flex flex-col items-center gap-1.5'>
                {/* Status label */}
                <div className='flex items-center gap-2'>
                  <span
                    className={[
                      "h-2 w-2 rounded-full transition-colors",
                      stateDotColor,
                    ].join(" ")}
                    style={
                      isRunning
                        ? {
                            animation:
                              "timer-dot-pulse 2s ease-in-out infinite",
                          }
                        : {}
                    }
                  />
                  <span className='text-[0.7rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]'>
                    {stateLabel}
                  </span>
                </div>

                {/* Big digits */}
                <div
                  className={[
                    "font-mono text-6xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-7xl transition-all duration-500",
                    isRunning
                      ? "drop-shadow-[0_0_18px_var(--accent-soft)]"
                      : "",
                  ].join(" ")}
                >
                  {formatElapsed(displayMs)}
                </div>

                {isPomodoro && (
                  <span className='text-xs text-[var(--text-muted)]'>
                    {POMODORO_MINUTES}m focus block
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─── CONTROLS ─── */}
          {useTimer && (
            <div className='flex items-center gap-5 mt-1'>
              {/* Reset */}
              <button
                type='button'
                className='flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none'
                onClick={handleResetTimer}
                disabled={disableForm || isIdle}
                aria-label='Reset timer'
              >
                <span className='flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
                  <RotateCcw className='h-4.5 w-4.5' />
                </span>
                <span className='text-[0.6rem] font-medium uppercase tracking-wider'>
                  Reset
                </span>
              </button>

              {/* Play / Pause — hero button */}
              <button
                type='button'
                disabled={
                  disableForm ||
                  !useTimer ||
                  (!hasIntention && active.elapsedMs === 0)
                }
                className={[
                  "flex flex-col items-center gap-1.5 transition-all",
                  "disabled:opacity-40 disabled:pointer-events-none",
                ].join(" ")}
                onClick={handlePlayPauseTimer}
                aria-label={
                  isRunning
                    ? "Pause timer"
                    : isPaused
                      ? "Resume timer"
                      : "Start timer"
                }
              >
                <span
                  className={[
                    "flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full shadow-lg transition-all duration-300",
                    isRunning
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-[0_0_24px_-4px_var(--accent-soft)] hover:scale-105"
                      : isPaused
                        ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:scale-105 hover:brightness-110"
                        : "bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:scale-105 hover:brightness-95",
                  ].join(" ")}
                >
                  {isRunning ? (
                    <Pause className='h-7 w-7' />
                  ) : (
                    <Play className='h-7 w-7 translate-x-0.5' />
                  )}
                </span>
                <span className='text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]'>
                  {primaryActionLabel}
                </span>
              </button>

              {/* Spacer to keep hero centered */}
              <div className='w-[calc(2.75rem+1.5rem)]' />
            </div>
          )}

          {/* Today summary strip */}
          <div className='flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-1.5 mt-1'>
            <span className='text-[0.7rem] text-[var(--text-muted)]'>
              Today so far
            </span>
            <span className='font-mono text-xs font-medium text-[var(--text-primary)]'>
              {formatDuration(totalTodayMs)}
            </span>
            {effectiveDurationMinutes > 0 && (
              <>
                <span className='text-[var(--border-strong)]'>·</span>
                <span className='text-[0.7rem] text-[var(--text-muted)]'>
                  This session
                </span>
                <span className='font-mono text-xs font-medium text-[var(--text-primary)]'>
                  {effectiveDurationMinutes}m
                </span>
              </>
            )}
          </div>
        </div>

        {/* ─── DIVIDER ─── */}
        <div className='my-5 border-t border-[var(--border-subtle)] opacity-50' />

        {/* ─── SESSION DETAILS (compact, integrated) ─── */}
        <div className='space-y-3'>
          {/* Project + Intention — side by side */}
          <div className='grid gap-3 sm:grid-cols-2'>
            <div>
              <Label className='mb-1 block text-[0.7rem] font-medium text-[var(--text-muted)]'>
                Project
              </Label>
              {hasProjects ? (
                <div suppressHydrationWarning>
                  <Select
                    value={projectId}
                    onValueChange={setProjectId}
                    disabled={disableForm}
                  >
                    <SelectTrigger className='w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)]'>
                      <SelectValue placeholder='Select a project' />
                    </SelectTrigger>
                    <SelectContent className='border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)]'>
                      {projects.map((project) => (
                        <SelectItem
                          key={project.id}
                          value={String(project.id)}
                          className='text-[var(--text-primary)]'
                        >
                          <span className='flex items-center gap-2'>
                            <span
                              className={getProjectColorDotClass(project.color)}
                            />
                            <span>{project.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className='flex flex-col gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between'>
                  <p>No active projects yet.</p>
                  <Button
                    asChild
                    size='sm'
                    className='mt-1 bg-[var(--accent-solid)] text-[0.7rem] font-medium text-slate-900 hover:brightness-95 sm:mt-0'
                  >
                    <Link href='/projects'>Create project →</Link>
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label className='mb-1 block text-[0.7rem] font-medium text-[var(--text-muted)]'>
                What are you focusing on?
              </Label>
              <Input
                name='intention'
                disabled={disableForm}
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                className='w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]'
                placeholder='e.g. Draft billing API tests'
              />
            </div>
          </div>

          {/* Notes toggle */}
          <div>
            <button
              type='button'
              onClick={() => setNotesOpen((v) => !v)}
              className='flex items-center gap-1.5 text-[0.7rem] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors'
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${notesOpen ? "rotate-180" : "rotate-0"}`}
              />
              {notesOpen ? "Hide notes" : "Add notes"}
            </button>

            {notesOpen && (
              <Textarea
                name='notes'
                disabled={disableForm}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className='mt-2 h-16 w-full resize-none border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]'
                placeholder='What did you ship, learn, or debug?'
              />
            )}
            {/* Keep hidden input so notes still submit when collapsed */}
            {!notesOpen && <input type='hidden' name='notes' value={notes} />}
          </div>

          {/* Save */}
          <SubmitButton disabled={!canSubmit} />
        </div>
      </div>
    </form>
  );
};

export { NewSessionForm };
