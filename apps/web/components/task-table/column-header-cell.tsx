"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownAz,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpAz,
  ChevronsUpDown,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Layers,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnHeaderCellProps {
  id: string;
  label: string;
  isSorted: boolean;
  sortDirection: SortDirection;
  isDraggable?: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onSortToggle: (columnId: string) => void;
  onSetSort: (columnId: string, direction: "asc" | "desc" | null) => void;
  onMoveToStart?: (columnId: string) => void;
  onMoveToEnd?: (columnId: string) => void;
  onMoveLeft?: (columnId: string) => void;
  onMoveRight?: (columnId: string) => void;
  onHideColumn?: (columnId: string) => void;
  onDragStart?: (columnId: string, e: React.DragEvent) => void;
  onDragOver?: (columnId: string, e: React.DragEvent) => void;
  onDragLeave?: (columnId: string, e: React.DragEvent) => void;
  onDrop?: (columnId: string, e: React.DragEvent) => void;
  isDragTarget?: boolean;
  className?: string;
}

export function ColumnHeaderCell({
  id,
  label,
  isSorted,
  sortDirection,
  isDraggable = true,
  canMoveLeft = true,
  canMoveRight = true,
  onSortToggle,
  onSetSort,
  onMoveToStart,
  onMoveToEnd,
  onMoveLeft,
  onMoveRight,
  onHideColumn,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragTarget,
  className,
}: ColumnHeaderCellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart?.(id, e)}
      onDragOver={(e) => onDragOver?.(id, e)}
      onDragLeave={(e) => onDragLeave?.(id, e)}
      onDrop={(e) => onDrop?.(id, e)}
      className={cn(
        "group relative select-none px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary/40 rounded-sm",
        isDraggable && "cursor-grab active:cursor-grabbing",
        isDragTarget && "ring-2 ring-primary bg-primary/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1">
        {/* Left: Drag Handle (faint on hover) + Column Label */}
        <div className="flex min-w-0 items-center gap-1.5 flex-1">
          {isDraggable ? (
            <GripVertical
              className="h-3 w-3 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate text-muted-foreground group-hover:text-foreground font-medium transition-colors">
            {label}
          </span>
        </div>

        {/* Right: Quick Sort Indicator on Hover + Column Options Menu */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Quick sort button on hover (Anexo 2) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSortToggle(id);
            }}
            title={
              isSorted
                ? sortDirection === "asc"
                  ? "Ordenado crescente (clique para decrescente)"
                  : "Ordenado decrescente (clique para remover)"
                : "Clique para ordenar rapidamente"
            }
            aria-label={`Ordenar coluna ${label}`}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-all hover:bg-primary/20 hover:text-primary cursor-pointer",
              isSorted ? "opacity-100 text-primary font-bold" : "opacity-0 group-hover:opacity-80"
            )}
          >
            {isSorted ? (
              sortDirection === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
              )
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Column options menu (Anexo 2) */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Opções da coluna ${label}`}
                title="Opções da coluna"
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-all hover:bg-secondary hover:text-foreground cursor-pointer",
                  isMenuOpen ? "opacity-100 bg-secondary" : "opacity-0 group-hover:opacity-80"
                )}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl bg-popover border-border">
              <DropdownMenuLabel className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Coluna: {label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />

              {/* Classificar */}
              <DropdownMenuItem
                onClick={() => onSetSort(id, sortDirection === "asc" ? "desc" : "asc")}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer font-medium hover:bg-accent"
              >
                {sortDirection === "asc" ? (
                  <>
                    <ArrowDownAz className="h-4 w-4 text-muted-foreground" />
                    <span>Classificar decrescente</span>
                  </>
                ) : (
                  <>
                    <ArrowUpAz className="h-4 w-4 text-muted-foreground" />
                    <span>Classificar crescente</span>
                  </>
                )}
              </DropdownMenuItem>

              {/* Ordenar coluna inteira */}
              <DropdownMenuItem
                onClick={() => onSortToggle(id)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer font-medium hover:bg-accent"
              >
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                <span>Ordenar coluna inteira</span>
              </DropdownMenuItem>

              {/* Grupo */}
              <DropdownMenuItem
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer font-medium hover:bg-accent"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span>Grupo</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              {/* Mover para o início */}
              <DropdownMenuItem
                disabled={!canMoveLeft}
                onClick={() => onMoveToStart?.(id)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer font-medium disabled:opacity-40 hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                <span>Mover para o início</span>
              </DropdownMenuItem>

              {/* Mover para o final */}
              <DropdownMenuItem
                disabled={!canMoveRight}
                onClick={() => onMoveToEnd?.(id)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer font-medium disabled:opacity-40 hover:bg-accent"
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>Mover para o final</span>
              </DropdownMenuItem>

              {/* Automatizar */}
              <DropdownMenuItem
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer font-medium hover:bg-accent"
              >
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span>Automatizar</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              {/* Ocultar coluna */}
              <DropdownMenuItem
                onClick={() => onHideColumn?.(id)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer text-destructive focus:text-destructive font-medium hover:bg-destructive/10"
              >
                <EyeOff className="h-4 w-4" />
                <span>Ocultar coluna</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
