"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { ThemeId } from "@/lib/themes";

const THEME_STORAGE_KEY = "weekline:theme";
const MOTION_BG_STORAGE_KEY = "weekline:motion-bg";
const DEFAULT_THEME: ThemeId = "slate";

export type MotionBackground =
  | "none"
  | "soft"
  | "aurora"
  | "dusk"
  | "ocean"
  | "nebula";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  motionBackground: MotionBackground;
  setMotionBackground: (m: MotionBackground) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Static defaults so SSR & first client render match
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [motionBackground, setMotionBackgroundState] =
    useState<MotionBackground>("none");

  // After mount, hydrate from localStorage (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedTheme = window.localStorage.getItem(
        THEME_STORAGE_KEY
      ) as ThemeId | null;

      if (storedTheme) {
        setThemeState(storedTheme);
      }

      const storedMotion = window.localStorage.getItem(
        MOTION_BG_STORAGE_KEY
      ) as MotionBackground | null;

      if (
        storedMotion === "none" ||
        storedMotion === "soft" ||
        storedMotion === "aurora" ||
        storedMotion === "dusk" ||
        storedMotion === "ocean" ||
        storedMotion === "nebula"
      ) {
        setMotionBackgroundState(storedMotion);
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  // Reflect theme + motion background to <html> dataset + persist
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    root.dataset.theme = theme;
    root.dataset.motionBg = motionBackground;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      window.localStorage.setItem(MOTION_BG_STORAGE_KEY, motionBackground);
    } catch {
      // ignore
    }
  }, [theme, motionBackground]);

  const setTheme = (t: ThemeId) => setThemeState(t);
  const setMotionBackground = (m: MotionBackground) =>
    setMotionBackgroundState(m);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, motionBackground, setMotionBackground }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
