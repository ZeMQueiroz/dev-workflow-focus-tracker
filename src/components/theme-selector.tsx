"use client";

import { useEffect, useState } from "react";
import { themes, type ThemeId } from "@/lib/themes";
import { useTheme } from "./theme-provider";
import type { MotionBackground } from "./theme-provider";
import { Check, RotateCcw, Sparkles, Palette, Layers } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Theme swatch colors for preview strips                            */
/* ------------------------------------------------------------------ */

const themeSwatches: Record<
  ThemeId,
  { accent: string; bg: string; surface: string; text: string }
> = {
  slate: {
    accent: "#e5e7eb",
    bg: "#020617",
    surface: "#020617",
    text: "#e5e7eb",
  },
  light: {
    accent: "#2563eb",
    bg: "#f3f4f6",
    surface: "#ffffff",
    text: "#111827",
  },
  sky: {
    accent: "#0ea5e9",
    bg: "#eff6ff",
    surface: "#ffffff",
    text: "#0f172a",
  },
  sand: {
    accent: "#f59e0b",
    bg: "#fffbeb",
    surface: "#ffffff",
    text: "#422006",
  },
  nord: {
    accent: "#88c0d0",
    bg: "#020713",
    surface: "#050b1f",
    text: "#e5eef5",
  },
  monokai: {
    accent: "#f97316",
    bg: "#080716",
    surface: "#100a24",
    text: "#f5f5f5",
  },
  solarized: {
    accent: "#f59e0b",
    bg: "#00141c",
    surface: "#001f27",
    text: "#fdf6e3",
  },
  forest: {
    accent: "#22c55e",
    bg: "#020712",
    surface: "#041017",
    text: "#e2fbe8",
  },
  rose: {
    accent: "#e11d48",
    bg: "#080414",
    surface: "#12061f",
    text: "#fdf2f8",
  },
  custom: {
    accent: "#4f46e5",
    bg: "#020617",
    surface: "#020617",
    text: "#e5e7eb",
  },
};

/* ------------------------------------------------------------------ */
/*  Custom theme types + hooks                                        */
/* ------------------------------------------------------------------ */

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

  return `rgba(${r}, ${g}, ${b}, alpha)`.replace("alpha", String(alpha));
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

  // Load from localStorage on mount
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
    } catch {
      // ignore
    }
  }, []);

  // Apply CSS vars + persist when active theme is "custom"
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
          }),
        );
      }
    } catch {
      // ignore
    }

    // Apply overrides for the custom theme
    root.style.setProperty("--accent-solid", colors.accentSolid);
    root.style.setProperty(
      "--accent-soft",
      hexToRgba(colors.accentSolid, 0.16),
    );

    root.style.setProperty("--bg-app", colors.bgApp);
    root.style.setProperty("--bg-surface", colors.bgSurface);
    root.style.setProperty("--bg-surface-soft", colors.bgSurface);

    root.style.setProperty("--text-primary", colors.textPrimary);
    root.style.setProperty(
      "--text-on-accent",
      getTextOnAccent(colors.accentSolid),
    );
  }, [activeTheme, colors, baseVariant]);

  return [colors, setColors, baseVariant, setBaseVariant] as const;
}

/* ------------------------------------------------------------------ */
/*  Motion background options                                         */
/* ------------------------------------------------------------------ */

const motionBackgroundOptions: {
  id: MotionBackground;
  label: string;
  description: string;
  tag: string;
  previewGradient: string;
}[] = [
  {
    id: "none",
    label: "Static",
    description: "Plain background, no motion.",
    tag: "Minimal",
    previewGradient:
      "radial-gradient(circle at 0% 0%, #6b7280 0, transparent 55%), var(--bg-app)",
  },
  {
    id: "soft",
    label: "Soft gradient",
    description: "Subtle animated gradients.",
    tag: "Calm",
    previewGradient:
      "radial-gradient(circle at 0% 0%, #22c55e 0, transparent 55%), radial-gradient(circle at 100% 100%, #0ea5e9 0, transparent 55%), var(--bg-app)",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Colorful, high-energy motion.",
    tag: "Energetic",
    previewGradient:
      "radial-gradient(circle at 10% 0%, #38bdf8 0, transparent 55%), radial-gradient(circle at 90% 100%, #a855f7 0, transparent 55%), radial-gradient(circle at 0% 100%, #f97316 0, transparent 55%), var(--bg-app)",
  },
  {
    id: "dusk",
    label: "Dusk horizon",
    description: "Warm sunset-style gradient.",
    tag: "Warm",
    previewGradient:
      "radial-gradient(circle at 0% 0%, #f472b6 0, transparent 55%), radial-gradient(circle at 100% 0%, #fbbf24 0, transparent 55%), radial-gradient(circle at 50% 100%, #fb7185 0, transparent 60%), var(--bg-app)",
  },
  {
    id: "ocean",
    label: "Deep ocean",
    description: "Cool blue–teal gentle motion.",
    tag: "Cool",
    previewGradient:
      "radial-gradient(circle at 0% 0%, #3b82f6 0, transparent 55%), radial-gradient(circle at 100% 100%, #14b8a6 0, transparent 55%), radial-gradient(circle at 0% 100%, #818cf8 0, transparent 60%), var(--bg-app)",
  },
  {
    id: "nebula",
    label: "Midnight nebula",
    description: "Purple–pink nebula glow.",
    tag: "Ambient",
    previewGradient:
      "radial-gradient(circle at 0% 0%, #9333ea 0, transparent 55%), radial-gradient(circle at 100% 0%, #ec4899 0, transparent 55%), radial-gradient(circle at 0% 100%, #22d3ee 0, transparent 60%), var(--bg-app)",
  },
];

