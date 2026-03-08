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
  Label,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";

type DayChartPoint = {
  key: string;
  label: string;
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
    <div className='grid gap-4 md:grid-cols-2'>
      {/* Time per day */}
      <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5'>
        <div className='mb-4 flex items-center gap-2'>
          <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)]'>
            <TrendingUp className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
          </div>
          <div>
            <h3 className='text-xs font-semibold text-[var(--text-primary)]'>
              Time per day
            </h3>
            <p className='text-[0.65rem] text-[var(--text-muted)]'>
              Focus minutes distributed across each day.
            </p>
          </div>
        </div>

        <ChartContainer config={dayChartConfig}>
          <div className='h-44 w-full sm:h-52'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={perDay}>
                <defs>
                  <linearGradient id='barGradient' x1='0' y1='0' x2='0' y2='1'>
                    <stop
                      offset='0%'
                      stopColor='var(--accent-solid)'
                      stopOpacity={1}
                    />
                    <stop
                      offset='100%'
                      stopColor='var(--accent-solid)'
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke='rgba(148,163,184,0.12)'
                  strokeDasharray='3 3'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
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
                  dataKey='totalMinutes'
                  fill='url(#barGradient)'
                  radius={[6, 6, 0, 0]}
                  background={{
                    fill: "var(--bg-surface-hover)",
                    radius: 6,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>

      {/* Time by project */}
      <div className='rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5'>
        <div className='mb-4 flex items-center gap-2'>
          <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)]'>
            <PieChartIcon className='h-3.5 w-3.5 text-[var(--accent-solid)]' />
          </div>
          <div>
            <h3 className='text-xs font-semibold text-[var(--text-primary)]'>
              Time by project
            </h3>
            <p className='text-[0.65rem] text-[var(--text-muted)]'>
              How your focus is split across projects.
            </p>
          </div>
        </div>

        <ChartContainer
          config={{
            minutes: { label: "Minutes", color: "var(--chart-1)" },
          }}
        >
          <div className='flex flex-col items-center gap-4 sm:flex-row sm:items-center'>
            <div className='h-40 w-40 shrink-0 sm:h-44 sm:w-44'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatMinutesLabel(value as number)
                        }
                      />
                    }
                  />
                  <Pie
                    data={perProject}
                    dataKey='totalMinutes'
                    nameKey='name'
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke='var(--bg-surface)'
                    strokeWidth={2}
                  >
                    {perProject.map((_, index) => (
                      <Cell
                        key={index}
                        fill={projectPalette[index % projectPalette.length]}
                      />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const total = perProject.reduce(
                            (sum, p) => sum + p.totalMinutes,
                            0,
                          );
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor='middle'
                              dominantBaseline='middle'
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 6}
                                className='fill-[var(--text-primary)] text-lg font-bold font-mono'
                              >
                                {formatMinutesLabel(total)}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 12}
                                className='fill-[var(--text-muted)] text-[0.6rem] font-medium uppercase tracking-wider'
                              >
                                Total
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className='flex w-full flex-1 flex-col gap-1.5'>
              {perProject
                .slice()
                .sort((a, b) => b.totalMinutes - a.totalMinutes)
                .map((p, index) => (
                  <div
                    key={p.name}
                    className='flex items-center justify-between gap-2 text-xs'
                  >
                    <div className='flex min-w-0 items-center gap-2'>
                      <span
                        className='h-2 w-2 shrink-0 rounded-full'
                        style={{
                          background:
                            projectPalette[index % projectPalette.length],
                        }}
                      />
                      <span className='truncate text-[var(--text-primary)]'>
                        {p.name}
                      </span>
                    </div>
                    <span className='shrink-0 font-mono text-[var(--text-muted)]'>
                      {formatMinutesLabel(p.totalMinutes)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
};

export default SummaryCharts;
