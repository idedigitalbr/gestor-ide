"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KanbanGhostCardProps {
  label?: string;
  sublabel?: string;
  onClick: () => void;
  variant?: "task" | "entity" | "column";
  slideDirection?: "left" | "right" | "top";
  isVisible?: boolean;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  autoCloseMs?: number;
  isPaused?: boolean;
}

/**
 * Hook FLIP nativo (First, Last, Invert, Play) para animar suavemente elementos
 * marcados com [data-flip-id] quando outros itens são inseridos ou removidos (efeito "empurrar suave").
 */
export function useFlipGrid<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>,
  trigger: unknown,
  duration = 360
) {
  const prevPositions = useRef<Map<string, DOMRect>>(new Map());

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const elements = container.querySelectorAll<HTMLElement>("[data-flip-id]");
    const currentPositions = new Map<string, DOMRect>();

    elements.forEach((el) => {
      const id = el.getAttribute("data-flip-id");
      if (id) {
        currentPositions.set(id, el.getBoundingClientRect());
      }
    });

    elements.forEach((el) => {
      const id = el.getAttribute("data-flip-id");
      if (!id) return;

      const prevRect = prevPositions.current.get(id);
      const currRect = currentPositions.get(id);

      if (prevRect && currRect) {
        const dx = prevRect.left - currRect.left;
        const dy = prevRect.top - currRect.top;

        if (dx !== 0 || dy !== 0) {
          el.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: "translate(0px, 0px)" },
            ],
            {
              duration,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            }
          );
        }
      }
    });

    prevPositions.current = currentPositions;
  }, [trigger, duration, containerRef]);
}

/**
 * Hook com dwell time (2s) para expandir o skeleton grande entre cards,
 * abertura imediata ao clicar no botão +, e auto-close de 4s com pausa no hover
 * e barra regressiva animada.
 */
export function useDwellGhost({
  dwellTimeMs = 2000,
  autoCloseTimeMs = 4000,
}: {
  dwellTimeMs?: number;
  autoCloseTimeMs?: number;
  leaveDelayMs?: number;
} = {}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeSeparatorIndex, setActiveSeparatorIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseStartTimeRef = useRef<number>(0);
  const autoCloseRemainingRef = useRef<number>(autoCloseTimeMs);

  const clearAutoClose = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const startAutoClose = useCallback(
    (duration: number) => {
      clearAutoClose();
      autoCloseStartTimeRef.current = Date.now();
      autoCloseRemainingRef.current = duration;
      setIsPaused(false);

      autoCloseTimerRef.current = setTimeout(() => {
        setExpandedIndex(null);
        setActiveSeparatorIndex(null);
        setIsPaused(false);
      }, duration);
    },
    [clearAutoClose]
  );

  // Inicia contagem de 2 segundos de hover no separador
  const startDwell = useCallback(
    (index: number) => {
      setActiveSeparatorIndex(index);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = setTimeout(() => {
        setExpandedIndex(index);
        startAutoClose(autoCloseTimeMs);
      }, dwellTimeMs);
    },
    [dwellTimeMs, autoCloseTimeMs, startAutoClose]
  );

  // Cancela o timer se o mouse sair do separador antes de 2s
  const cancelDwell = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  // Abre IMEDIATAMENTE ao clicar no botãozinho + do separador (sem abrir modal)
  const openImmediate = useCallback(
    (index: number) => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      setActiveSeparatorIndex(index);
      setExpandedIndex(index);
      startAutoClose(autoCloseTimeMs);
    },
    [autoCloseTimeMs, startAutoClose]
  );

  // Pausa a barra e o timer de 4s quando o mouse entra no skeleton
  const pauseAutoClose = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
      const elapsed = Date.now() - autoCloseStartTimeRef.current;
      autoCloseRemainingRef.current = Math.max(1000, autoCloseRemainingRef.current - elapsed);
      setIsPaused(true);
    }
  }, []);

  // Retoma a barra e o timer quando o mouse sai do skeleton
  const resumeAutoClose = useCallback(() => {
    if (expandedIndex !== null) {
      startAutoClose(autoCloseRemainingRef.current || autoCloseTimeMs);
    }
  }, [expandedIndex, startAutoClose, autoCloseTimeMs]);

  // Fecha o skeleton
  const closeExpanded = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    clearAutoClose();
    setExpandedIndex(null);
    setActiveSeparatorIndex(null);
    setIsPaused(false);
  }, [clearAutoClose]);

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      clearAutoClose();
    };
  }, [clearAutoClose]);

  return {
    expandedIndex,
    activeSeparatorIndex,
    startDwell,
    cancelDwell,
    openImmediate,
    pauseAutoClose,
    resumeAutoClose,
    keepExpanded: pauseAutoClose, // compatibilidade
    closeExpanded,
    setExpandedIndex,
    isPaused,
    autoCloseTimeMs,
  };
}

/**
 * Separador translúcido ultra moderno perfeitamente centralizado no vão entre os cards,
 * com linha degradê e botãozinho flutuante em vidro acetinado (frosted glass).
 */
