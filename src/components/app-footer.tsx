"use client";

// import Link from "next/link";

const AppFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 text-[0.7rem] text-[var(--text-muted)] md:flex-row md:items-center md:justify-between">
        {/* Left: brand + copyright */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-[var(--text-primary)]">
            Weekline<span className="align-[0.1em] text-[0.6rem]">™</span>
          </span>
          <span>by Quiet Stack Labs</span>
          <span>·</span>
          <span>© {year} Quiet Stack Labs. All rights reserved.</span>
        </div>

        {/* Right: beta + legal placeholders */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem]">
            Private beta · v0.1
          </span>

          {/* Optional: wire these up when you create the pages */}
          <div className="flex gap-3">
            <span className="text-[var(--text-muted)]">
              Terms (coming soon)
            </span>
            <span className="text-[var(--text-muted)]">
              Privacy (coming soon)
            </span>
            {/* Once you have real pages:
            <Link
              href="/legal/terms"
              className="hover:text-[var(--text-primary)]"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="hover:text-[var(--text-primary)]"
            >
              Privacy
            </Link>
            */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export { AppFooter };
