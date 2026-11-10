import type { ThemeDefinition, ThemeTokens } from "@/types/theme";

/**
 * Converte HEX (#RRGGBB ou #RGB) para componentes RGB [r, g, b] normalizados (0-255)
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const cleanHex = hex.trim().replace(/^#/, "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

/**
 * Calcula a luminância relativa conforme especificação WCAG 2.1
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;

  const rLum = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gLum = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bLum = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * Calcula a razão de contraste entre duas cores HEX (ex: 7.2)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;

  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function formatContrastRating(ratio: number): {
  ratioText: string;
  passesAA: boolean;
  passesAAA: boolean;
  label: string;
} {
  const rounded = Math.round(ratio * 10) / 10;
  const passesAA = rounded >= 4.5;
  const passesAAA = rounded >= 7.0;
  const passesLargeAA = rounded >= 3.0;

  let label = "Falha";
  if (passesAAA) label = "WCAG AAA";
  else if (passesAA) label = "WCAG AA";
  else if (passesLargeAA) label = "Texto Grande";

  return {
    ratioText: `${rounded}:1`,
    passesAA,
    passesAAA,
    label,
  };
}

/**
 * Valida formato HEX
 */
export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

/**
 * Mapeia os tokens de um tema para variáveis CSS correspondentes do shadcn/ui
 */
export function tokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--card": tokens.card,
    "--card-foreground": tokens.cardForeground,
    "--popover": tokens.popover,
    "--popover-foreground": tokens.popoverForeground,
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryForeground,
    "--secondary": tokens.secondary,
    "--secondary-foreground": tokens.secondaryForeground,
    "--muted": tokens.muted,
    "--muted-foreground": tokens.mutedForeground,
    "--accent": tokens.accent,
    "--accent-foreground": tokens.accentForeground,
    "--destructive": tokens.destructive,
    "--destructive-foreground": tokens.destructiveForeground,
    "--border": tokens.border,
    "--input": tokens.input,
    "--ring": tokens.ring,
    "--sidebar-background": tokens.sidebarBackground,
    "--sidebar-foreground": tokens.sidebarForeground,
    "--sidebar-border": tokens.sidebarBorder,
    "--sidebar-primary": tokens.sidebarPrimary || tokens.primary,
    "--sidebar-primary-foreground": tokens.sidebarPrimaryForeground || tokens.primaryForeground,
    "--sidebar-accent": tokens.sidebarAccent || tokens.secondary,
    "--sidebar-accent-foreground": tokens.sidebarAccentForeground || tokens.secondaryForeground,
    "--sidebar-ring": tokens.ring,
    "--chart-1": tokens.chart1,
    "--chart-2": tokens.chart2,
    "--chart-3": tokens.chart3,
    "--chart-4": tokens.chart4,
    "--chart-5": tokens.chart5,
  };

  if (tokens.radius) {
    vars["--radius"] = tokens.radius;
  }

  return vars;
}

/**
 * Aplica um tema no elemento HTML (:root)
 */
export function applyThemeToDocument(theme: ThemeDefinition, isDark: boolean): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Gerencia classe .dark
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.setAttribute("data-theme", theme.id);

  // Aplica as propriedades CSS no :root
  const cssVars = tokensToCssVars(theme.tokens);
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }
}
