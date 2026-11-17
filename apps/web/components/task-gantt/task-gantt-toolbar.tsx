"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  GanttScale,
  GanttGroupBy,
  GanttDisplayFilter,
} from "./task-gantt-types";

interface TaskGanttToolbarProps {
  scale: GanttScale;
  onScaleChange: (scale: GanttScale) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  groupBy: GanttGroupBy;
  onGroupByChange: (groupBy: GanttGroupBy) => void;
  displayFilter: GanttDisplayFilter;
  onDisplayFilterChange: (display: GanttDisplayFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onTodayClick: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  totalVisible: number;
  totalTasks: number;
}

export function TaskGanttToolbar({
  scale,
  onScaleChange,
  zoom,
  onZoomChange,
  groupBy,
  onGroupByChange,
  displayFilter,
  onDisplayFilterChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onTodayClick,
  onNavigate,
  isFocusMode,
  onToggleFocusMode,
  totalVisible,
  totalTasks,
}: TaskGanttToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const zoomPercent = Math.round(zoom * 100);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== "all" ||
      displayFilter !== "all" ||
      groupBy !== "hierarchy"
  );

  const handleResetFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
    onDisplayFilterChange("all");
    onGroupByChange("hierarchy");
  };

  const displayFilterLabels: Record<GanttDisplayFilter, string> = {
    all: "Tarefas e Itens",
    "tasks-only": "Apenas Tarefas",
    "dated-only": "Com datas",
    "undated-only": "Sem datas",
  };

  const groupByLabels: Record<GanttGroupBy, string> = {
    hierarchy: "Etapa / Hierarquia",
    status: "Status",
    assignee: "Responsável",
    none: "Sem agrupamento",
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 bg-card/60 px-3 py-2 text-xs backdrop-blur-xs select-none">
      {/* Lado Esquerdo: Filtros, Agrupamento, Exibição e Navegação */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtros Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-2.5 text-xs font-normal border-border/60 hover:bg-accent/60",
                hasActiveFilters && "border-primary/50 text-primary bg-primary/5 font-medium"
              )}
            >
              <Filter className="size-3.5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="flex size-1.5 rounded-full bg-primary" />
              )}
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Filtros do Gantt</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Busca por texto */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefa..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-muted/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Filtro por Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Status</label>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {[
                  { id: "all", label: "Todos" },
                  { id: "FAZENDO AGORA", label: "Fazendo" },
                  { id: "PENDENTE", label: "Pendente" },
                  { id: "AGUARDANDO FEEDBACK", label: "Feedback" },
                  { id: "CONCLUÍDO", label: "Concluído" },
                  { id: "BLOQUEADO", label: "Bloqueado" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onStatusFilterChange(st.id)}
                    className={cn(
                      "px-2 py-1 rounded border text-left cursor-pointer transition-colors truncate",
                      statusFilter === st.id
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border/50 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Agrupar por */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-normal border-border/60 hover:bg-accent/60"
            >
              <Layers className="size-3.5 text-muted-foreground" />
              <span>Agrupar por: {groupByLabels[groupBy].split(" ")[0]}</span>
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs">Critério de agrupamento</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={groupBy}
              onValueChange={(val) => onGroupByChange(val as GanttGroupBy)}
            >
              <DropdownMenuRadioItem value="hierarchy" className="text-xs">
                Etapa / Hierarquia (Padrão)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status" className="text-xs">
                Status da Tarefa
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="assignee" className="text-xs">
                Responsável
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="none" className="text-xs">
                Sem Agrupamento (Cronológico)
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Exibir */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-normal border-border/60 hover:bg-accent/60"
            >
              <Eye className="size-3.5 text-muted-foreground" />
              <span>Exibir: {displayFilterLabels[displayFilter]}</span>
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Filtrar linhas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={displayFilter}
              onValueChange={(val) => onDisplayFilterChange(val as GanttDisplayFilter)}
            >
              <DropdownMenuRadioItem value="all" className="text-xs">
                Tarefas e Itens
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="tasks-only" className="text-xs">
                Apenas Tarefas
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dated-only" className="text-xs">
                Com datas
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="undated-only" className="text-xs">
                Sem datas
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separador vertical */}
        <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

        {/* Botão Hoje e Setas de Navegação */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onTodayClick}
            className="h-8 px-3 text-xs font-medium border-border/60 hover:bg-accent/60"
          >
            Hoje
          </Button>

          <div className="flex items-center rounded-md border border-border/60 bg-muted/20">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("prev")}
              title="Período anterior"
              className="h-8 w-7 rounded-none rounded-l-md hover:bg-accent/60"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <div className="h-3.5 w-px bg-border/60" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("next")}
              title="Próximo período"
              className="h-8 w-7 rounded-none rounded-r-md hover:bg-accent/60"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <span className="text-[11px] text-muted-foreground font-mono ml-2 hidden lg:inline">
            {totalVisible} de {totalTasks} itens
          </span>
        </div>
      </div>

      {/* Lado Direito: Escala (Dia/Semana/Mês), Zoom e Foco */}
      <div className="flex items-center gap-2">
        {/* Segmented Control de Escala */}
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {(["day", "week", "month"] as const).map((sc) => {
            const labels: Record<GanttScale, string> = {
              day: "Dia",
              week: "Semana",
              month: "Mês",
            };
            const isActive = scale === sc;
            return (
              <button
                key={sc}
                type="button"
                onClick={() => onScaleChange(sc)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                {labels[sc]}
              </button>
            );
          })}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center rounded-md border border-border/60 bg-muted/20 px-1 py-0.5">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.7, zoom - 0.15))}
            disabled={zoom <= 0.7}
            title="Reduzir zoom"
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <Minus className="size-3" />
          </button>
          <span className="w-10 text-center font-mono text-[11px] text-muted-foreground select-none">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(1.5, zoom + 0.15))}
            disabled={zoom >= 1.5}
            title="Aumentar zoom"
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <Plus className="size-3" />
          </button>
        </div>

        {/* Foco / Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFocusMode}
          title={isFocusMode ? "Sair do modo foco" : "Expandir modo foco"}
          className="h-8 w-8 border border-border/60 hover:bg-accent/60"
        >
          {isFocusMode ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
