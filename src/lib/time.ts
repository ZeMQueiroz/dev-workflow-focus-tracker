// src/lib/time.ts

export const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
};

/**
 * Get the start/end of a week, Monday → next Monday.
 *
 * offset = 0  → this week
 * offset = -1 → last week
 * offset = -2 → two weeks ago
 */
export const getWeekRange = (offset = 0) => {
  const now = new Date();

  // Start from "today", but normalize to midnight
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  // JS getDay(): 0 = Sun, 1 = Mon, ... 6 = Sat
  // We want Monday as the first day, so:
  const jsDay = base.getDay();
  const diffToMonday = (jsDay + 6) % 7; // Mon=0, Tue=1, ... Sun=6

  const start = new Date(base);
  start.setDate(start.getDate() - diffToMonday + offset * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
};

/**
 * Format a duration in ms as "1h 23m" or "12m".
 * Good enough for focus stats.
 */
export const formatDuration = (ms: number) => {
  if (ms <= 0) return "0m";

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes}m`;
};
