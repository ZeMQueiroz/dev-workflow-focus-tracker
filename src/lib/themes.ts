// lib/themes.ts

export const themes = [
  { id: "slate", label: "Slate", description: "Default dark", tier: "free" },
  { id: "light", label: "Light", description: "Clean paper", tier: "free" },
  { id: "sky", label: "Sky", description: "Cool light", tier: "free" },
  { id: "sand", label: "Sand", description: "Warm light", tier: "free" },
  { id: "nord", label: "Nord", description: "Arctic dark", tier: "free" },
  { id: "monokai", label: "Monokai", description: "Warm dark", tier: "free" },
  {
    id: "solarized",
    label: "Solarized",
    description: "Classic dark",
    tier: "free",
  },
  { id: "forest", label: "Forest", description: "Green dark", tier: "free" },
  { id: "rose", label: "Rose", description: "Pink dark", tier: "free" },

  // Custom theme slot
  {
    id: "custom",
    label: "Custom",
    description: "Your colors",
    tier: "free",
  },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const DEFAULT_THEME: ThemeId = "slate";
