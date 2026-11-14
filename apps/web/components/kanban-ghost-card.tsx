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
      aria-label={ariaLabel || `${label} card`}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-xl",
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
