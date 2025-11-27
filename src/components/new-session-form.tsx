"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useFormStatus } from "react-dom";
import { createSession } from "@/app/actions/session-actions";
import { formatDuration } from "@/lib/time";
import { getProjectColorDotClass } from "@/lib/project-colors";

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

type ProjectSummary = {
  id: number;
  name: string;
  color: string | null;
};

type NewSessionFormProps = {
  projects: ProjectSummary[];
  totalTodayMs: number;
};

const SubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="rounded-md bg-[var(--accent-solid)] px-4 py-2 text-sm font-medium text-[var(--text-on-accent)] hover:brightness-95 disabled:opacity-50"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save session"}
    </Button>
  );
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

  const [intention, setIntention] = useState("");
  const [notes, setNotes] = useState("");

  // Manual duration (minutes)
  const [manualDuration, setManualDuration] = useState("25");

  // Timer state — DEFAULT: timer mode ON
  const [useTimer, setUseTimer] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);

  // Timer tick effect
  useEffect(() => {
    if (!isRunning || startTimestamp == null) return;

    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimestamp);
    }, 1000);

    return () => window.clearInterval(id);
  }, [isRunning, startTimestamp]);

  const handleModeChange = (nextMode: "timer" | "manual") => {
    const nextUseTimer = nextMode === "timer";
    setUseTimer(nextUseTimer);

    if (!nextUseTimer) {
      // leaving timer mode → reset timer state
      setIsRunning(false);
      setElapsedMs(0);
      setStartTimestamp(null);
    }
  };

  const handleStartTimer = () => {
    if (!hasProjects) return;
    setStartTimestamp(Date.now());
    setElapsedMs(0);
    setIsRunning(true);
  };

  const handleStopTimer = () => {
    setIsRunning(false);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setElapsedMs(0);
    setStartTimestamp(null);
  };

  const effectiveDurationMinutes = useTimer
    ? Math.max(0, Math.round(elapsedMs / 60000))
    : manualDuration
    ? Number(manualDuration) || 0
    : 0;

  const disableForm = !hasProjects;

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
              Start timer &amp; save
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
                  className="mt-1 bg-[var(--accent-solid)] text-[0.7rem] font-medium text-slate-900 hover:brightness-95 sm:mt-0"
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

          {/* Duration: manual vs timer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Session duration
              </Label>
              <div className="flex items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={useTimer ? "ghost" : "secondary"}
                    className={[
                      "rounded-xl px-2 py-1 text-[0.7rem]",
                      !useTimer
                        ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                    onClick={() => handleModeChange("manual")}
                  >
                    Manual
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={useTimer ? "secondary" : "ghost"}
                    className={[
                      "rounded-xl px-2 py-1 text-[0.7rem]",
                      useTimer
                        ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                    onClick={() => handleModeChange("timer")}
                  >
                    Timer
                  </Button>
                </div>
              </div>
            </div>

            {!useTimer ? (
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
                  Minutes of focused work. Switch back to timer mode anytime.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border-2 border-[var(--accent-soft)] bg-[var(--bg-surface-soft)] px-4 py-3">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-mono text-3xl tabular-nums text-[var(--text-primary)] sm:text-4xl">
                    {formatElapsed(elapsedMs)}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isRunning ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={disableForm}
                        className="h-9 px-4 text-xs font-medium bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-95"
                        onClick={handleStartTimer}
                      >
                        Start timer
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 px-4 text-xs font-medium bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-95"
                        onClick={handleStopTimer}
                      >
                        Pause
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 px-3 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                      onClick={handleResetTimer}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                <p className="text-[0.7rem] text-[var(--text-muted)]">
                  When you save, this session will use{" "}
                  <span className="font-mono text-[var(--text-primary)]">
                    {effectiveDurationMinutes} min
                  </span>{" "}
                  as its duration.
                </p>
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
            <SubmitButton />

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
