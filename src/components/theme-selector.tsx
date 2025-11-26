"use client";

import { useEffect, useState } from "react";
import { themes, type ThemeId } from "@/lib/themes";
import { useTheme } from "./theme-provider";

// Swatch gradients for the preview strip
const themeSwatches: Record<ThemeId, { from: string; to: string }> = {
  slate: { from: "#e5e7eb", to: "#64748b" },
  light: { from: "#f3f4f6", to: "#9ca3af" },
  sky: { from: "#0ea5e9", to: "#38bdf8" },
  sand: { from: "#fbbf24", to: "#f59e0b" },
  nord: { from: "#88c0d0", to: "#4c566a" },
  monokai: { from: "#f97316", to: "#a855f7" },
  solarized: { from: "#f59e0b", to: "#0ea5e9" },
  forest: { from: "#22c55e", to: "#166534" },
  rose: { from: "#e11d48", to: "#a855f7" },

  custom: { from: "#4f46e5", to: "#ec4899" },
};

type CustomThemeColors = {
  accentSolid: string;
  bgApp: string;
  bgSurface: string;
  textPrimary: string;
};

type CustomBaseVariant = "dark" | "light";

const CUSTOM_DARK_DEFAULTS: CustomThemeColors = {
  accentSolid: "#4f46e5",
  bgApp: "#020617",
  bgSurface: "#020617",
  textPrimary: "#e5e7eb",
};

const CUSTOM_LIGHT_DEFAULTS: CustomThemeColors = {
  accentSolid: "#2563eb",
  bgApp: "#f3f4f6",
  bgSurface: "#ffffff",
  textPrimary: "#111827",
};

const CUSTOM_THEME_STORAGE_KEY = "dwft.custom-theme.v1";

/**
 * Small helper to choose black or white text on top of a given hex color.
 */
function getTextOnAccent(hex: string): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#0b1120";

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? "#020617" : "#f9fafb";
}

/**
 * Turn a hex color into an rgba() string with the given alpha.
 * If parsing fails, returns a subtle transparent white.
 */
function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type StoredCustomPayload =
  | {
      colors?: CustomThemeColors;
      baseVariant?: CustomBaseVariant;
    }
  | CustomThemeColors;

/**
 * Hook that:
 * - loads/saves custom theme colors from localStorage
 * - tracks a "base preset" (dark / light) for quick switching
 * - applies them as CSS variables when the active theme is "custom"
 * - clears overrides when switching away from "custom"
 */
