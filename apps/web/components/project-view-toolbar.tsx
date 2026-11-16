"use client";

import React, { useState } from "react";
import type { ViewMode } from "@gestor-ide/core";
import type { Task, TaskFilter } from "@/types/task";
import type { SubtaskDisplayMode } from "@/components/app-header";
import {
  TASK_SORT_LABELS,
  type TaskSortOption,
} from "@/lib/organization-options";
import {
  Table,
  Kanban,
  Calendar,
  GanttChart,
  Users,
  ChevronDown,
  Check,
  ArrowUpDown,
  Zap,
  Wand2,
  Search,
  SlidersHorizontal,
  X,
  Columns3,
  RotateCcw,
  Clock,
  Download,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { TaskFilterMenu } from "@/components/task-table/task-filter-menu";
import { cn } from "@/lib/utils";

export interface ProjectViewToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalTasks: number;
  tasks?: Task[];
  taskSort?: TaskSortOption;
  onTaskSortChange?: (sort: TaskSortOption) => void;
  filters?: TaskFilter;
  onFilterChange?: (filters: TaskFilter) => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  subtaskMode?: SubtaskDisplayMode;
  onSubtaskModeChange?: (mode: SubtaskDisplayMode) => void;
  showClosedTasks?: boolean;
  onToggleShowClosedTasks?: (show: boolean) => void;
  onOpenFieldsModal?: () => void;
  onRefreshSync?: () => void;
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
  { id: "gantt", label: "Gantt", icon: GanttChart, desktopOnly: true },
  { id: "workload", label: "Carga de Trabalho", icon: Users, desktopOnly: true },
];

