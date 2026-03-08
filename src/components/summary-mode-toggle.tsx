"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SummaryMode = "self" | "manager" | "client";

type SummaryModeToggleProps = {
  currentMode: SummaryMode;
};

const SummaryModeToggle = ({ currentMode }: SummaryModeToggleProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setMode = (mode: SummaryMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (mode === "self") {
      params.delete("mode");
    } else {
      params.set("mode", mode);
    }

    if (mode === "client") {
      params.delete("view");
    }

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url, { scroll: false });
  };

  const options: { mode: SummaryMode; label: string }[] = [
    { mode: "self", label: "Self" },
    { mode: "manager", label: "Manager" },
    { mode: "client", label: "Client" },
  ];

  return (
    <div className='flex items-center gap-2.5'>
      <span className='hidden text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)] sm:block'>
        Tone
      </span>
      <div className='inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-0.5'>
        {options.map(({ mode, label }) => (
          <button
            key={mode}
            type='button'
            aria-pressed={currentMode === mode}
            onClick={() => setMode(mode)}
            className={[
              "rounded-md px-3 py-1.5 text-[0.7rem] font-medium transition-colors",
              currentMode === mode
                ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export { SummaryModeToggle };
