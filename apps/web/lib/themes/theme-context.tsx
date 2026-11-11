"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { AppearanceMode, ThemeDefinition, ThemeContextValue } from "@/types/theme";
import { DARK_THEMES } from "./presets-dark";
import { LIGHT_THEMES } from "./presets-light";
import { applyThemeToDocument } from "./theme-utils";
import { classifyTheme, COLOR_FAMILIES, contrastInk } from "./theme-catalog";

const STORAGE_KEYS = {
  MODE: "planw_appearance_mode",
  DARK_THEME: "planw_theme_dark",
  LIGHT_THEME: "planw_theme_light",
  COLORED_CHROME: "planw_colored_chrome",
} as const;

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [coloredChrome, setColoredChromeState] = useState<boolean>(false);
  const setColoredChrome = useCallback((enabled: boolean) => {
    setColoredChromeState(enabled);
    try { localStorage.setItem(STORAGE_KEYS.COLORED_CHROME, String(enabled)); }
    catch { /* Navegador bloqueou armazenamento: manter opção em memória. */ }
  }, []);

  // 1. Modos de aparência estritamente binários: "dark" ou "light" (sem auto/sistema)
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>("dark");

  // 2. IDs de temas ativos por modo (padrão Dark = all-black, padrão Light = clean-white)
  const [darkThemeId, setDarkThemeId] = useState<string>("all-black");
  const [lightThemeId, setLightThemeId] = useState<string>("clean-white");

  // Hidrata preferências salvas no cliente sem causar divergência no SSR
  useEffect(() => {
    try {
      const storedChrome = localStorage.getItem(STORAGE_KEYS.COLORED_CHROME);
      // As preferências locais só ficam disponíveis após a hidratação no cliente.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (storedChrome === "true") setColoredChromeState(true);

      const storedMode = localStorage.getItem(STORAGE_KEYS.MODE);
      if (storedMode === "light" || storedMode === "dark") {
        setAppearanceModeState(storedMode);
      }

      const storedDark = localStorage.getItem(STORAGE_KEYS.DARK_THEME);
      if (storedDark) setDarkThemeId(storedDark);

      const storedLight = localStorage.getItem(STORAGE_KEYS.LIGHT_THEME);
      if (storedLight) setLightThemeId(storedLight);
    } catch {}
  }, []);

  // 3. Modo resolvido direto (sempre "dark" ou "light")
  const resolvedMode: "dark" | "light" = appearanceMode;

  // 4. Lista dos 24 temas pré-configurados exatamente
  const presetThemes = useMemo(() => [...DARK_THEMES, ...LIGHT_THEMES], []);
  const allThemes = presetThemes;

  // 5. Tema atualmente ativo
  const activeTheme: ThemeDefinition = useMemo(() => {
    const targetId = resolvedMode === "dark" ? darkThemeId : lightThemeId;
    const found = allThemes.find((t) => t.id === targetId && t.mode === resolvedMode);
    if (found) return found;

    if (resolvedMode === "dark") {
      return DARK_THEMES[0]!;
    }
    return LIGHT_THEMES[0]!;
  }, [resolvedMode, darkThemeId, lightThemeId, allThemes]);

  // 6. Efeito de aplicação no documento (:root e .dark)
  useEffect(() => {
    applyThemeToDocument(activeTheme, resolvedMode === "dark");
    const root = document.documentElement;
    root.dataset.coloredChrome = coloredChrome ? "true" : "false";
    if (coloredChrome) {
      const chrome = COLOR_FAMILIES[classifyTheme(activeTheme).primary].chrome;
      const foreground = contrastInk(chrome);
      const darkText = foreground === "#111111";
      root.style.setProperty("--sidebar-background", chrome);
      root.style.setProperty("--sidebar-foreground", foreground);
      root.style.setProperty("--sidebar-border", darkText ? "#00000030" : "#ffffff30");
      root.style.setProperty("--sidebar-accent", darkText ? "#00000018" : "#ffffff24");
      root.style.setProperty("--sidebar-accent-foreground", foreground);
      root.style.setProperty("--chrome-background", chrome);
      root.style.setProperty("--chrome-foreground", foreground);
      root.style.setProperty("--chrome-muted", darkText ? "#383838" : "#ffffffcc");
      root.style.setProperty("--chrome-highlight", darkText ? "#00000016" : "#ffffff24");
      root.style.setProperty("--chrome-border", darkText ? "#00000030" : "#ffffff30");
    } else {
      ["--chrome-background", "--chrome-foreground", "--chrome-muted", "--chrome-highlight", "--chrome-border"].forEach((key) => root.style.removeProperty(key));
    }
  }, [activeTheme, resolvedMode, coloredChrome]);

  // 7. Ações do usuário
  const setAppearanceMode = useCallback((mode: AppearanceMode) => {
    setAppearanceModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, mode);
    } catch {}
  }, []);

  const selectTheme = useCallback(
    (themeId: string) => {
      const theme = allThemes.find((t) => t.id === themeId);
      if (!theme) return;

      if (theme.mode === "dark") {
        setDarkThemeId(themeId);
        try {
          localStorage.setItem(STORAGE_KEYS.DARK_THEME, themeId);
        } catch {}
        if (appearanceMode !== "dark") {
          setAppearanceMode("dark");
        }
      } else {
        setLightThemeId(themeId);
        try {
          localStorage.setItem(STORAGE_KEYS.LIGHT_THEME, themeId);
        } catch {}
        if (appearanceMode !== "light") {
          setAppearanceMode("light");
        }
      }
    },
    [allThemes, appearanceMode, setAppearanceMode]
  );

  const resetToDefaults = useCallback(() => {
    setAppearanceModeState("dark");
    setDarkThemeId("all-black");
    setLightThemeId("clean-white");
    try {
      localStorage.setItem(STORAGE_KEYS.MODE, "dark");
      localStorage.setItem(STORAGE_KEYS.DARK_THEME, "all-black");
      localStorage.setItem(STORAGE_KEYS.LIGHT_THEME, "clean-white");
    } catch {}
  }, []);

  const value: ThemeContextValue = useMemo(
    () => ({
      appearanceMode,
      resolvedMode,
      activeTheme,
      coloredChrome,
      setColoredChrome,
      darkThemeId,
      lightThemeId,
      allThemes,
      presetThemes,
      setAppearanceMode,
      selectTheme,
      resetToDefaults,
    }),
    [
      appearanceMode,
      resolvedMode,
      activeTheme,
      coloredChrome,
      setColoredChrome,
      darkThemeId,
      lightThemeId,
      allThemes,
      presetThemes,
      setAppearanceMode,
      selectTheme,
      resetToDefaults,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser utilizado dentro de um <ThemeProvider>");
  }
  return context;
}
