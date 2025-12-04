"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useFormStatus } from "react-dom";
import { createSession } from "@/app/actions/session-actions";
import { formatDuration } from "@/lib/time";
import { getProjectColorDotClass } from "@/lib/project-colors";
import { useActiveSession } from "@/components/active-session-context";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Play, Pause, RotateCcw } from "lucide-react";

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

const SubmitButton = ({ disabled }: { disabled: boolean }) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="rounded-md bg-[var(--accent-solid)] px-4 py-2 text-sm font-medium text-[var(--text-on-accent)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending || disabled}
    >
      {pending ? "Saving..." : "Save session"}
    </Button>
  );
};

const NewSessionForm = ({ projects, totalTodayMs }: NewSessionFormProps) => {
  // ---- Project selection / last used ----
  const hasProjects = projects.length > 0;
  const [projectId, setProjectId] = useState<string | "new">(() => {
    if (!hasProjects) return "new";

    if (typeof window === "undefined") {
      // SSR / first render on server
      return String(projects[0].id);
    }

    const stored = window.localStorage.getItem(LAST_PROJECT_KEY);
    if (stored && projects.some((p) => String(p.id) === stored)) {
      return stored;
    }

    return String(projects[0].id);
  });

  // Persist last used project when it changes
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

  // Prefill intention from active session (mini timer) if empty
  useEffect(() => {
    if (!intention && active.intention) {
      setIntention(active.intention);
    }
  }, [active.intention, intention]);

  // Manual duration (minutes) – default 25 so it already feels Pomodoro-ish
  const [manualDuration, setManualDuration] = useState("25");

  // Session mode: manual log, free timer, or 25m Pomodoro
  const [sessionMode, setSessionMode] = useState<SessionMode>("timer");

  const disableForm = !hasProjects;
  const hasIntention = intention.trim().length > 0;

  const isPomodoro = sessionMode === "pomodoro";
  const useTimer = sessionMode === "timer" || sessionMode === "pomodoro";

  const hasElapsed = active.elapsedMs > 0;

  // Effective duration that will be sent to the server action
  let effectiveDurationMinutes: number;

  if (sessionMode === "manual") {
    effectiveDurationMinutes = manualDuration ? Number(manualDuration) || 0 : 0;
  } else if (sessionMode === "timer") {
    effectiveDurationMinutes = hasElapsed
      ? Math.max(1, Math.round(active.elapsedMs / 60000))
      : 0;
  } else {
    // Pomodoro mode: target 25m, clamp to 25 when saving
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

    // Leaving any timer mode → clear active timer + mini pill
    if (nextMode === "manual") {
      resetSession();
    }

    // Make sure manual duration is aligned with Pomodoro preset when you pick it
    if (nextMode === "pomodoro") {
      setManualDuration(String(POMODORO_MINUTES));
    }
  };

  // unified play/pause handler (start, pause, resume)
  const handlePlayPauseTimer = () => {
    if (!useTimer || disableForm) return;

    // START: only allowed if there is no active elapsed time yet
    if (!active.isRunning && active.elapsedMs === 0) {
      if (!hasIntention) return; // require focus line only when starting

      const project = projects.find((p) => String(p.id) === projectId);
      const projectName = project?.name ?? "Untitled project";

      startSession({
        projectName,
        intention: intention.trim() || "Focused work",
      });
      return;
    }

    // Existing session → toggle pause / resume
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

  // ---- Timer display (count up vs. Pomodoro count down) ----
  const rawElapsedMs = useTimer ? active.elapsedMs : 0;
  const pomodoroTargetMs = POMODORO_MINUTES * 60 * 1000;

  const displayMs =
    isPomodoro && pomodoroTargetMs > 0
      ? Math.max(0, pomodoroTargetMs - rawElapsedMs)
      : rawElapsedMs;

  return (
    <Card className="flex-1">
      <CardHeader className="border-b border-[var(--border-subtle)] pb-4">
        <CardTitle className="text-lg text-[var(--text-primary)] sm:text-xl">
          Start a focus timer
        </CardTitle>

        {/* Bold 1-2-3 steps */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)]/30 px-3 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[0.7rem] font-semibold text-[var(--text-on-accent)]">
              1
            </span>
            <span className="whitespace-nowrap font-medium text-[var(--text-primary)]">
              Pick a project
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)]/30 px-3 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[0.7rem] font-semibold text-[var(--text-on-accent)]">
              2
            </span>
            <span className="whitespace-nowrap font-medium text-[var(--text-primary)]">
              Name your focus
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)]/30 px-3 py-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[0.7rem] font-semibold text-[var(--text-on-accent)]">
              3
            </span>
            <span className="whitespace-nowrap font-medium text-[var(--text-primary)]">
              Start &amp; save
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form action={createSession} className="space-y-4">
          {/* Hidden fields so the server action gets consistent values */}
          <input type="hidden" name="projectId" value={projectId} />
          <input
            type="hidden"
            name="durationMinutes"
            value={effectiveDurationMinutes}
          />

          {/* Project */}
          <div>
            <Label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Project
            </Label>
            {hasProjects ? (
              <div suppressHydrationWarning>
                <Select
                  value={projectId}
                  onValueChange={setProjectId}
                  disabled={disableForm}
                >
                  <SelectTrigger className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)]">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--border-subtle)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)]">
                    {projects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={String(project.id)}
                        className="text-[var(--text-primary)]"
                      >
                        <span className="flex items-center gap-2">
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
              <div className="flex flex-col gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
                <p>
                  No active projects yet. Create a project first – every focus
                  session is attached to a project.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-1 bg-[var(--accent-solid)] text-[0.7rem]font-medium text-slate-900 hover:brightness-95 sm:mt-0"
                >
                  <Link href="/projects">Create project →</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Intention */}
          <div>
            <Label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              What are you focusing on?
            </Label>
            <Input
              name="intention"
              disabled={disableForm}
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
              placeholder="Example: Draft billing API tests"
            />
          </div>

          {/* Mode & duration */}
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Session mode &amp; duration
              </Label>
              <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-0.5 text-[0.7rem]">
                <button
                  type="button"
                  onClick={() => handleModeChange("timer")}
                  className={[
                    "rounded-full px-2.5 py-1",
                    sessionMode === "timer"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  Timer
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("manual")}
                  className={[
                    "rounded-full px-2.5 py-1",
                    sessionMode === "manual"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("pomodoro")}
                  className={[
                    "rounded-full px-2.5 py-1",
                    sessionMode === "pomodoro"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  Pomodoro
                </button>
              </div>
            </div>

            {sessionMode === "manual" ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  min={0}
                  disabled={disableForm}
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                  placeholder="25"
                />
                <p className="text-[0.7rem] text-[var(--text-muted)]">
                  Minutes of focused work. Useful when you&apos;re logging
                  something after the fact.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border-2 border-[var(--accent-soft)] bg-[var(--bg-surface-soft)] px-4 py-3">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-mono text-3xl tabular-nums text-[var(--text-primary)] sm:text-4xl">
                    {formatElapsed(displayMs)}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Play / pause icon */}
                    <Button
                      type="button"
                      size="icon"
                      disabled={
                        disableForm ||
                        !useTimer ||
                        (!hasIntention && active.elapsedMs === 0)
                      }
                      className="h-9 w-9 rounded-full bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handlePlayPauseTimer}
                      aria-label={
                        isRunning
                          ? "Pause timer"
                          : isPaused
                          ? "Resume timer"
                          : "Start timer"
                      }
                    >
                      {isRunning ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Reset icon */}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                      onClick={handleResetTimer}
                      disabled={disableForm || isIdle}
                      aria-label="Reset timer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isPomodoro && (
                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Pomodoro mode counts down from{" "}
                    <span className="font-mono text-[var(--text-primary)]">
                      {POMODORO_MINUTES}:00
                    </span>{" "}
                    and saves up to {POMODORO_MINUTES} minutes for this block.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Notes (optional)
            </Label>
            <Textarea
              name="notes"
              disabled={disableForm}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 w-full resize-none border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
              placeholder="What did you actually ship, learn, or debug?"
            />
          </div>

          {/* Footer: save + small summary */}
          <div className="mt-2 flex items-center justify-between">
            <SubmitButton disabled={!canSubmit} />

            <div className="text-right text-xs text-[var(--text-muted)]">
              <div className="text-[0.7rem] uppercase tracking-wide">
                Will log
              </div>
              <div className="mt-0.5 font-mono text-sm text-[var(--text-primary)]">
                {effectiveDurationMinutes} min
              </div>
              <div className="mt-2 text-[0.65rem]">
                Today so far:{" "}
                <span className="font-mono text-[var(--text-primary)]">
                  {formatDuration(totalTodayMs)}
                </span>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { NewSessionForm };
