"use client";

import * as React from "react";
import type { TooltipProps } from "recharts";
import { Tooltip as RechartsTooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

export const useChart = () => {
  const ctx = React.useContext(ChartContext);
  if (!ctx) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return ctx;
};

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
};

export const ChartContainer = ({
  config,
  className,
  children,
  ...props
}: ChartContainerProps) => {
  // Map config keys → CSS variables like --color-time, --color-foo
  const style = React.useMemo<React.CSSProperties>(() => {
    const s: React.CSSProperties = {};
    for (const [key, value] of Object.entries(config)) {
      if (value?.color) {
        (s as any)[`--color-${key}`] = value.color;
      }
    }
    return s;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "flex aspect-video flex-col justify-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-4",
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  );
};

/* ------------------------------------------------------------------ */
/* Tooltip                                                            */
/* ------------------------------------------------------------------ */

type ChartTooltipItem = {
  color?: string;
  name?: React.ReactNode;
  value?: number;
};

export type ChartTooltipContentProps = {
  /** Whether the tooltip is visible (from Recharts). */
  active?: boolean;
  /** Label for the current point (from Recharts). */
  label?: string | number | React.ReactNode;
  /** Series payload entries (from Recharts). */
  payload?: ChartTooltipItem[];

  /** Custom value formatter. Return any ReactNode. */
  formatter?: (value: number, name?: string) => React.ReactNode;

  /** Optional indicator style (kept for API compatibility). */
  indicator?: "dot" | "line" | "none";

  /** Optional label formatter for the tooltip header. */
  labelFormatter?: (
    label: string | number | React.ReactNode
  ) => React.ReactNode;
};

export const ChartTooltipContent = ({
  active,
  label,
  payload,
  formatter,
  indicator = "dot",
  labelFormatter,
}: ChartTooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const header = labelFormatter ? labelFormatter(label ?? "") : label;

  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-2 text-xs text-[var(--text-primary)] shadow-sm">
      {header && (
        <div className="mb-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
          {header}
        </div>
      )}

      <div className="space-y-1">
        {payload.map((item, index) => {
          const color = item.color ?? "var(--accent-solid)";
          const name = String(item.name ?? "");
          const rawValue = (item.value ?? 0) as number;
          const rendered = formatter ? formatter(rawValue, name) : rawValue;

          return (
            <div
              key={index}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-1">
                {indicator !== "none" && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-[var(--text-muted)]">{name}</span>
              </span>
              <span className="font-mono">{rendered}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type ChartTooltipProps = Omit<
  TooltipProps<number, string>,
  "content"
> & {
  content?: React.ReactElement<ChartTooltipContentProps>;
};

export const ChartTooltip = ({ content, ...props }: ChartTooltipProps) => {
  return (
    <RechartsTooltip
      {...props}
      wrapperStyle={{ outline: "none" }}
      content={content ?? <ChartTooltipContent />}
    />
  );
};