export function CardInsertSeparator({
  side,
  onHoverStart,
  onHoverEnd,
  onClick,
  title = "Adicionar novo",
}: {
  side: "left" | "right";
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 z-30 flex items-center justify-center cursor-pointer group/sep select-none pointer-events-auto",
        side === "right"
          ? "left-[calc(100%+8px)] -translate-x-1/2 w-6"
          : "-left-2 -translate-x-1/2 w-6"
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
    >
      {/* Linha vertical translúcida em degradê suave */}
      <div className="w-[1.5px] h-[65%] rounded-full bg-gradient-to-b from-transparent via-primary/30 to-transparent group-hover/sep:via-primary/70 transition-all duration-300 opacity-0 group-hover/card:opacity-40 group-hover/sep:opacity-100 pointer-events-none" />

      {/* Botãozinho + translúcido em frosted glass, elegante e perfeitamente centralizado */}
      <div className="absolute top-1/2 -translate-y-1/2 size-6 rounded-full bg-card/85 backdrop-blur-md border border-border/80 text-foreground/75 shadow-sm flex items-center justify-center transition-all duration-300 group-hover/sep:scale-110 group-hover/sep:bg-card group-hover/sep:text-primary group-hover/sep:border-primary/60 group-hover/sep:shadow-md opacity-0 group-hover/card:opacity-50 group-hover/sep:opacity-100">
        <Plus className="size-3.5 stroke-[2.2] transition-transform duration-300 group-hover/sep:rotate-90" />
      </div>
    </div>
  );
}

/**
 * Hook reutilizável para gerenciar a aparição suave e o desaparecimento com tolerância (debounce)
 * ao passar o mouse perto das bordas laterais do Kanban ou no próprio placeholder.
 */
export function useKanbanEdgeHover({
  leaveDelay = 220,
}: {
  leaveDelay?: number;
} = {}) {
  const [isGhostVisible, setIsGhostVisible] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showGhost = useCallback((direction: "left" | "right" = "left") => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setSlideDirection(direction);
    setIsGhostVisible(true);
  }, []);

  const hideGhost = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsGhostVisible(false);
    }, leaveDelay);
  }, [leaveDelay]);

  const keepGhost = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsGhostVisible(true);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isGhostVisible,
    slideDirection,
    showGhost,
    hideGhost,
    keepGhost,
  };
}

/**
 * Card Fantasma (Skeleton / Placeholder) para criação rápida em Kanbans e Grids.
 * Segue a identidade visual moderna, minimalista e fluida inspirada no Linear e Notion.
 */
export function KanbanGhostCard({
  label = "Novo",
  sublabel,
  onClick,
  variant = "task",
  slideDirection = "left",
  isVisible = true,
  className,
  disabled = false,
  ariaLabel,
  onMouseEnter,
  onMouseLeave,
  autoCloseMs,
  isPaused = false,
}: KanbanGhostCardProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  // Define as classes dimensionais e estruturais de acordo com a variante
  const variantStyles = {
    task: "min-h-[76px] p-3 w-full",
    entity: "min-h-[190px] h-full p-6 w-full",
    column: "w-[240px] h-[calc(100vh-210px)] max-h-[420px] p-4",
  }[variant];

  // Offset inicial de deslocamento lateral para a animação elegante de deslize
  const slideTransform =
    slideDirection === "left"
      ? isVisible
        ? "translate-x-0"
        : "-translate-x-4"
      : slideDirection === "right"
      ? isVisible
        ? "translate-x-0"
        : "translate-x-4"
      : isVisible
      ? "translate-y-0"
      : "-translate-y-3";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={ariaLabel || `${label} card`}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-xl overflow-hidden",
        "border-2 border-dashed border-border/70 hover:border-primary/80",
        "bg-card/40 hover:bg-card/75 backdrop-blur-xs",
        "transition-all duration-300 ease-out select-none",
        "shadow-2xs hover:shadow-md cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        variantStyles,
        slideTransform,
        className
      )}
    >
      {/* Barra de progresso regressiva (carregando ao contrário até a esquerda) */}
      {autoCloseMs && autoCloseMs > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/10 overflow-hidden z-20">
          <div
            className="h-full bg-primary/70 origin-left"
            style={{
              animation: `ghost-progress ${autoCloseMs}ms linear forwards`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      )}

      {/* Indicador central minimalista com ícone + e texto Novo */}
      <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
        <div
          className={cn(
            "flex items-center justify-center rounded-lg bg-background/80 border border-border/70",
            "text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary",
            "transition-all duration-200 group-hover:scale-110 shadow-2xs",
            variant === "task" ? "w-6 h-6 rounded-md" : "w-9 h-9 rounded-xl"
          )}
        >
          <Plus
            className={cn(
              "stroke-[2.5] transition-transform duration-200 group-hover:rotate-90",
              variant === "task" ? "w-3.5 h-3.5" : "w-4.5 h-4.5"
            )}
          />
        </div>

        <span
          className={cn(
            "font-semibold tracking-wide transition-colors duration-200",
            variant === "task" ? "text-xs" : "text-xs font-bold"
          )}
        >
          {label}
        </span>

        {sublabel && (
          <span className="text-[10px] text-muted-foreground/70 transition-colors group-hover:text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
