"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Pause, X, ChevronDown, Timer as TimerIcon } from "lucide-react";
import { useActiveSession } from "@/components/active-session-context";

const formatElapsed = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const MiniTimer = () => {
  const { state, pauseSession, resumeSession } = useActiveSession();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const hasSession = state.isRunning || state.elapsedMs > 0;
  if (!hasSession) return null;

  // When dismissed, show a small re-open button instead of the full pill
  if (dismissed) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-end px-3 sm:right-4 sm:left-auto">
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 text-[var(--text-primary)] shadow-md backdrop-blur hover:bg-[var(--bg-surface-soft)]"
          onClick={() => setDismissed(false)}
          aria-label="Show mini timer"
        >
          <TimerIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const handleTogglePlay = () => {
    if (state.isRunning) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  const handleClose = () => {
    setDismissed(true);
    setCollapsed(false);
  };

  const label = state.intention || "Active focus";
  const projectLabel = state.projectName || "";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:inset-auto sm:right-4 sm:bottom-4 sm:left-auto">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-3 py-2 text-xs text-[var(--text-primary)] shadow-lg backdrop-blur">
        {/* Left: main info + collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-2"
        >
          <div className="flex h-7 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[0.7rem] tabular-nums">
            {formatElapsed(state.elapsedMs)}
          </div>

          <div className="hidden max-w-[180px] flex-col text-left sm:flex">
            <span className="truncate text-[0.7rem] font-medium">{label}</span>
            {projectLabel && (
              <span className="truncate text-[0.65rem] text-[var(--text-muted)]">
                {projectLabel}
              </span>
            )}
          </div>

          <ChevronDown
            className={`ml-1 h-3 w-3 text-[var(--text-muted)] transition-transform ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </button>

        {/* Right: controls (hidden when collapsed) */}
        {!collapsed && (
          <div className="ml-1 flex items-center gap-1">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-95"
              aria-label={
                state.isRunning ? "Pause focus timer" : "Resume focus timer"
              }
            >
              {state.isRunning ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>

            <Link
              href="/"
              className="hidden rounded-full bg-[var(--bg-surface-soft)] px-2 py-1 text-[0.65rem] text-[var(--text-muted)] hover:text-[var(--text-primary)] sm:inline"
            >
              Open Today
            </Link>

            <button
              type="button"
              onClick={handleClose}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]"
              aria-label="Hide mini timer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export { MiniTimer };
