"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";

const HowItWorks = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]'>
      <button
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className='flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left'
        aria-expanded={open}
      >
        <span className='flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-wider text-[var(--text-muted)]'>
          <Lightbulb className='h-3 w-3' />
          How it works
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className='border-t border-[var(--border-subtle)] px-4 py-3'>
          <ol className='space-y-1.5 text-[0.75rem] leading-relaxed text-[var(--text-muted)]'>
            <li className='flex items-baseline gap-2'>
              <span className='flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.55rem] font-bold text-[var(--accent-solid)]'>
                1
              </span>
              <span>
                <strong className='text-[var(--text-primary)]'>
                  Pick a project
                </strong>{" "}
                — select what you&apos;re working on.
              </span>
            </li>
            <li className='flex items-baseline gap-2'>
              <span className='flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.55rem] font-bold text-[var(--accent-solid)]'>
                2
              </span>
              <span>
                <strong className='text-[var(--text-primary)]'>
                  Name your focus
                </strong>{" "}
                — describe the task in a few words.
              </span>
            </li>
            <li className='flex items-baseline gap-2'>
              <span className='flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.55rem] font-bold text-[var(--accent-solid)]'>
                3
              </span>
              <span>
                <strong className='text-[var(--text-primary)]'>
                  Start &amp; save
                </strong>{" "}
                — hit play, focus, then save your session.
              </span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export { HowItWorks };
