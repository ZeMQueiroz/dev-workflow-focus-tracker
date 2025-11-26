// lib/themes.ts

export const themes = [
  { id: "slate", label: "Slate (Default)", tier: "free" },
  { id: "light", label: "Light / Paper", tier: "free" },
  { id: "sky", label: "Sky", tier: "free" },
  { id: "sand", label: "Sand", tier: "free" },
  { id: "nord", label: "Nord", tier: "free" },
  { id: "monokai", label: "Monokai", tier: "free" },
  { id: "solarized", label: "Solarized", tier: "free" },
  { id: "forest", label: "Forest", tier: "free" },
  { id: "rose", label: "Rose", tier: "free" },

  // New: custom theme slot (currently also "free", you can gate later)
  { id: "custom", label: "Custom theme", tier: "free" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const DEFAULT_THEME: ThemeId = "slate";