function useCustomThemeColors(activeTheme: ThemeId) {
  const [colors, setColors] = useState<CustomThemeColors>(CUSTOM_DARK_DEFAULTS);
  const [baseVariant, setBaseVariant] = useState<CustomBaseVariant>("dark");

  //
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
      if (!raw) return;
      const parsed: StoredCustomPayload = JSON.parse(raw);

      if (parsed && typeof parsed === "object" && "colors" in parsed) {
        if (parsed.colors) {
          setColors((prev) => ({
            ...prev,
            ...parsed.colors,
          }));
        }
        if (parsed.baseVariant === "dark" || parsed.baseVariant === "light") {
          setBaseVariant(parsed.baseVariant);
        }
      } else if (parsed && typeof parsed === "object") {
        setColors((prev) => ({
          ...prev,
          ...(parsed as CustomThemeColors),
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    if (activeTheme !== "custom") {
      [
        "--accent-solid",
        "--accent-soft",
        "--bg-app",
        "--bg-surface",
        "--bg-surface-soft",
        "--text-primary",
        "--text-on-accent",
      ].forEach((v) => root.style.removeProperty(v));
      return;
    }

    // Save to localStorage (new format)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          CUSTOM_THEME_STORAGE_KEY,
          JSON.stringify({
            colors,
            baseVariant,
          })
        );
      }
    } catch {
      // ignore
    }

    // Apply overrides for the custom theme
    root.style.setProperty("--accent-solid", colors.accentSolid);
    root.style.setProperty(
      "--accent-soft",
      hexToRgba(colors.accentSolid, 0.16)
    );

    root.style.setProperty("--bg-app", colors.bgApp);
    root.style.setProperty("--bg-surface", colors.bgSurface);
    root.style.setProperty("--bg-surface-soft", colors.bgSurface);

    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty(
      "--text-on-accent",
      getTextOnAccent(colors.accentSolid)
    );
  }, [activeTheme, colors, baseVariant]);

  return [colors, setColors, baseVariant, setBaseVariant] as const;
}

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const [customColors, setCustomColors, customBase, setCustomBase] =
    useCustomThemeColors(theme as ThemeId);

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    setCustomColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyBasePreset = (variant: CustomBaseVariant) => {
    setCustomBase(variant);
    setCustomColors(
      variant === "light" ? CUSTOM_LIGHT_DEFAULTS : CUSTOM_DARK_DEFAULTS
    );
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Theme tiles */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {themes.map((t) => {
          const isActive = t.id === theme;
          const swatch =
            t.id === "custom"
              ? {
                  from: customColors.accentSolid,
                  to: hexToRgba(customColors.accentSolid, 0.4),
                }
              : themeSwatches[t.id];

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={[
                "relative flex flex-col items-start rounded-xl border px-3 py-2 text-left text-xs transition",
                isActive
                  ? "border-[var(--accent-solid)] bg-[var(--bg-surface)] shadow-sm"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]",
              ].join(" ")}
            >
              {/* Pro badge – top-right overlay for custom theme */}
              {t.id === "custom" && (
                <span className="pointer-events-none absolute -right-2 -top-2 flex items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-[2px] text-[0.6rem] font-semibold uppercase tracking-wide text-yellow-700 shadow-sm">
                  Pro
                </span>
              )}

              {/* Theme preview strip */}
              <div
                className="mb-2 h-7 w-full rounded-md"
                style={{
                  background: `linear-gradient(90deg, ${swatch.from}, ${swatch.to})`,
                }}
              />

              <div className="flex w-full items-center justify-between gap-2">
                <span className="truncate text-[0.75rem] text-[var(--text-primary)]">
                  {t.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom theme editor – only visible when "custom" is active */}
      {theme === "custom" && (
        <div className="max-w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[0.8rem] font-semibold text-[var(--text-primary)]">
                Custom theme colors
              </h3>
              <p className="mt-0.5 text-[0.7rem] text-[var(--text-muted)]">
                Tweak the core colors. Changes are stored on this device and
                applied whenever you pick the custom theme.
              </p>
            </div>

            {/* Base preset toggle (Dark / Light) */}
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                Base preset
              </span>
              <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => applyBasePreset("dark")}
                  className={[
                    "rounded-full px-2.5 py-1 text-[0.7rem]",
                    customBase === "dark"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]",
                  ].join(" ")}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => applyBasePreset("light")}
                  className={[
                    "rounded-full px-2.5 py-1 text-[0.7rem]",
                    customBase === "light"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]",
                  ].join(" ")}
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* Color inputs */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Accent */}
            <div className="min-w-0 space-y-1">
              <label className="block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-7 w-10 cursor-pointer rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  value={customColors.accentSolid}
                  onChange={(e) =>
                    handleColorChange("accentSolid", e.target.value)
                  }
                />
                <input
                  type="text"
                  className="h-7 flex-1 min-w-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 font-mono text-[0.7rem] text-[var(--text-primary)]"
                  value={customColors.accentSolid}
                  onChange={(e) =>
                    handleColorChange("accentSolid", e.target.value)
                  }
                  spellCheck={false}
                />
              </div>
            </div>

            {/* App background */}
            <div className="min-w-0 space-y-1">
              <label className="block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                App background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-7 w-10 cursor-pointer rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  value={customColors.bgApp}
                  onChange={(e) => handleColorChange("bgApp", e.target.value)}
                />
                <input
                  type="text"
                  className="h-7 flex-1 min-w-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 font-mono text-[0.7rem] text-[var(--text-primary)]"
                  value={customColors.bgApp}
                  onChange={(e) => handleColorChange("bgApp", e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Card / surface */}
            <div className="min-w-0 space-y-1">
              <label className="block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                Card background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-7 w-10 cursor-pointer rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  value={customColors.bgSurface}
                  onChange={(e) =>
                    handleColorChange("bgSurface", e.target.value)
                  }
                />
                <input
                  type="text"
                  className="h-7 flex-1 min-w-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 font-mono text-[0.7rem] text-[var(--text-primary)]"
                  value={customColors.bgSurface}
                  onChange={(e) =>
                    handleColorChange("bgSurface", e.target.value)
                  }
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Primary text */}
            <div className="min-w-0 space-y-1">
              <label className="block text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
                Primary text
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-7 w-10 cursor-pointer rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  value={customColors.textPrimary}
                  onChange={(e) =>
                    handleColorChange("textPrimary", e.target.value)
                  }
                />
                <input
                  type="text"
                  className="h-7 flex-1 min-w-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 font-mono text-[0.7rem] text-[var(--text-primary)]"
                  value={customColors.textPrimary}
                  onChange={(e) =>
                    handleColorChange("textPrimary", e.target.value)
                  }
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setCustomColors(
                customBase === "light"
                  ? CUSTOM_LIGHT_DEFAULTS
                  : CUSTOM_DARK_DEFAULTS
              )
            }
            className="mt-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            Reset custom colors to {customBase === "light" ? "light" : "dark"}{" "}
            preset
          </button>
        </div>
      )}
    </div>
  );
};

export { ThemeSelector };
