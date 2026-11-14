"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check, ChevronDown, Diamond, Moon, Palette, PanelLeft, Pen, Search, Sun, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/lib/themes/theme-context";
import {
  COLOR_FAMILIES, classifyTheme, contrastInk, filterThemes, availableColorFamilies,
  type ColorFamily,
} from "@/lib/themes/theme-catalog";
import { cn } from "@/lib/utils";

const RAINBOW_CONIC_GRADIENT =
  "conic-gradient(from 180deg at 50% 50%, #f43f5e, #fb923c, #facc15, #4ade80, #22d3ee, #60a5fa, #a855f7, #ec4899, #f43f5e)";

export interface ThemeSelectorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  showTrigger?: boolean;
  position?: "bottom-left" | "top-right" | "center";
}

/**
 * Composição exata do Figma ajustada por Will: 354 × 240.
 * - Sem cor secundária (eliminada para simplicidade máxima).
 * - Estado inicial "Livre" com círculo gradiente de todas as cores.
 * - Header: Pílula de cor (com gradiente/cor ativa + caneta) à esquerda,
 *   ◇ Aparência centralizado, modo Claro/Escuro e Fechar à direita.
 * - Linha Temas + busca inline + toggle Sidebar/Header colorido.
 * - Lista rolante com todos os temas (modo Livre) ou filtrados por cor/busca.
 */
