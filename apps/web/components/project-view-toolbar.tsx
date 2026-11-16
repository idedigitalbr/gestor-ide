"use client";

import React from "react";
import type { ViewMode } from "@gestor-ide/core";
import {
  Table,
  Kanban,
  Calendar,
  SlidersHorizontal,
  Users,
  Plus,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ProjectViewToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalTasks: number;
  isFiltered?: boolean;
  onClearFilters?: () => void;
  canCreate?: boolean;
  onOpenNewTask?: () => void;
  className?: string;
}

const VIEW_OPTIONS: Array<{
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desktopOnly?: boolean;
}> = [
  { id: "table", label: "Tabela", icon: Table },
  { id: "kanban", label: "Kanban", icon: Kanban },
  { id: "calendar", label: "Calendário", icon: Calendar, desktopOnly: true },
  { id: "gantt", label: "Gantt", icon: SlidersHorizontal, desktopOnly: true },
  { id: "workload", label: "Carga de Trabalho", icon: Users, desktopOnly: true },
];

export function ProjectViewToolbar({
  viewMode,
  onViewModeChange,
  totalTasks,
  isFiltered = false,
  onClearFilters,
  canCreate = true,
  onOpenNewTask,
  className,
}: ProjectViewToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-1 py-1 select-none",
        className
      )}
    >
      {/* Lado Esquerdo: Abas de Visualização */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div
          role="tablist"
          aria-label="Modo de visualização das tarefas"
          className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40 shadow-2xs"
        >
          {/* Tabela */}
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "table"}
            onClick={() => onViewModeChange("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              viewMode === "table"
                ? "bg-background text-foreground shadow-2xs font-semibold ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
            title="Visualização em Tabela"
          >
            <Table className="size-3.5" />
            <span>Tabela</span>
            {viewMode === "table" && totalTasks > 0 && (
              <span className="text-[10px] font-mono opacity-70 ml-0.5">
                ({totalTasks})
              </span>
            )}
          </button>

          {/* Kanban */}
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "kanban"}
            onClick={() => onViewModeChange("kanban")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              viewMode === "kanban"
                ? "bg-background text-foreground shadow-2xs font-semibold ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
            title="Visualização em Quadro Kanban"
          >
            <Kanban className="size-3.5" />
            <span>Kanban</span>
            {viewMode === "kanban" && totalTasks > 0 && (
              <span className="text-[10px] font-mono opacity-70 ml-0.5">
                ({totalTasks})
              </span>
            )}
          </button>

          {/* Calendário (em telas médias/grandes) */}
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "calendar"}
            onClick={() => onViewModeChange("calendar")}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              viewMode === "calendar"
                ? "bg-background text-foreground shadow-2xs font-semibold ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
            title="Visualização em Calendário"
          >
            <Calendar className="size-3.5" />
            <span>Calendário</span>
          </button>

          {/* Gantt (em telas grandes) */}
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "gantt"}
            onClick={() => onViewModeChange("gantt")}
            className={cn(
              "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              viewMode === "gantt"
                ? "bg-background text-foreground shadow-2xs font-semibold ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
            title="Visualização em Gantt"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Gantt</span>
          </button>

          {/* Dropdown "Mais" para Calendário, Gantt e Carga no mobile/telas compactas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex md:hidden items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  (viewMode === "calendar" ||
                    viewMode === "gantt" ||
                    viewMode === "workload") &&
                    "text-foreground font-semibold"
                )}
                title="Mais visualizações"
              >
                <span>Mais</span>
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 text-xs">
              {VIEW_OPTIONS.filter((opt) => opt.desktopOnly).map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = viewMode === opt.id;
                return (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => onViewModeChange(opt.id)}
                    className={cn(
                      "flex items-center justify-between cursor-pointer",
                      isSelected && "font-semibold text-primary"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <IconComponent className="size-3.5 text-muted-foreground" />
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badge de Filtro Ativo com botão Limpar */}
        {isFiltered && onClearFilters && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/60 border border-border text-xs text-muted-foreground">
            <span>Filtros ativos</span>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer ml-1"
              title="Limpar todos os filtros"
            >
              <X className="size-3" />
              <span>Limpar</span>
            </button>
          </div>
        )}
      </div>

      {/* Lado Direito: Ação Rápida de Adicionar Tarefa */}
      {canCreate && onOpenNewTask && (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={onOpenNewTask}
            className="h-8 px-3 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            title="Criar nova tarefa no projeto"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Nova Tarefa</span>
          </Button>
        </div>
      )}
    </div>
  );
}