export function ProjectViewToolbar({
  viewMode,
  onViewModeChange,
  totalTasks,
  tasks = [],
  taskSort = "none",
  onTaskSortChange,
  filters,
  onFilterChange,
  isFiltered = false,
  onClearFilters,
  searchQuery = "",
  onSearchChange,
  subtaskMode = "collapsed",
  onSubtaskModeChange,
  showClosedTasks = true,
  onToggleShowClosedTasks,
  onOpenFieldsModal,
  onRefreshSync,
  className,
}: ProjectViewToolbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const [isAiPopoverOpen, setIsAiPopoverOpen] = useState(false);

  const isSortActive = taskSort && taskSort !== "none";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 select-none w-full",
        className
      )}
    >
      {/* ========================================================================= */}
      {/* LADO ESQUERDO: Abas de Visualização (Tabela, Kanban, Calendário, Gantt)   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          role="tablist"
          aria-label="Modo de visualização das tarefas"
          className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40 shadow-2xs"
        >
          {/* 1. Tabela */}
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
              <span className="text-[10px] font-mono opacity-80 ml-0.5">
                ({totalTasks})
              </span>
            )}
          </button>

          {/* 2. Kanban */}
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
              <span className="text-[10px] font-mono opacity-80 ml-0.5">
                ({totalTasks})
              </span>
            )}
          </button>

          {/* 3. Calendário */}
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

          {/* 4. Gantt */}
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
            <GanttChart className="size-3.5" />
            <span>Gantt</span>
          </button>

          {/* Dropdown "Mais" para telas compactas */}
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

        {/* Chip discreto de filtro ativo para limpar */}
        {isFiltered && onClearFilters && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/60 border border-border text-[11px] text-muted-foreground">
            <span>Filtrado</span>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline cursor-pointer ml-0.5"
              title="Limpar todos os filtros"
            >
              <X className="size-2.5" />
              <span>Limpar</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LADO DIREITO: Pílula com os 6 Botões de Ícones (Filtro, Ordenar, Zap, IA) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1">
        {/* Campo de Busca Rápida (Expansível ao clicar no ícone de lupa) */}
        {isSearchOpen && onSearchChange && (
          <div className="flex items-center gap-1 bg-background border border-border/80 rounded-lg px-2 h-7 shadow-2xs animate-in fade-in zoom-in-95 duration-100">
            <Search className="size-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar no projeto..."
              autoFocus
              className="w-28 sm:w-40 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                setIsSearchOpen(false);
              }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Fechar busca"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        {/* Pílula com os 6 ícones */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5 shadow-2xs">
          {/* 1. FILTRO (ListFilter) */}
          <TaskFilterMenu
            filters={
              filters || {
                search: "",
                status: "Todos",
                priority: "Todas",
              }
            }
            onFilterChange={onFilterChange || (() => {})}
            tasks={tasks}
            iconOnly
            align="end"
          />

          {/* 2. ORDENAR (ArrowUpDown) */}
          {onTaskSortChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isSortActive && "text-primary bg-primary/10 ring-1 ring-primary/40 font-semibold"
                  )}
                  title={`Ordenar tarefas (${TASK_SORT_LABELS[taskSort] || "Padrão"})`}
                  aria-label="Ordenar tarefas"
                >
                  <ArrowUpDown className="size-3.5" />
                  {isSortActive && (
                    <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  Organizar tarefas por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(TASK_SORT_LABELS) as [TaskSortOption, string][]).map(
                  ([key, label]) => {
                    const isSelected = taskSort === key;
                    return (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => onTaskSortChange(key)}
                        className={cn(
                          "flex items-center justify-between text-xs cursor-pointer",
                          isSelected && "font-semibold text-primary"
                        )}
                      >
                        <span>{label}</span>
                        {isSelected && <Check className="size-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  }
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 3. AÇÕES RÁPIDAS & AUTOMAÇÕES (Zap) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Ações rápidas e automações"
                aria-label="Ações rápidas e automações"
              >
                <Zap className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">
                Ações Rápidas & Automações
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onRefreshSync && (
                <DropdownMenuItem
                  onClick={onRefreshSync}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="size-3.5 text-muted-foreground" />
                  <span>Sincronizar com CRM</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  try {
                    const dataStr =
                      "data:text/json;charset=utf-8," +
                      encodeURIComponent(JSON.stringify(tasks, null, 2));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `tarefas-projeto.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  } catch (e) {
                    console.error("Erro ao exportar:", e);
                  }
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Download className="size-3.5 text-muted-foreground" />
                <span>Exportar tarefas (JSON)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onRefreshSync}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Clock className="size-3.5 text-muted-foreground" />
                <span>Recalcular prazos e progresso</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 4. PILOTO IA (Wand2) */}
          <Popover open={isAiPopoverOpen} onOpenChange={setIsAiPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Piloto IA (Assistente Inteligente)"
                aria-label="Piloto IA"
              >
                <Wand2 className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3 shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Piloto IA do Projeto</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-mono font-semibold">
                  Ativo
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Assistente inteligente para sugestões, análise de prazos e otimização de fluxo de trabalho no projeto.
              </p>
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAiPopoverOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
                >
                  <span>Analisar gargalos do Kanban</span>
                  <Sparkles className="size-3 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiPopoverOpen(false)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer text-left"
                >
                  <span>Sugerir próximas prioridades</span>
                  <Sparkles className="size-3 text-muted-foreground" />
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* 5. BUSCA (Search) */}
          {!isSearchOpen && (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                Boolean(searchQuery) && "text-primary bg-primary/10 ring-1 ring-primary/40 font-semibold"
              )}
              title="Buscar tarefas no projeto"
              aria-label="Buscar tarefas"
            >
              <Search className="size-3.5" />
            </button>
          )}

          {/* 6. CONFIGURAÇÕES DA VISUALIZAÇÃO & CAMPOS (SlidersHorizontal) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Configurações da visualização e campos"
                aria-label="Configurações da visualização"
              >
                <SlidersHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">
                Configurações da Visualização
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Campos da Tabela */}
              {onOpenFieldsModal && (
                <DropdownMenuItem
                  onClick={onOpenFieldsModal}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Columns3 className="size-3.5 text-muted-foreground" />
                  <span>Configurar campos visíveis</span>
                </DropdownMenuItem>
              )}

              {/* Subtarefas */}
              {onSubtaskModeChange && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    Subtarefas
                  </DropdownMenuLabel>
                  {(
                    [
                      ["collapsed", "Colapsadas"],
                      ["expanded", "Expandidas"],
                      ["separate", "Separar"],
                    ] as const
                  ).map(([mode, label]) => (
                    <DropdownMenuItem
                      key={mode}
                      onClick={() => onSubtaskModeChange(mode)}
                      className={cn(
                        "flex items-center justify-between text-xs cursor-pointer",
                        subtaskMode === mode && "font-semibold text-primary"
                      )}
                    >
                      <span>{label}</span>
                      {subtaskMode === mode && <Check className="size-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {/* Tarefas Concluídas */}
              {onToggleShowClosedTasks && (
                <>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-muted-foreground" />
                      <span>Tarefas concluídas</span>
                    </div>
                    <Switch
                      checked={showClosedTasks}
                      onCheckedChange={onToggleShowClosedTasks}
                    />
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
