"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/time";
import { SessionList } from "@/components/session-list";
import { Timer, ListChecks, FolderKanban, ChevronDown } from "lucide-react";

type SessionItem = {
  id: number;
  projectName: string;
  projectColor: string | null;
  intention: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  notes?: string | null;
};

type TodayLogsPanelProps = {
  sessions: SessionItem[];
  totalMs: number;
  sessionsCount: number;
  primaryProjectName: string;
};

const TodayLogsPanel = ({
  sessions,
  totalMs,
  sessionsCount,
  primaryProjectName,
}: TodayLogsPanelProps) => {
  const [open, setOpen] = useState(true);
  const hasData = sessionsCount > 0;

  return (
    <div className='flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden lg:h-full'>
      {/* Toggle header */}
      <button
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className='flex w-full items-center justify-between gap-2 px-4 py-3 text-left'
        aria-expanded={open}
      >
        <div className='flex items-center gap-3'>
          <span className='text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]'>
            Today&apos;s log
          </span>
          <span className='rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.7rem] tabular-nums text-[var(--text-muted)]'>
            {sessionsCount} session{sessionsCount === 1 ? "" : "s"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className='flex-1 border-t border-[var(--border-subtle)] p-4 overflow-y-auto'>
          {hasData ? (
            <>
              {/* Compact inline stats row */}
              <div className='mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.75rem] text-[var(--text-muted)]'>
                <div className='flex items-center gap-2'>
                  <Timer className='h-3.5 w-3.5' />
                  <span>Total</span>
                  <span className='font-mono font-medium text-[var(--text-primary)]'>
                    {formatDuration(totalMs)}
                  </span>
                </div>
                <span className='text-[var(--border-strong)]'>·</span>
                <div className='flex items-center gap-2'>
                  <ListChecks className='h-3.5 w-3.5' />
                  <span>Sessions</span>
                  <span className='font-mono font-medium text-[var(--text-primary)]'>
                    {sessionsCount}
                  </span>
                </div>
                <span className='text-[var(--border-strong)]'>·</span>
                <div className='flex items-center gap-2'>
                  <FolderKanban className='h-3.5 w-3.5' />
                  <span>Top project</span>
                  <span className='truncate font-medium text-[var(--text-primary)]'>
                    {primaryProjectName}
                  </span>
                </div>
              </div>

              <SessionList sessions={sessions} totalMs={totalMs} />
            </>
          ) : (
            /* Clean empty state — no stat boxes */
            <p className='py-4 text-center text-sm text-[var(--text-muted)]'>
              No sessions yet — start your first focus block above.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export { TodayLogsPanel };