/* ------------------------------------------------------------------ */
/*  Mini App Preview Component                                        */
/* ------------------------------------------------------------------ */

function AppearancePreview({
  themeName,
  motionLabel,
  swatch,
}: {
  themeName: string;
  motionLabel: string;
  swatch: { accent: string; bg: string; surface: string; text: string };
}) {
  return (
    <div className='overflow-hidden rounded-2xl border border-[var(--border-subtle)]'>
      {/* Header bar */}
      <div className='flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <Palette className='h-4 w-4 text-[var(--accent-solid)]' />
          <span className='text-sm font-medium text-[var(--text-primary)]'>
            Current appearance
          </span>
        </div>
        <div className='flex items-center gap-2 text-xs text-[var(--text-muted)]'>
          <span className='hidden sm:inline'>
            Theme:{" "}
            <span className='font-medium text-[var(--text-primary)]'>
              {themeName}
            </span>
          </span>
          <span className='hidden text-[var(--border-strong)] sm:inline'>
            ·
          </span>
          <span className='hidden sm:inline'>
            Motion:{" "}
            <span className='font-medium text-[var(--text-primary)]'>
              {motionLabel}
            </span>
          </span>
        </div>
      </div>

      {/* Mini app shell preview */}
      <div className='p-4 sm:p-5'>
        <div
          className='relative flex gap-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] p-3 sm:gap-4 sm:p-4'
          style={{ background: swatch.bg }}
        >
          {/* Mini sidebar */}
          <div
            className='hidden w-14 shrink-0 rounded-lg sm:block'
            style={{
              background: swatch.surface,
              border: `1px solid ${hexToRgba(swatch.text, 0.08)}`,
            }}
          >
            <div className='space-y-2 p-2'>
              <div
                className='h-2 w-full rounded'
                style={{ background: swatch.accent }}
              />
              <div
                className='h-2 w-8 rounded'
                style={{ background: hexToRgba(swatch.text, 0.15) }}
              />
              <div
                className='h-2 w-6 rounded'
                style={{ background: hexToRgba(swatch.text, 0.1) }}
              />
              <div
                className='h-2 w-9 rounded'
                style={{ background: hexToRgba(swatch.text, 0.1) }}
              />
            </div>
          </div>

          {/* Main content area */}
          <div className='flex-1 space-y-3'>
            {/* Content card */}
            <div
              className='rounded-lg p-3'
              style={{
                background: swatch.surface,
                border: `1px solid ${hexToRgba(swatch.text, 0.08)}`,
              }}
            >
              <div className='space-y-2'>
                <div
                  className='h-2.5 w-24 rounded'
                  style={{ background: swatch.text }}
                />
                <div
                  className='h-2 w-full rounded'
                  style={{ background: hexToRgba(swatch.text, 0.15) }}
                />
                <div
                  className='h-2 w-3/4 rounded'
                  style={{ background: hexToRgba(swatch.text, 0.1) }}
                />
              </div>

              {/* Accent button */}
              <div className='mt-3 flex items-center gap-2'>
                <div
                  className='h-6 w-20 rounded-md'
                  style={{
                    background: swatch.accent,
                  }}
                />
                <div
                  className='h-6 w-16 rounded-md'
                  style={{
                    background: hexToRgba(swatch.text, 0.06),
                    border: `1px solid ${hexToRgba(swatch.text, 0.1)}`,
                  }}
                />
              </div>
            </div>

            {/* Second small card */}
            <div className='flex gap-2'>
              <div
                className='h-10 flex-1 rounded-lg'
                style={{
                  background: swatch.surface,
                  border: `1px solid ${hexToRgba(swatch.text, 0.08)}`,
                }}
              />
              <div
                className='h-10 flex-1 rounded-lg'
                style={{
                  background: swatch.surface,
                  border: `1px solid ${hexToRgba(swatch.text, 0.08)}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Summary labels (mobile) */}
        <div className='mt-3 flex flex-wrap gap-2 sm:hidden'>
          <span className='inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 py-1 text-xs text-[var(--text-muted)]'>
            <span
              className='h-2 w-2 rounded-full'
              style={{ background: swatch.accent }}
            />
            {themeName}
          </span>
          <span className='inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 py-1 text-xs text-[var(--text-muted)]'>
            {motionLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color Input Field Component                                       */
/* ------------------------------------------------------------------ */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className='space-y-1.5'>
      <label className='block text-xs font-medium text-[var(--text-muted)]'>
        {label}
      </label>
      <div className='flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5'>
        <input
          type='color'
          className='h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ WebkitAppearance: "none" }}
        />
        <input
          type='text'
          className='h-7 flex-1 min-w-0 rounded border-0 bg-transparent px-1.5 font-mono text-xs text-[var(--text-primary)] outline-none'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ThemeSelector Component                                      */
/* ------------------------------------------------------------------ */

const ThemeSelector = () => {
  // Pull from our theme provider
  const {
    theme: rawTheme,
    setTheme: rawSetTheme,
    motionBackground,
    setMotionBackground,
  } = useTheme();

  // Fallback to "slate" if theme is undefined on first render
  const theme = (rawTheme ?? "slate") as ThemeId;
  const setTheme = (id: ThemeId) => rawSetTheme(id as any);

  const [customColors, setCustomColors, customBase, setCustomBase] =
    useCustomThemeColors(theme);

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    setCustomColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyBasePreset = (variant: CustomBaseVariant) => {
    setCustomBase(variant);
    setCustomColors(
      variant === "light" ? CUSTOM_LIGHT_DEFAULTS : CUSTOM_DARK_DEFAULTS,
    );
  };

  // Get current swatch data
  const currentSwatch =
    theme === "custom"
      ? {
          accent: customColors.accentSolid,
          bg: customColors.bgApp,
          surface: customColors.bgSurface,
          text: customColors.textPrimary,
        }
      : themeSwatches[theme];

  const currentTheme = themes.find((t) => t.id === theme);
  const currentMotion = motionBackgroundOptions.find(
    (m) => m.id === motionBackground,
  );

  return (
    <div className='mt-5 space-y-8'>
      {/* ============================================================ */}
      {/*  A. CURRENT APPEARANCE PREVIEW                               */}
      {/* ============================================================ */}

      <AppearancePreview
        themeName={currentTheme?.label ?? "Slate"}
        motionLabel={currentMotion?.label ?? "Static"}
        swatch={currentSwatch}
      />

      {/* ============================================================ */}
      {/*  B. COLOR THEME SELECTION                                    */}
      {/* ============================================================ */}

      <div>
        <div className='mb-4 flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-[var(--accent-solid)]' />
          <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
            Color theme
          </h3>
        </div>

        <div className='grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'>
          {themes.map((t) => {
            const isActive = t.id === theme;
            const swatch =
              t.id === "custom"
                ? {
                    accent: customColors.accentSolid,
                    bg: customColors.bgApp,
                    surface: customColors.bgSurface,
                    text: customColors.textPrimary,
                  }
                : themeSwatches[t.id];

            return (
              <button
                key={t.id}
                type='button'
                onClick={() => setTheme(t.id)}
                className={[
                  "group relative flex flex-col items-start overflow-hidden rounded-xl border text-left transition-all duration-200",
                  isActive
                    ? "border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] shadow-md shadow-[var(--accent-solid)]/10"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:shadow-sm",
                ].join(" ")}
              >
                {/* Pro badge – top-right for custom theme */}
                {t.id === "custom" && (
                  <span className='pointer-events-none absolute right-2 top-2 z-10 flex items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-[2px] text-[0.6rem] font-semibold uppercase tracking-wide text-yellow-700 shadow-sm backdrop-blur-sm'>
                    Pro
                  </span>
                )}

                {/* Active badge / checkmark */}
                {isActive && (
                  <span className='absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm'>
                    <Check className='h-3 w-3' strokeWidth={3} />
                  </span>
                )}

                {/* Multi-swatch preview area */}
                <div
                  className='relative h-16 w-full'
                  style={{ background: swatch.bg }}
                >
                  {/* Surface block */}
                  <div
                    className='absolute bottom-2 left-2 right-2 top-4 rounded-md'
                    style={{
                      background: swatch.surface,
                      border: `1px solid ${hexToRgba(swatch.text, 0.08)}`,
                    }}
                  >
                    {/* Accent bar */}
                    <div
                      className='mx-2 mt-2 h-1.5 w-10 rounded-full'
                      style={{ background: swatch.accent }}
                    />
                    {/* Text line */}
                    <div
                      className='mx-2 mt-1.5 h-1 w-14 rounded-full'
                      style={{ background: hexToRgba(swatch.text, 0.25) }}
                    />
                    <div
                      className='mx-2 mt-1 h-1 w-8 rounded-full'
                      style={{ background: hexToRgba(swatch.text, 0.15) }}
                    />
                  </div>
                </div>

                {/* Label area */}
                <div className='flex w-full items-center justify-between gap-1.5 px-3 py-2.5'>
                  <div className='min-w-0'>
                    <div className='truncate text-xs font-medium text-[var(--text-primary)]'>
                      {t.label}
                    </div>
                    <div className='truncate text-[0.65rem] text-[var(--text-muted)]'>
                      {t.description}
                    </div>
                  </div>

                  {isActive && (
                    <span className='shrink-0 rounded-full bg-[var(--accent-solid)]/10 px-2 py-0.5 text-[0.6rem] font-semibold text-[var(--accent-solid)]'>
                      Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  C. ADVANCED CUSTOMIZATION (only when "custom" active)       */}
      {/* ============================================================ */}

      {theme === "custom" && (
        <div className='overflow-hidden rounded-2xl border border-[var(--border-subtle)]'>
          {/* Header */}
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-4 py-3 sm:px-5'>
            <div className='flex items-center gap-2.5'>
              <Layers className='h-4 w-4 text-[var(--accent-solid)]' />
              <div>
                <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
                  Advanced customization
                </h3>
                <p className='text-[0.7rem] text-[var(--text-muted)]'>
                  Fine-tune your theme colors. Changes are saved to this device.
                </p>
              </div>
            </div>

            {/* Base preset toggle (Dark / Light) */}
            <div className='flex items-center gap-2'>
              <span className='text-[0.7rem] text-[var(--text-muted)]'>
                Base
              </span>
              <div className='inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5'>
                <button
                  type='button'
                  onClick={() => applyBasePreset("dark")}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    customBase === "dark"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  Dark
                </button>
                <button
                  type='button'
                  onClick={() => applyBasePreset("light")}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    customBase === "light"
                      ? "bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* Content: Preview + Controls side by side */}
          <div className='grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_260px]'>
            {/* Color controls */}
            <div className='space-y-5'>
              {/* Accent group */}
              <div>
                <div className='mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]'>
                  Accent
                </div>
                <ColorField
                  label='Accent color'
                  value={customColors.accentSolid}
                  onChange={(v) => handleColorChange("accentSolid", v)}
                />
              </div>

              {/* Surfaces group */}
              <div>
                <div className='mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]'>
                  Surfaces
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <ColorField
                    label='App background'
                    value={customColors.bgApp}
                    onChange={(v) => handleColorChange("bgApp", v)}
                  />
                  <ColorField
                    label='Card / surface'
                    value={customColors.bgSurface}
                    onChange={(v) => handleColorChange("bgSurface", v)}
                  />
                </div>
              </div>

              {/* Text group */}
              <div>
                <div className='mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]'>
                  Text
                </div>
                <ColorField
                  label='Primary text'
                  value={customColors.textPrimary}
                  onChange={(v) => handleColorChange("textPrimary", v)}
                />
              </div>

              {/* Reset button */}
              <button
                type='button'
                onClick={() =>
                  setCustomColors(
                    customBase === "light"
                      ? CUSTOM_LIGHT_DEFAULTS
                      : CUSTOM_DARK_DEFAULTS,
                  )
                }
                className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              >
                <RotateCcw className='h-3 w-3' />
                Reset to {customBase} preset
              </button>
            </div>

            {/* Inline live preview */}
            <div className='hidden lg:block'>
              <div className='sticky top-4 space-y-2'>
                <div className='text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]'>
                  Preview
                </div>
                <div
                  className='overflow-hidden rounded-xl border'
                  style={{
                    background: customColors.bgApp,
                    borderColor: hexToRgba(customColors.textPrimary, 0.1),
                  }}
                >
                  {/* Mini sidebar */}
                  <div className='flex gap-2 p-3'>
                    <div
                      className='w-12 shrink-0 space-y-2 rounded-lg p-2'
                      style={{
                        background: customColors.bgSurface,
                        border: `1px solid ${hexToRgba(customColors.textPrimary, 0.08)}`,
                      }}
                    >
                      <div
                        className='h-1.5 w-full rounded-full'
                        style={{ background: customColors.accentSolid }}
                      />
                      <div
                        className='h-1.5 w-6 rounded-full'
                        style={{
                          background: hexToRgba(customColors.textPrimary, 0.15),
                        }}
                      />
                      <div
                        className='h-1.5 w-5 rounded-full'
                        style={{
                          background: hexToRgba(customColors.textPrimary, 0.1),
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className='flex-1 space-y-2'>
                      <div
                        className='rounded-lg p-2.5'
                        style={{
                          background: customColors.bgSurface,
                          border: `1px solid ${hexToRgba(customColors.textPrimary, 0.08)}`,
                        }}
                      >
                        <div
                          className='h-2 w-16 rounded'
                          style={{ background: customColors.textPrimary }}
                        />
                        <div
                          className='mt-1.5 h-1.5 w-full rounded'
                          style={{
                            background: hexToRgba(
                              customColors.textPrimary,
                              0.15,
                            ),
                          }}
                        />
                        <div
                          className='mt-1 h-1.5 w-3/4 rounded'
                          style={{
                            background: hexToRgba(
                              customColors.textPrimary,
                              0.1,
                            ),
                          }}
                        />
                        <div
                          className='mt-2.5 h-5 w-14 rounded-md'
                          style={{
                            background: customColors.accentSolid,
                          }}
                        />
                      </div>
                      <div className='flex gap-1.5'>
                        <div
                          className='h-8 flex-1 rounded-lg'
                          style={{
                            background: customColors.bgSurface,
                            border: `1px solid ${hexToRgba(customColors.textPrimary, 0.08)}`,
                          }}
                        />
                        <div
                          className='h-8 flex-1 rounded-lg'
                          style={{
                            background: customColors.bgSurface,
                            border: `1px solid ${hexToRgba(customColors.textPrimary, 0.08)}`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swatch palette */}
                <div className='flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-2'>
                  {[
                    { label: "Accent", color: customColors.accentSolid },
                    { label: "Bg", color: customColors.bgApp },
                    { label: "Surface", color: customColors.bgSurface },
                    { label: "Text", color: customColors.textPrimary },
                  ].map((s) => (
                    <div key={s.label} className='flex-1 text-center'>
                      <div
                        className='mx-auto h-5 w-full rounded'
                        style={{ background: s.color }}
                      />
                      <div className='mt-1 text-[0.6rem] text-[var(--text-muted)]'>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  D. MOTION BACKGROUND                                        */}
      {/* ============================================================ */}

      <div>
        <div className='mb-1 flex items-center gap-2'>
          <div className='h-px flex-1 bg-[var(--border-subtle)]' />
        </div>

        <div className='mb-4 mt-4 flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-[var(--text-muted)]' />
            <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
              Motion background
            </h3>
          </div>
          <span className='text-xs text-[var(--text-muted)]'>
            Animated gradient behind the app shell
          </span>
        </div>

        <div className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3'>
          {motionBackgroundOptions.map((opt) => {
            const isActive = motionBackground === opt.id;
            return (
              <button
                key={opt.id}
                type='button'
                onClick={() => setMotionBackground(opt.id)}
                className={[
                  "group relative flex flex-col items-start overflow-hidden rounded-xl border text-left transition-all duration-200",
                  isActive
                    ? "border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)] shadow-md shadow-[var(--accent-solid)]/10"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:shadow-sm",
                ].join(" ")}
              >
                {/* Active checkmark */}
                {isActive && (
                  <span className='absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-solid)] text-[var(--text-on-accent)] shadow-sm'>
                    <Check className='h-3 w-3' strokeWidth={3} />
                  </span>
                )}

                {/* Gradient preview – animated for immersion */}
                <div className='h-20 w-full overflow-hidden'>
                  <div
                    className='h-full w-full'
                    data-motion-preview={opt.id === "none" ? undefined : opt.id}
                    style={{ background: opt.previewGradient }}
                  />
                </div>

                {/* Label + tag */}
                <div className='flex w-full items-center justify-between gap-2 px-3 py-2.5'>
                  <div className='min-w-0'>
                    <div className='truncate text-xs font-medium text-[var(--text-primary)]'>
                      {opt.label}
                    </div>
                    <div className='truncate text-[0.65rem] text-[var(--text-muted)]'>
                      {opt.description}
                    </div>
                  </div>

                  <span className='shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.6rem] text-[var(--text-muted)]'>
                    {opt.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { ThemeSelector };
