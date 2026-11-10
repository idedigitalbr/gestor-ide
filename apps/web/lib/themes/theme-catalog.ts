import type { ThemeDefinition } from "@/types/theme";

/**
 * Metadata visual autoral do seletor: NUNCA inferir famílias a partir dos
 * tokens semânticos --primary e --secondary do shadcn/ui.
 * Adicionar futuros presets aqui sem mudar a interface.
 */
export const COLOR_FAMILIES = {
  preto: { id: "preto", name: "Preto", swatch: "#202126", chrome: "#151619", borderRequired: true },
  branco: { id: "branco", name: "Branco", swatch: "#f6f6f4", chrome: "#ffffff", borderRequired: true },
  vermelho: { id: "vermelho", name: "Vermelho", swatch: "#c83c51", chrome: "#eb4054" },
  rosa: { id: "rosa", name: "Rosa", swatch: "#e56aa3", chrome: "#fb67aa" },
  verde: { id: "verde", name: "Verde", swatch: "#25be75", chrome: "#2fd77a" },
  azul: { id: "azul", name: "Azul", swatch: "#4386e7", chrome: "#3987f9" },
  amarelo: { id: "amarelo", name: "Amarelo", swatch: "#e4c23b", chrome: "#ffd426" },
  roxo: { id: "roxo", name: "Roxo", swatch: "#9868de", chrome: "#9965ef" },
  marrom: { id: "marrom", name: "Marrom", swatch: "#a47a4e", chrome: "#bd854c" },
  cinza: { id: "cinza", name: "Cinza", swatch: "#96999f", chrome: "#acafb4" },
  laranja: { id: "laranja", name: "Laranja", swatch: "#ed853d", chrome: "#f98c39" },
} as const;

export type ColorFamily = keyof typeof COLOR_FAMILIES;

/** A ordem é a ordem declarada no catálogo; nova família exige apenas uma entrada. */
export const ORDERED_COLOR_FAMILIES = Object.keys(COLOR_FAMILIES) as ColorFamily[];

export interface ThemeClassification {
  primary: ColorFamily;
  secondary: readonly ColorFamily[];
  keywords: string;
}

/** A classificação pertence ao próprio preset, nunca a um mapa por ID. */
export function classifyTheme(theme: ThemeDefinition): ThemeClassification {
  return {
    primary: theme.primaryColorFamily,
    secondary: theme.secondaryColorFamilies,
    keywords: theme.searchKeywords ?? "",
  };
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function matchesThemeSearch(theme: ThemeDefinition, text: string): boolean {
  const q = normalizeSearch(text);
  if (!q) return true;
  const meta = classifyTheme(theme);
  const tokens = [
    theme.name, theme.description ?? "", meta.keywords,
    COLOR_FAMILIES[meta.primary].name,
    ...meta.secondary.map((s) => COLOR_FAMILIES[s].name),
  ];
  return normalizeSearch(tokens.join(" ")).includes(q);
}

/** Filtro compartilhado pelo seletor e testes (escala independente do nº de presets). */
export function filterThemes(
  themes: readonly ThemeDefinition[],
  mode: ThemeDefinition["mode"],
  primary: ColorFamily | null,
  query: string
): ThemeDefinition[] {
  const inMode = themes.filter((theme) => theme.mode === mode);
  if (query.trim()) return inMode.filter((theme) => matchesThemeSearch(theme, query));
  if (!primary) return inMode;
  return inMode.filter((theme) => classifyTheme(theme).primary === primary);
}

/** Novas famílias aparecem sozinhas ao serem usadas por um novo preset. */
export function availableColorFamilies(
  themes: readonly ThemeDefinition[],
  mode: ThemeDefinition["mode"]
): ColorFamily[] {
  return [...new Set(themes.filter((theme) => theme.mode === mode).map((theme) => classifyTheme(theme).primary))];
}

export function contrastInk(backgroundHex: string): string {
  const c = backgroundHex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const lum = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return (1.05 / (lum + 0.05)) >= ((lum + 0.05) / 0.05) ? "#ffffff" : "#111111";
}
