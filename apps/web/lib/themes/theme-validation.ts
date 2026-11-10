import type { ThemeDefinition, ThemeTokens } from "@/types/theme";
import { COLOR_FAMILIES } from "./theme-catalog";
import { getContrastRatio, isValidHex } from "./theme-utils";

/**
 * Contrato runtime de tokens. A tipagem TypeScript evita omissões na autoria;
 * esta lista protege também entradas geradas, fixtures e dados futuros.
 */
export const REQUIRED_THEME_TOKENS = [
  "background", "foreground", "card", "cardForeground", "popover",
  "popoverForeground", "primary", "primaryForeground", "secondary",
  "secondaryForeground", "muted", "mutedForeground", "accent",
  "accentForeground", "destructive", "destructiveForeground", "border",
  "input", "ring", "sidebarBackground", "sidebarForeground",
  "sidebarBorder", "chart1", "chart2", "chart3", "chart4", "chart5",
] as const satisfies readonly (keyof ThemeTokens)[];

const TEXT_PAIRS = [
  ["background", "foreground"],
  ["card", "cardForeground"],
  ["popover", "popoverForeground"],
  ["primary", "primaryForeground"],
  ["secondary", "secondaryForeground"],
  ["accent", "accentForeground"],
  ["muted", "mutedForeground"],
  ["destructive", "destructiveForeground"],
  ["sidebarBackground", "sidebarForeground"],
] as const satisfies readonly (readonly (keyof ThemeTokens)[])[];

export interface ThemeValidationReport {
  errors: string[];
  /** Baixo contraste em um preset existente: avisar, NÃO alterar cores sem aprovação. */
  contrastWarnings: string[];
}

/**
 * Valida QUALQUER quantidade de temas, nunca uma lista conhecida de 24 IDs.
 * Valores de paleta permanecem exclusivamente nos presets e catálogo centrais.
 */
export function validateThemeCatalog(themes: readonly ThemeDefinition[]): ThemeValidationReport {
  const errors: string[] = [];
  const contrastWarnings: string[] = [];
  const seen = new Set<string>();
  const families = COLOR_FAMILIES as Record<string, unknown>;

  themes.forEach((theme, index) => {
    const label = theme.id || `posição ${index}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(theme.id ?? "")) {
      errors.push(`${label}: ID ausente ou fora do padrão kebab-case`);
    }
    if (seen.has(theme.id)) errors.push(`${label}: ID duplicado`);
    seen.add(theme.id);
    if (!theme.name?.trim()) errors.push(`${label}: nome ausente`);
    if (theme.mode !== "dark" && theme.mode !== "light") {
      errors.push(`${label}: modo inválido`);
    }
    if (!Object.hasOwn(families, theme.primaryColorFamily)) {
      errors.push(`${label}: família primária inválida: ${String(theme.primaryColorFamily)}`);
    }
    if (!Array.isArray(theme.secondaryColorFamilies) || theme.secondaryColorFamilies.length === 0) {
      errors.push(`${label}: informe ao menos uma família secundária válida`);
    } else {
      for (const family of theme.secondaryColorFamilies) {
        if (!Object.hasOwn(families, family)) {
          errors.push(`${label}: família secundária inválida: ${String(family)}`);
        }
      }
    }
    if (theme.searchKeywords !== undefined && typeof theme.searchKeywords !== "string") {
      errors.push(`${label}: searchKeywords deve ser texto`);
    }
    if (!theme.tokens || typeof theme.tokens !== "object") {
      errors.push(`${label}: objeto de tokens ausente`);
      return;
    }
    for (const key of REQUIRED_THEME_TOKENS) {
      if (!isValidHex(String(theme.tokens[key] ?? ""))) {
        errors.push(`${label}: token ${key} ausente ou HEX inválido`);
      }
    }
    if (theme.tokens.radius !== undefined && !/^\d+(?:\.\d+)?(?:rem|px)$/.test(theme.tokens.radius)) {
      errors.push(`${label}: radius inválido`);
    }

    // Avisos e não erros: preservar as 24 paletas aprovadas sem ajustes silenciosos.
    for (const [background, foreground] of TEXT_PAIRS) {
      const bg = theme.tokens[background];
      const fg = theme.tokens[foreground];
      if (typeof bg === "string" && typeof fg === "string" && isValidHex(bg) && isValidHex(fg)) {
        const ratio = getContrastRatio(bg, fg);
        if (ratio < 4.5) {
          contrastWarnings.push(`${label}: ${background}/${foreground} = ${ratio.toFixed(2)}:1 (WCAG AA texto comum: 4.5:1)`);
        }
      }
    }
  });

  return { errors, contrastWarnings };
}
