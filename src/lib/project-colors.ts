// src/lib/project-colors.ts

// Tailwind utility classes for small color dots
const DOT_BASE = "h-2.5 w-2.5 rounded-full";

const PROJECT_COLOR_DOT_CLASSES: Record<string, string> = {
  slate: `${DOT_BASE} bg-slate-400`,
  blue: `${DOT_BASE} bg-blue-400`,
  green: `${DOT_BASE} bg-emerald-400`,
  purple: `${DOT_BASE} bg-purple-400`,
  amber: `${DOT_BASE} bg-amber-400`,
  rose: `${DOT_BASE} bg-rose-400`,
};

export type ProjectColorKey =
  | "slate"
  | "blue"
  | "green"
  | "purple"
  | "amber"
  | "rose";

export const PROJECT_COLOR_KEYS: ProjectColorKey[] = [
  "slate",
  "blue",
  "green",
  "purple",
  "amber",
  "rose",
];

export const PROJECT_COLOR_LABELS: Record<ProjectColorKey, string> = {
  slate: "Neutral",
  blue: "Blue",
  green: "Green",
  purple: "Purple",
  amber: "Amber",
  rose: "Rose",
};

export const getProjectColorDotClass = (
  color: string | null | undefined
): string => {
  const key = color && PROJECT_COLOR_DOT_CLASSES[color]
    ? color
    : "slate";
  return PROJECT_COLOR_DOT_CLASSES[key];
};
