"use client";

import React from "react";
import type {
  AppModuleSection,
  ViewMode,
  TaskFilter,
  TaskStatus,
  TaskPriority,
} from "@/types/task";
import {
  Filter,
  Kanban,
  Table as TableIcon,
  Plus,
  Search,
  SlidersHorizontal,
  RotateCcw,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  currentManagementName?: string;
  currentProjectName?: string;
  activeModule: AppModuleSection;
  onModuleChange: (module: AppModuleSection) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  onOpenNewTaskModal: () => void;
  onOpenCrmModal: () => void;
  isConnectedCrm: boolean;
  totalTasks: number;
}

export function AppHeader({
  isSidebarOpen,
  onToggleSidebar,
  currentManagementName,
  currentProjectName,
  activeModule,
  onModuleChange,
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  onOpenNewTaskModal,
  onOpenCrmModal,
  isConnectedCrm,
  totalTasks,
}: AppHeaderProps) {
  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.status !== "Todos" ||
    filters.priority !== "Todas";

  function clearAllFilters() {
    onFilterChange({
      search: "",
      status: "Todos",
      priority: "Todas",
    });
  }

  return (
    <header className="planw-app-header h-11 px-3 border-b border-border bg-background/95 backdrop-blur-xs flex items-center justify-between select-none text-xs shrink-0 z-10 text-foreground">
      {/* Lado Esquerdo: Botão de Alternar Sidebar + Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Recolher barra lateral (Ctrl+B)" : "Expandir barra lateral (Ctrl+B)"}
          title={isSidebarOpen ? "Recolher barra lateral (Ctrl+B)" : "Expandir barra lateral (Ctrl+B)"}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>

        {/* Breadcrumb de Gestão e Projeto Ativo */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-1 max-w-[320px] truncate">
          <span
            className="font-medium text-foreground truncate cursor-default"
            title={currentManagementName || "Todas as Gestões"}
          >
            {currentManagementName || "Todas as Gestões"}
          </span>
          <span className="text-muted-foreground/50">/</span>
          <span
            className="truncate cursor-default"
            title={currentProjectName || "Todos os Projetos"}
          >
            {currentProjectName || "Todos os Projetos"}
          </span>
        </div>
      </div>

      {/* Lado Direito: Busca + Filtro + Exibição + Status CRM + Nova Tarefa */}
      <div className="flex items-center gap-1.5">
        {/* Campo de Busca Rápida */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value })
            }
            placeholder="Buscar..."
            className="h-7 w-28 sm:w-36 md:w-44 pl-7 pr-2 text-xs bg-muted/40 border-border rounded-md text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Filtro Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 h-7 px-2 rounded-md text-xs transition-colors cursor-pointer border",
                hasActiveFilters
                  ? "bg-secondary text-foreground border-primary/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-transparent"
              )}
              title="Filtrar tarefas"
              aria-label="Abrir filtros de tarefas"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtro</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-popover border-border text-popover-foreground"
          >
            <DropdownMenuLabel className="text-xs font-medium">
              Status
            </DropdownMenuLabel>
            {(
              [
                "Todos",
                "A Fazer",
                "Em Andamento",
                "Em Revisão",
                "Concluído",
              ] as const
            ).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    status: s as TaskStatus | "Todos",
                  })
                }
                className={cn(
                  "text-xs cursor-pointer",
                  filters.status === s &&
                    "bg-secondary text-secondary-foreground font-medium"
                )}
              >
                {s}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="bg-border" />
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Prioridade
            </div>
            {(["Todas", "Baixa", "Média", "Alta", "Urgente"] as const).map(
              (p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      priority: p as TaskPriority | "Todas",
                    })
                  }
                  className={cn(
                    "text-xs cursor-pointer",
                    filters.priority === p &&
                      "bg-secondary text-secondary-foreground font-medium"
                  )}
                >
                  {p}
                </DropdownMenuItem>
              )
            )}

            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={clearAllFilters}
                  className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar filtros</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Display / Exibição Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
              title="Configurações de visualização"
              aria-label="Abrir configurações de exibição"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exibição</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-popover border-border text-popover-foreground"
          >
            <DropdownMenuLabel className="text-xs font-medium">
              Exibição
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => {
                onModuleChange("tasks");
                onViewModeChange("kanban");
              }}
              className={cn(
                "text-xs cursor-pointer",
                activeModule === "tasks" &&
                  viewMode === "kanban" &&
                  "bg-secondary text-secondary-foreground font-medium"
              )}
            >
              <Kanban className="w-3.5 h-3.5 mr-2" />
              <span>Ver como Quadro</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onModuleChange("tasks");
                onViewModeChange("table");
              }}
              className={cn(
                "text-xs cursor-pointer",
                activeModule === "tasks" &&
                  viewMode === "table" &&
                  "bg-secondary text-secondary-foreground font-medium"
              )}
            >
              <TableIcon className="w-3.5 h-3.5 mr-2" />
              <span>Ver como Tabela</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[11px] font-mono text-muted-foreground hidden md:inline ml-0.5">
          {totalTasks}
        </span>

        {/* Botão Nova Tarefa */}
        <Button
          size="sm"
          onClick={onOpenNewTaskModal}
          className="h-7 text-xs bg-primary text-primary-foreground hover:opacity-90 font-medium px-2.5 rounded-md gap-1 shadow-2xs cursor-pointer ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova Tarefa</span>
        </Button>
      </div>
    </header>
  );
}
