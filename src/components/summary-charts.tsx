"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type DayChartPoint = {
  key: string;
  label: string; // e.g. "Mon"
  totalMinutes: number;
};

type ProjectChartPoint = {
  name: string;
  totalMinutes: number;
};

type SummaryChartsProps = {
  perDay: DayChartPoint[];
  perProject: ProjectChartPoint[];
};

const formatMinutesLabel = (value: number) => {
  if (!value || value <= 0) return "0m";
  if (value < 60) return `${value}m`;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const dayChartConfig: ChartConfig = {
  time: {
    label: "Minutes focused",
    color: "var(--chart-1)",
  },
};

const projectPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const SummaryCharts = ({ perDay, perProject }: SummaryChartsProps) => {
  if (perDay.length === 0 && perProject.length === 0) return null;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {/* Time per day */}
      <ChartContainer config={dayChartConfig}>
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Time per day
            </h3>
            <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
              Minutes of focused work for each day in this week.
            </p>
          </div>
        </div>

        <div className="h-44 w-full pt-2 sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perDay}>
              <CartesianGrid
                stroke="rgba(148,163,184,0.18)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={(v) => `${v}m`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Day: ${String(value ?? "")}`}
                    formatter={(value) => `${value as number} min`}
                  />
                }
              />
              <Bar
                dataKey="totalMinutes"
                fill="var(--accent-solid)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>

      {/* Time by project */}
      <ChartContainer
        config={{
          minutes: {
            label: "Minutes",
            color: "var(--chart-1)",
          },
        }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Time by project
            </h3>
            <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
              How your focus time is split across projects.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:items-center">
          <div className="h-40 w-40 sm:h-44 sm:w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatMinutesLabel(value as number)}
                    />
                  }
                />
                <Pie
                  data={perProject}
                  dataKey="totalMinutes"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {perProject.map((_, index) => (
                    <Cell
                      key={index}
                      fill={projectPalette[index % projectPalette.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex w-full flex-1 flex-col gap-1 text-xs text-[var(--text-muted)]">
            {perProject
              .slice()
              .sort((a, b) => b.totalMinutes - a.totalMinutes)
              .map((p, index) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background:
                          projectPalette[index % projectPalette.length],
                      }}
                    />
                    <span className="truncate text-[var(--text-primary)]">
                      {p.name}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono">
                    {formatMinutesLabel(p.totalMinutes)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </ChartContainer>
    </div>
  );
};

export default SummaryCharts;
