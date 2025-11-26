"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

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

    // When switching to client mode, drop "view" so the server picks
    // the client-friendly default (totals).
    if (mode === "client") {
      params.delete("view");
    }

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url);
  };

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <span className="text-[0.7rem] uppercase tracking-wide">Tone</span>
      <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-0.5">
        {/* Self review */}
        <Button
          type="button"
          size="sm"
          aria-pressed={currentMode === "self"}
          variant={currentMode === "self" ? "secondary" : "ghost"}
          className={[
            "rounded-full px-2 py-1 text-[0.7rem]",
            currentMode === "self"
              ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          ].join(" ")}
          onClick={() => setMode("self")}
        >
          Self review
        </Button>

        {/* Manager update */}
        <Button
          type="button"
          size="sm"
          aria-pressed={currentMode === "manager"}
          variant={currentMode === "manager" ? "secondary" : "ghost"}
          className={[
            "rounded-full px-2 py-1 text-[0.7rem]",
            currentMode === "manager"
              ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          ].join(" ")}
          onClick={() => setMode("manager")}
        >
          Manager update
        </Button>

        {/* Client update */}
        <Button
          type="button"
          size="sm"
          aria-pressed={currentMode === "client"}
          variant={currentMode === "client" ? "secondary" : "ghost"}
          className={[
            "rounded-full px-2 py-1 text-[0.7rem]",
            currentMode === "client"
              ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm hover:bg-[var(--accent-solid)] hover:brightness-75"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          ].join(" ")}
          onClick={() => setMode("client")}
        >
          Client update
        </Button>
      </div>
    </div>
  );
};

export { SummaryModeToggle };
