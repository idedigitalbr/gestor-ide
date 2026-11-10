export type AppearanceMode = "dark" | "light";

/** Apenas um conjunto de IDs cromáticos: derivado do registro real em theme-catalog. */
import type { ColorFamily } from "@/lib/themes/theme-catalog";
export type { ColorFamily } from "@/lib/themes/theme-catalog";

export interface ColorFamilyDefinition {
  id: string;
  name: string;
  swatch?: string;
  chrome?: string;
  colorHex?: string;
  borderRequired?: boolean;
}

export interface ThemeTokens {
  // Base
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  // Identidade
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;

  // Superfícies e Auxiliares
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;

  // Estados
  destructive: string;
  destructiveForeground: string;

  // Sidebar
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarBorder: string;
  sidebarPrimary?: string;
  sidebarPrimaryForeground?: string;
  sidebarAccent?: string;
  sidebarAccentForeground?: string;

  // Gráficos
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  // Avançado (opcional)
  radius?: string; // ex: "0.5rem"
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  mode: "dark" | "light";
  isPreset: boolean;
  primaryColorFamily: ColorFamily;
  secondaryColorFamilies: ColorFamily[];
  /** Termos para busca opcional, definidos no próprio tema. */
  searchKeywords?: string;
  tokens: ThemeTokens;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThemeContextValue {
  appearanceMode: AppearanceMode;
  resolvedMode: "dark" | "light";
  activeTheme: ThemeDefinition;
  coloredChrome: boolean;
  setColoredChrome: (enabled: boolean) => void;
  darkThemeId: string;
  lightThemeId: string;
  allThemes: ThemeDefinition[];
  presetThemes: ThemeDefinition[];
  setAppearanceMode: (mode: AppearanceMode) => void;
  selectTheme: (themeId: string) => void;
  resetToDefaults: () => void;
}
