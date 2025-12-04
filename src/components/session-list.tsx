"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/time";
import { deleteSession, updateSession } from "@/app/actions/session-actions";
import { getProjectColorDotClass } from "@/lib/project-colors";
import { ChevronDown } from "lucide-react";

type SessionItem = {
  id: number;
  projectName: string;
  projectColor: string | null;
  intention: string;
  durationMs: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  notes?: string | null;
};

type SessionListProps = {
  sessions: SessionItem[];
  totalMs: number;
};

const formatTimeRange = (startIso: string, endIso: string) => {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const startLabel = start.toLocaleTimeString([], opts);
  const endLabel = end.toLocaleTimeString([], opts);

  return `${startLabel} → ${endLabel}`;
};

const SessionList = ({ sessions, totalMs }: SessionListProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIntention, setEditIntention] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState<number>(25);
  const [editNotes, setEditNotes] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const startEditing = (session: SessionItem) => {
    setEditingId(session.id);
    setEditIntention(session.intention);
    const minutes = Math.max(1, Math.round(session.durationMs / 60000));
    setEditDurationMinutes(minutes);
    setEditNotes(session.notes ?? "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditIntention("");
    setEditDurationMinutes(25);
    setEditNotes("");
  };

  if (sessions.length === 0) {
    return (
      <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-muted)]">
        <p>No sessions logged yet today.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-muted)]">
      {/* Section header + collapse toggle (mobile) */}
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Timeline
        </span>
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] md:hidden"
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? "Show" : "Hide"}
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              isCollapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </button>
      </div>

      <div className="mb-3 flex items-baseline justify-between text-xs text-[var(--text-muted)]">
        <span>Total today</span>
        <span className="font-mono text-[var(--text-primary)]">
          {formatDuration(totalMs)}
        </span>
      </div>

      <ul className={`space-y-3 ${isCollapsed ? "hidden md:block" : ""}`}>
        {sessions.map((session) => {
          const isEditing = editingId === session.id;

          if (isEditing) {
            return (
              <li
                key={session.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3"
              >
                <form action={updateSession} className="space-y-2">
                  <input type="hidden" name="id" value={session.id} />

                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-2">
                      <span
                        className={getProjectColorDotClass(
                          session.projectColor
                        )}
                      />
                      <span>{session.projectName}</span>
                    </span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {formatTimeRange(session.startTime, session.endTime)}
                    </span>
                  </div>

                  <div className="mt-1">
                    <label className="mb-1 block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                      Intention
                    </label>
                    <input
                      name="intention"
                      className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                      value={editIntention}
                      onChange={(e) => setEditIntention(e.target.value)}
                    />
                  </div>

                  <div className="mt-2">
                    <label className="mb-1 block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                      Duration (minutes)
                    </label>
                    <input
                      name="durationMinutes"
                      type="number"
                      min={1}
                      className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                      value={editDurationMinutes}
                      onChange={(e) =>
                        setEditDurationMinutes(
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                    />
                  </div>

                  <div className="mt-2">
                    <label className="mb-1 block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                      Notes (optional)
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-md bg-[var(--accent-solid)] px-4 py-2 text-xs font-medium text-slate-900 hover:brightness-95"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                      >
                        Cancel
                      </button>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Editing session
                    </span>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li
              key={session.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-2">
                      <span
                        className={getProjectColorDotClass(
                          session.projectColor
                        )}
                      />
                      <span>{session.projectName}</span>
                    </span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {formatDuration(session.durationMs)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-[var(--text-muted)]">
                    {formatTimeRange(session.startTime, session.endTime)}
                  </div>
                  <div className="mt-1 text-sm text-[var(--text-primary)]">
                    {session.intention}
                  </div>
                  {session.notes && (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      {session.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => startEditing(session)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-solid)]"
                  >
                    Edit
                  </button>
                  <form action={deleteSession}>
                    <input type="hidden" name="id" value={session.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--text-muted)] hover:text-red-400"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { SessionList };
