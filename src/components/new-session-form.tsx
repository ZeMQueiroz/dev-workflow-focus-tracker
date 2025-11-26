"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Clock, Keyboard, Play, Pause, RotateCcw } from "lucide-react";

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

const NewSessionForm = ({ projects, totalTodayMs }: NewSessionFormProps) => {
  const hasProjects = projects.length > 0;

  // ---- Project selection / last used ----
  const [projectId, setProjectId] = useState(
    hasProjects ? String(projects[0].id) : ""
  );

  // Load last used project from localStorage
  useEffect(() => {
    if (!hasProjects) return;
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("lastProjectId");
    if (!stored) return;

    const exists = projects.some((p) => String(p.id) === stored);
    if (exists) {
      setProjectId(stored);
    }
  }, [hasProjects, projects]);

  // Persist last used project when it changes
  useEffect(() => {
    if (!projectId) return;
    if (typeof window === "undefined") return;

    window.localStorage.setItem("lastProjectId", projectId);
  }, [projectId]);

  const [intention, setIntention] = useState("");
  const [notes, setNotes] = useState("");

  // Manual duration (minutes)
  const [manualDuration, setManualDuration] = useState("25");

  // Timer state
  const [useTimer, setUseTimer] = useState(false);
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

  // Reset timer when leaving timer mode
  useEffect(() => {
    if (!useTimer) {
      setIsRunning(false);
      setElapsedMs(0);
      setStartTimestamp(null);
    }
  }, [useTimer]);

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
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-[var(--text-primary)]">
              Log focus session
            </CardTitle>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Choose a project, set your intention, and log what you&apos;ve
              been working on. Use manual minutes or a live timer.
            </p>
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
              Intention
            </Label>
            <Input
              name="intention"
              disabled={disableForm}
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
              placeholder="Plan next sprint tasks"
            />
          </div>

          {/* Duration: manual vs timer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Duration
              </Label>
              <div className="flex items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
                <span>Mode:</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={useTimer ? "ghost" : "secondary"}
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem]",
                      !useTimer
                        ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                    onClick={() => setUseTimer(false)}
                  >
                    <Keyboard className="h-3 w-3" />
                    <span>Manual</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={useTimer ? "secondary" : "ghost"}
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem]",
                      useTimer
                        ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                    onClick={() => setUseTimer(true)}
                  >
                    <Clock className="h-3 w-3" />
                    <span>Timer</span>
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
                  Minutes of focused work. You can also switch to timer mode if
                  you prefer.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xl tabular-nums text-[var(--text-primary)]">
                    {formatElapsed(elapsedMs)}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isRunning ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={disableForm}
                        className="inline-flex items-center gap-1 bg-[var(--accent-solid)] text-xs font-medium text-slate-900 hover:brightness-95"
                        onClick={handleStartTimer}
                      >
                        <Play className="h-3 w-3" />
                        <span>Start</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="inline-flex items-center gap-1 bg-[var(--accent-solid)] text-xs font-medium text-slate-900 hover:brightness-95"
                        onClick={handleStopTimer}
                      >
                        <Pause className="h-3 w-3" />
                        <span>Pause</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                      onClick={handleResetTimer}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
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
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { NewSessionForm };