export function ThemeSelector({
  open: controlledOpen,
  onOpenChange,
  trigger,
  showTrigger = true,
  position = "bottom-left",
}: ThemeSelectorProps = {}) {
  const {
    activeTheme, resolvedMode, presetThemes, coloredChrome,
    setAppearanceMode, selectTheme, setColoredChrome,
  } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const val = typeof next === "function" ? next(open) : next;
      if (onOpenChange) {
        onOpenChange(val);
      }
      if (!isControlled) {
        setInternalOpen(val);
      }
    },
    [isControlled, onOpenChange, open]
  );

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorFamily | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);

  // Lista de temas exibidos: busca global no modo, ou filtrado por cor, ou todos no modo Livre
  const displayed = useMemo(
    () => filterThemes(presetThemes, resolvedMode, selectedColor, query),
    [presetThemes, resolvedMode, selectedColor, query]
  );

  const availableColors = useMemo(
    () => availableColorFamilies(presetThemes, resolvedMode),
    [presetThemes, resolvedMode]
  );

  function changeMode() {
    setAppearanceMode(resolvedMode === "dark" ? "light" : "dark");
    setSelectedColor(null);
    setColorPickerOpen(false);
    setQuery("");
  }

  function chooseColor(family: ColorFamily | null) {
    setSelectedColor(family);
    if (family) {
      const candidates = presetThemes.filter((t) => t.mode === resolvedMode && classifyTheme(t).primary === family);
      if (candidates[0]) {
        selectTheme(candidates[0].id);
      }
    }
    setQuery("");
    setColorPickerOpen(false);
    requestAnimationFrame(() => colorTriggerRef.current?.focus());
  }

  function chooseTheme(themeId: string) {
    selectTheme(themeId);
    setQuery("");
    setColorPickerOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const node = event.target as Node;
      if (!dialogRef.current?.contains(node) && !triggerRef.current?.contains(node)) {
        setOpen(false);
        setColorPickerOpen(false);
      } else if (
        dialogRef.current?.contains(node) &&
        !(node as Element).closest?.("[data-color-picker]")
      ) {
        setColorPickerOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (colorPickerOpen) {
        event.stopPropagation();
        setColorPickerOpen(false);
        requestAnimationFrame(() => colorTriggerRef.current?.focus());
      } else {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, colorPickerOpen]);

  const panel = (
    <section
      ref={dialogRef}
      role="dialog"
      aria-label="Aparência"
      className={cn(
        "fixed z-[100] flex h-[240px] max-h-[calc(100dvh-68px)] w-[354px] max-w-[calc(100vw_-_24px)] flex-col overflow-hidden rounded-[14px] border border-border bg-popover text-popover-foreground shadow-2xl",
        position === "top-right"
          ? "top-[56px] right-[16px]"
          : position === "center"
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            : "bottom-[56px] left-[12px]"
      )}
    >
      {/* Cabeçalho do Figma: Pílula de cor à esquerda, Aparência no centro, Modo e Fechar à direita */}
      <div className="relative flex h-[45px] shrink-0 items-center justify-between border-b border-border px-[10px]">
        {/* Pílula de cor com caneta (gradiente quando Livre) */}
        <button
          ref={colorTriggerRef}
          type="button"
          data-color-picker="trigger"
          aria-expanded={colorPickerOpen}
          aria-haspopup="dialog"
          aria-label={selectedColor ? `Filtrando por cor ${COLOR_FAMILIES[selectedColor].name}` : "Cor livre (todas as cores)"}
          onClick={() => setColorPickerOpen((prev) => !prev)}
          className="flex h-[28px] items-center gap-[7px] rounded-full border border-border/90 bg-muted/70 pl-[3px] pr-[10px] hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {selectedColor ? (
            <span
              className="flex size-[20px] shrink-0 items-center justify-center rounded-full shadow-sm"
              style={{
                backgroundColor: COLOR_FAMILIES[selectedColor].swatch,
                color: contrastInk(COLOR_FAMILIES[selectedColor].swatch),
              }}
            >
              <Pen className="size-[9px]" strokeWidth={2.5} />
            </span>
          ) : (
            <span
              className="flex size-[20px] shrink-0 items-center justify-center rounded-full shadow-sm border border-black/10"
              style={{ background: RAINBOW_CONIC_GRADIENT }}
            >
              <Pen className="size-[9px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" strokeWidth={2.5} />
            </span>
          )}
          <span className="flex flex-col text-left leading-none">
            <span className="text-[7.5px] font-medium text-muted-foreground">Cor</span>
            <strong className="text-[10px] font-bold text-foreground">
              {selectedColor ? COLOR_FAMILIES[selectedColor].name : "Livre"}
            </strong>
          </span>
        </button>

        {/* Título centralizado com Diamond */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-[6px] whitespace-nowrap text-[11px] font-bold pointer-events-none">
          <Diamond className="size-[13px] text-primary" aria-hidden="true" />
          Aparência
        </div>

        {/* Alternador de Modo e Botão Fechar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{resolvedMode === "dark" ? "Escuro" : "Claro"}</span>
          <button
            type="button"
            role="switch"
            aria-label="Alternar entre modo escuro e claro"
            aria-checked={resolvedMode === "dark"}
            onClick={changeMode}
            className="relative flex h-[22px] w-[45px] items-center justify-between rounded-full border border-border bg-muted px-[5px] text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Sun className="size-[11px]" aria-hidden="true" />
            <Moon className="size-[11px]" aria-hidden="true" />
            <span className={cn(
              "absolute top-px flex size-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-[left]",
              resolvedMode === "dark" ? "left-[23px]" : "left-[2px]"
            )}>
              {resolvedMode === "dark" ? <Moon className="size-3" /> : <Sun className="size-3" />}
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar aparência"
            onClick={() => { setOpen(false); setColorPickerOpen(false); }}
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Linha aprovada: Temas | busca inline | sidebar + header toggle */}
      <div className="flex h-[35px] shrink-0 items-center gap-[8px] border-b border-border px-[9px]">
        <strong className="whitespace-nowrap text-[11px] font-bold">Temas</strong>
        <div className="relative flex h-[19px] min-w-0 flex-1 items-center rounded-[4px] border border-border bg-muted/60">
          <Search className="pointer-events-none absolute left-[5px] size-[11px] text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar por tema ou cor"
            placeholder="Buscar por tema ou cor..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setColorPickerOpen(false); }}
            className="h-[18px] w-full border-0 bg-transparent pl-[19px] pr-1 text-[9px] shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>
        <div className="flex shrink-0 items-center gap-[4px]">
          <PanelLeft className="size-3 text-muted-foreground" aria-hidden="true" />
          <span className="text-[7px] font-semibold leading-[1.15]">Sidebar<br />+ Header colorido</span>
          <Switch
            checked={coloredChrome}
            onCheckedChange={setColoredChrome}
            aria-label="Colorir sidebar e header"
            title="Sidebar + Header colorido"
            className="h-[14px] w-[23px] p-0 border border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted [&>span]:size-[10px] [&>span]:data-[state=checked]:translate-x-[9px] [&>span]:data-[state=checked]:bg-primary-foreground [&>span]:data-[state=unchecked]:bg-muted-foreground"
          />
        </div>
      </div>

      {/* Lista de temas */}
      <div className="min-h-0 flex-1 overflow-y-auto px-[5px] pb-[6px] pt-[2px] [scrollbar-width:thin]" aria-label="Temas disponíveis">
        {displayed.map((theme) => {
          const selected = theme.id === activeTheme.id;
          const classification = classifyTheme(theme);
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              onClick={() => chooseTheme(theme.id)}
              className={cn(
                "mb-[2px] flex min-h-[51px] w-full items-center gap-[9px] rounded-[5px] border px-[10px] py-[8px] text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                selected ? "border-primary bg-secondary/90" : "border-transparent hover:bg-secondary/70"
              )}
            >
              <span className="flex size-[27px] shrink-0 items-center justify-center rounded-[5px] border"
                style={{ backgroundColor: theme.tokens.background, borderColor: theme.tokens.border }}>
                <span className="grid grid-cols-2 gap-[3px]">
                  {[theme.tokens.primary, theme.tokens.foreground, theme.tokens.secondary, theme.tokens.sidebarBackground].map((color, idx) =>
                    <span key={idx} className="size-[7px] rounded-[3px]" style={{ backgroundColor: color }} />)}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <strong className="truncate text-[11px] font-semibold">{theme.name}</strong>
                <span className="truncate text-[9px] text-muted-foreground">
                  {COLOR_FAMILIES[classification.primary].name} · {classification.secondary.map((c) => COLOR_FAMILIES[c].name).join(" / ")}
                </span>
              </span>
              {selected && <Check className="size-[19px] shrink-0 text-primary" strokeWidth={2.5} aria-label="Selecionado" />}
            </button>
          );
        })}
        {displayed.length === 0 && (
          <div className="p-3 text-[11px] text-muted-foreground">Nenhum tema encontrado neste modo. Tente outra cor ou nome.</div>
        )}
      </div>

      {/* Contador no rodapé */}
      <footer className="flex h-[13px] shrink-0 items-center justify-center border-t border-border bg-muted/40 text-[8px] text-muted-foreground">
        {displayed.length} {displayed.length === 1 ? "disponível" : "disponíveis"}
      </footer>

      {/* Popover de escolha de cor ancorado abaixo da pílula */}
      {colorPickerOpen && (
        <div
          data-color-picker="popup"
          role="dialog"
          aria-label="Opções de cor"
          className="absolute top-[48px] left-[10px] z-20 w-[185px] max-w-[calc(100%_-_20px)] overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
        >
          <div className="flex h-8 items-center justify-between border-b border-border px-[9px]">
            <strong className="text-[10px]">Escolher cor</strong>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Fechar opções de cor"
              className="size-5"
              onClick={() => setColorPickerOpen(false)}
            >
              <X className="size-3" />
            </Button>
          </div>
          <div className="grid max-h-[175px] grid-cols-3 gap-x-1 gap-y-3 overflow-y-auto px-[7px] py-3">
            {/* Opção Livre (Todas as cores com gradiente) */}
            <button
              type="button"
              data-color-picker="option"
              onClick={() => chooseColor(null)}
              aria-pressed={selectedColor === null}
              aria-label="Livre (todas as cores)"
              className="flex min-w-0 flex-col items-center gap-1 bg-transparent p-0 text-[9px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "flex size-[25px] items-center justify-center rounded-full border border-border shadow-sm",
                  selectedColor === null && "outline outline-2 outline-offset-2 outline-primary"
                )}
                style={{ background: RAINBOW_CONIC_GRADIENT }}
              >
                {selectedColor === null && <Check className="size-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" strokeWidth={3} />}
              </span>
              <span className="truncate font-medium">Livre</span>
            </button>

            {availableColors.map((family) => {
              const selected = family === selectedColor;
              return (
                <button
                  key={family}
                  type="button"
                  data-color-picker="option"
                  onClick={() => chooseColor(family)}
                  aria-pressed={selected}
                  aria-label={COLOR_FAMILIES[family].name}
                  className="flex min-w-0 flex-col items-center gap-1 bg-transparent p-0 text-[9px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex size-[25px] items-center justify-center rounded-full border border-border",
                      selected && "outline outline-2 outline-offset-2 outline-primary"
                    )}
                    style={{
                      backgroundColor: COLOR_FAMILIES[family].swatch,
                      color: contrastInk(COLOR_FAMILIES[family].swatch),
                    }}
                  >
                    {selected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{COLOR_FAMILIES[family].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <>
      {trigger ? (
        trigger
      ) : showTrigger ? (
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setOpen((prev) => !prev); setColorPickerOpen(false); }}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Abrir aparência"
          className="h-7 gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Palette className="size-3.5" />
          <span>Aparência</span>
          <ChevronDown className={cn("ml-auto size-3 text-muted-foreground", open && "rotate-180")} />
        </Button>
      ) : null}
      {open && typeof document !== "undefined" && createPortal(panel, document.body)}
    </>
  );
}
