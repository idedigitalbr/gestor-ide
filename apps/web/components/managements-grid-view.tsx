"use client";

import React, { useMemo, useState } from "react";
import type { CrmProjectManagement } from "@gestor-ide/core";
import {
  Folder,
  Users,
  ArrowRight,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Check,
  ChevronDown,
  X,
  RotateCcw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/entity-card";
import {
  stripManagementPrefix,
  MANAGEMENT_VISIBILITY_LABELS,
  type ListDisplayMode,
} from "@/lib/list-view-options";
import {
  KanbanGhostCard,
  useFlipGrid,
  CardInsertSeparator,
  useDwellGhost,
} from "@/components/kanban-ghost-card";
import {
  type ManagementSortOption,
  MANAGEMENT_SORT_LABELS,
  type ManagementFilters,
  DEFAULT_MANAGEMENT_FILTERS,
  type ManagementGroupBy,
  MANAGEMENT_GROUP_LABELS,
  filterManagements,
  sortManagements,
  countActiveManagementFilters,
  extractManagementTags,
} from "@/lib/organization-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ManagementsGridViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  visibilityFilter: string;
  onVisibilityFilterChange: (value: string) => void;
  viewMode: ListDisplayMode;
  onViewModeChange?: (mode: ListDisplayMode) => void;
  cardColumns?: 3 | 4 | 5;
  onCardColumnsChange?: (cols: 3 | 4 | 5) => void;
  sortOption?: ManagementSortOption;
  onSortOptionChange?: (sort: ManagementSortOption) => void;
  filters?: ManagementFilters;
  onFiltersChange?: (filters: ManagementFilters) => void;
  groupBy?: ManagementGroupBy;
  onGroupByChange?: (groupBy: ManagementGroupBy) => void;
  managements: CrmProjectManagement[];
  onSelectManagement: (managementId: string) => void;
  canWrite?: boolean;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onCreateManagement?: () => void;
  onUpdateManagement?: (
    managementId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      coverPath?: string | null;
      visibility?: string;
      status?: string;
    }
  ) => Promise<void>;
  onDeleteManagement?: (managementId: string) => Promise<void>;
  onLeaveManagement?: (managementId: string) => Promise<void>;
  onOpenMembers?: (management: CrmProjectManagement) => void;
  onResetSettings?: () => void;
}

const STATUS_SECTION_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativas", color: "bg-emerald-500" },
  in_progress: { label: "Fazendo agora", color: "bg-sky-500" },
  paused: { label: "Pausadas", color: "bg-amber-500" },
  completed: { label: "Concluídas", color: "bg-purple-500" },
  archived: { label: "Arquivadas", color: "bg-muted-foreground" },
};

const VISIBILITY_SECTION_LABELS: Record<string, string> = {
  company: "Empresa",
  team: "Equipe",
  unit: "Unidade",
  private: "Privada",
};

export function ManagementsGridView({
  search,
  onSearchChange,
  visibilityFilter,
  onVisibilityFilterChange,
  viewMode,
  onViewModeChange,
  cardColumns = 4,
  onCardColumnsChange,
  sortOption = "none",
  onSortOptionChange,
  filters,
  onFiltersChange,
  groupBy = "none",
  onGroupByChange,
  managements,
  onSelectManagement,
  canWrite = true,
  canManageMembers = true,
  currentUserId,
  onCreateManagement,
  onUpdateManagement,
  onDeleteManagement,
  onLeaveManagement,
  onOpenMembers,
  onResetSettings,
}: ManagementsGridViewProps) {
  const gridContainerRef = React.useRef<HTMLDivElement>(null);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Hook com dwell time (2s) para expandir o skeleton grande entre cards ao pousar o mouse,
  // abertura imediata ao clicar no +, e auto-close de 4s com pausa no hover e barra regressiva
  const {
    expandedIndex,
    startDwell,
    cancelDwell,
    openImmediate,
    pauseAutoClose,
    resumeAutoClose,
    closeExpanded,
    isPaused,
    autoCloseTimeMs,
  } = useDwellGhost({ dwellTimeMs: 2000, autoCloseTimeMs: 4000 });

  // Animação FLIP suave para empurrar os cards existentes
  useFlipGrid(gridContainerRef, expandedIndex, 360);

  // Filtros efetivos combinando prop filters com fallback em visibilityFilter
  const effectiveFilters = useMemo<ManagementFilters>(() => {
    if (filters) return filters;
    return {
      ...DEFAULT_MANAGEMENT_FILTERS,
      visibility: visibilityFilter || "all",
    };
  }, [filters, visibilityFilter]);

  // Lista filtrada e ordenada
  const filteredManagements = useMemo(() => {
    return filterManagements(managements, effectiveFilters, search);
  }, [managements, effectiveFilters, search]);

  const sortedManagements = useMemo(() => {
    return sortManagements(filteredManagements, sortOption);
  }, [filteredManagements, sortOption]);

  const activeFiltersCount = useMemo(() => {
    return countActiveManagementFilters(effectiveFilters);
  }, [effectiveFilters]);

  const availableTags = useMemo(() => {
    return extractManagementTags(managements);
  }, [managements]);

  // Classes de grid dinâmicas baseadas em cardColumns
  const gridColsClass = useMemo(() => {
    if (cardColumns === 3) {
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    }
    if (cardColumns === 5) {
      return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";
    }
    return "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
  }, [cardColumns]);

  // Agrupamento dos cards
  const groupedSections = useMemo(() => {
    if (groupBy === "none") return null;

    if (groupBy === "status") {
      const order = ["active", "in_progress", "paused", "completed", "archived"];
      const groups: { key: string; label: string; color: string; items: CrmProjectManagement[] }[] = [];

      for (const st of order) {
        const items = sortedManagements.filter((m) => {
          const s = (m.status || "active").toLowerCase();
          return s === st;
        });
        if (items.length > 0) {
          const meta = STATUS_SECTION_LABELS[st] || { label: st, color: "bg-primary" };
          groups.push({ key: st, label: meta.label, color: meta.color, items });
        }
      }

      // Itens com outro status
      const otherItems = sortedManagements.filter((m) => {
        const s = (m.status || "active").toLowerCase();
        return !order.includes(s);
      });
      if (otherItems.length > 0) {
        groups.push({ key: "other", label: "Outros", color: "bg-muted-foreground", items: otherItems });
      }

      return groups;
    }

    if (groupBy === "visibility") {
      const order = ["company", "team", "unit", "private"];
      const groups: { key: string; label: string; color: string; items: CrmProjectManagement[] }[] = [];

      for (const vis of order) {
        const items = sortedManagements.filter((m) => (m.visibility || "company") === vis);
        if (items.length > 0) {
          groups.push({
            key: vis,
            label: VISIBILITY_SECTION_LABELS[vis] || vis,
            color: "bg-primary",
            items,
          });
        }
      }

      return groups;
    }

    return null;
  }, [sortedManagements, groupBy]);

  const hasActiveControls =
    sortOption !== "none" ||
    activeFiltersCount > 0 ||
    Boolean(search.trim()) ||
    groupBy !== "none";

  const handleClearAll = () => {
    onSearchChange("");
    onVisibilityFilterChange("all");
    onSortOptionChange?.("none");
    onFiltersChange?.(DEFAULT_MANAGEMENT_FILTERS);
    onGroupByChange?.("none");
    onResetSettings?.();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ================================================================= */}
      {/* BARRA DE FERRAMENTAS CLICKUP/NOTION: Ordenar, Filtros, Agrupar    */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs">
        {/* Lado Esquerdo: Controles Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 1. Botão Ordenar */}
          {onSortOptionChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 gap-1.5 text-xs rounded-lg cursor-pointer transition-colors border-border/70",
                    sortOption !== "none" && "bg-accent font-semibold text-primary border-primary/40"
                  )}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[140px]">
                    {sortOption !== "none" ? MANAGEMENT_SORT_LABELS[sortOption] : "Ordenar"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Organizar gestões por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(MANAGEMENT_SORT_LABELS) as [ManagementSortOption, string][]).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onSortOptionChange(key)}
                    className={cn(
                      "flex items-center justify-between text-xs cursor-pointer",
                      sortOption === key && "font-semibold text-primary"
                    )}
                  >
                    <span>{label}</span>
                    {sortOption === key && <Check className="w-3.5 h-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 2. Botão Filtros */}
          {onFiltersChange && (
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 gap-1.5 text-xs rounded-lg cursor-pointer transition-colors border-border/70",
                    activeFiltersCount > 0 && "bg-accent font-semibold text-primary border-primary/40"
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 sm:w-80 rounded-xl p-3 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Filtros de gestões</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onFiltersChange(DEFAULT_MANAGEMENT_FILTERS);
                        onVisibilityFilterChange("all");
                      }}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {/* Visibilidade */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Visibilidade
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "all", label: "Todas" },
                        { value: "company", label: "Empresa" },
                        { value: "unit", label: "Unidade" },
                        { value: "team", label: "Equipe" },
                        { value: "private", label: "Privada" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onFiltersChange({
                              ...effectiveFilters,
                              visibility: opt.value,
                            });
                            onVisibilityFilterChange(opt.value);
                          }}
                          className={cn(
                            "px-2 py-1 text-left rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.visibility === opt.value &&
                              "bg-accent font-semibold border-primary/50 text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "all", label: "Todos" },
                        { value: "active", label: "Ativa" },
                        { value: "in_progress", label: "Fazendo agora" },
                        { value: "paused", label: "Pausada" },
                        { value: "completed", label: "Concluída" },
                        { value: "archived", label: "Arquivada" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              status: opt.value,
                            })
                          }
                          className={cn(
                            "px-2 py-1 text-left rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.status === opt.value &&
                              "bg-accent font-semibold border-primary/50 text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Período de criação */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Data de criação
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "all", label: "Qualquer data" },
                        { value: "today", label: "Criada hoje" },
                        { value: "week", label: "Esta semana" },
                        { value: "month", label: "Este mês" },
                        { value: "year", label: "Este ano" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              dateRange: opt.value,
                            })
                          }
                          className={cn(
                            "px-2 py-1 text-left rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.dateRange === opt.value &&
                              "bg-accent font-semibold border-primary/50 text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Escopo de Projetos */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Projetos vinculados
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { value: "all", label: "Todas" },
                        { value: "with_projects", label: "Com proj." },
                        { value: "without_projects", label: "Sem proj." },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              hasProjects: opt.value,
                            })
                          }
                          className={cn(
                            "px-2 py-1 text-center rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.hasProjects === opt.value &&
                              "bg-accent font-semibold border-primary/50 text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  {availableTags.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Tags / Categorias
                      </label>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              tag: "all",
                            })
                          }
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.tag === "all" &&
                              "bg-primary text-primary-foreground font-semibold border-primary"
                          )}
                        >
                          Todas
                        </button>
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              onFiltersChange({
                                ...effectiveFilters,
                                tag: effectiveFilters.tag === tag ? "all" : tag,
                              })
                            }
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[11px] border border-border/60 hover:bg-accent transition-colors",
                              effectiveFilters.tag === tag &&
                                "bg-primary text-primary-foreground font-semibold border-primary"
                            )}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* 3. Botão Agrupar */}
          {onGroupByChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-2.5 gap-1.5 text-xs rounded-lg cursor-pointer transition-colors border-border/70",
                    groupBy !== "none" && "bg-accent font-semibold text-primary border-primary/40"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{groupBy !== "none" ? MANAGEMENT_GROUP_LABELS[groupBy] : "Agrupar"}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Agrupar gestões por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(MANAGEMENT_GROUP_LABELS) as [ManagementGroupBy, string][]).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onGroupByChange(key)}
                    className={cn(
                      "flex items-center justify-between text-xs cursor-pointer",
                      groupBy === key && "font-semibold text-primary"
                    )}
                  >
                    <span>{label}</span>
                    {groupBy === key && <Check className="w-3.5 h-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Lado Direito: Layout e Colunas */}
        <div className="flex items-center gap-1.5">
          {/* Colunas na Grade (quando em modo cards) */}
          {viewMode === "cards" && onCardColumnsChange && (
            <div className="hidden sm:flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40">
              {([3, 4, 5] as const).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onCardColumnsChange(col)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer",
                    cardColumns === col
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={`Exibir em ${col} colunas`}
                >
                  {col}
                </button>
              ))}
            </div>
          )}

          {/* Alternador Cards vs Lista */}
          {onViewModeChange && (
            <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => onViewModeChange("cards")}
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  viewMode === "cards"
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Visualização em Cards"
                aria-label="Visualização em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={cn(
                  "p-1.5 rounded transition-colors cursor-pointer",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Visualização em Lista"
                aria-label="Visualização em Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* BADGES DE FILTROS E ORDENAÇÃO ATIVOS                              */}
      {/* ================================================================= */}
      {hasActiveControls && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
          <span className="text-[11px] text-muted-foreground">Filtros ativos:</span>

          {sortOption !== "none" && (
            <button
              type="button"
              onClick={() => onSortOptionChange?.("none")}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <span>Ordenar: {MANAGEMENT_SORT_LABELS[sortOption]}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.visibility !== "all" && (
            <button
              type="button"
              onClick={() => {
                onFiltersChange?.({ ...effectiveFilters, visibility: "all" });
                onVisibilityFilterChange("all");
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Visibilidade: {MANAGEMENT_VISIBILITY_LABELS[effectiveFilters.visibility] || effectiveFilters.visibility}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.status !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, status: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Status: {effectiveFilters.status}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.dateRange !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, dateRange: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Data: {effectiveFilters.dateRange}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.hasProjects !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, hasProjects: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>{effectiveFilters.hasProjects === "with_projects" ? "Com projetos" : "Sem projetos"}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.tag !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, tag: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Tag: #{effectiveFilters.tag}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {groupBy !== "none" && (
            <button
              type="button"
              onClick={() => onGroupByChange?.("none")}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span>Agrupamento: {MANAGEMENT_GROUP_LABELS[groupBy]}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-destructive hover:underline ml-1 cursor-pointer font-medium"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* GRID OU LISTA DE CARDS                                            */}
      {/* ================================================================= */}
      {sortedManagements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Nenhuma gestão encontrada
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Nenhum resultado corresponde à sua pesquisa ou filtros ativos.
          </p>
          {hasActiveControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar filtros e busca
            </Button>
          )}
        </div>
      ) : groupedSections ? (
        /* Visualização com Agrupamento Ativo */
        <div className="space-y-6">
          {groupedSections.map((group) => (
            <div key={group.key} className="space-y-3">
              {/* Cabeçalho da Seção */}
              <div className="flex items-center gap-2 border-b border-border/60 pb-1.5">
                <span className={cn("w-2 h-2 rounded-full", group.color)} />
                <h4 className="text-xs font-bold text-foreground">{group.label}</h4>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted font-mono text-muted-foreground">
                  {group.items.length}
                </span>
              </div>

              {viewMode === "cards" ? (
                <div className={gridColsClass}>
                  {group.items.map((mgmt) => {
                    const projectCount = mgmt._count?.projects ?? 0;
                    const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);

                    return (
                      <div key={mgmt.id} className="relative group/card">
                        <EntityCard
                          type="management"
                          id={mgmt.id}
                          name={mgmt.name}
                          description={mgmt.description}
                          code={mgmt.code}
                          color={mgmt.color}
                          coverPath={mgmt.coverPath}
                          status={mgmt.status}
                          visibility={mgmt.visibility}
                          createdAt={mgmt.createdAt}
                          projectCount={projectCount}
                          memberCount={memberCount}
                          members={mgmt.members}
                          onSelect={() => onSelectManagement(mgmt.id)}
                          canWrite={canWrite}
                          canManageMembers={canManageMembers}
                          currentUserId={currentUserId}
                          onUpdate={
                            onUpdateManagement
                              ? (updates) => onUpdateManagement(mgmt.id, updates)
                              : undefined
                          }
                          onDelete={
                            onDeleteManagement
                              ? () => onDeleteManagement(mgmt.id)
                              : undefined
                          }
                          onLeave={
                            onLeaveManagement
                              ? () => onLeaveManagement(mgmt.id)
                              : undefined
                          }
                          onManageMembers={onOpenMembers ? () => onOpenMembers(mgmt) : undefined}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Lista compacta dentro do grupo */
                <div className="divide-y divide-border rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
                  {group.items.map((mgmt) => {
                    const projectCount = mgmt._count?.projects ?? 0;
                    const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
                    const displayName = stripManagementPrefix(mgmt.name);
                    const initials = mgmt.name.trim().slice(0, 2).toUpperCase() || "GE";
                    const bgColor = mgmt.color || "var(--primary)";

                    return (
                      <div
                        key={mgmt.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectManagement(mgmt.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectManagement(mgmt.id);
                          }
                        }}
                        className="group flex items-center justify-between p-3 sm:p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: bgColor }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                {displayName}
                              </span>
                            </div>
                            {mgmt.description?.trim() && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                                {mgmt.description.trim()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-3">
                          <span className="flex items-center gap-1">
                            <Folder className="w-3.5 h-3.5" />
                            <span>{projectCount}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{memberCount}</span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : viewMode === "cards" ? (
        /* Visualização Padrão em Cards sem Agrupamento */
        <div ref={gridContainerRef} className="relative">
          <div className={gridColsClass}>
            {/* Se o skeleton grande foi expandido na posição 0 */}
            {expandedIndex === 0 && canWrite && onCreateManagement && (
              <div
                data-flip-id="__ghost_0__"
                onMouseEnter={pauseAutoClose}
                onMouseLeave={resumeAutoClose}
                className="animate-in fade-in zoom-in-95 slide-in-from-left-6 duration-300"
              >
                <KanbanGhostCard
                  label="Novo"
                  sublabel="Criar no início"
                  variant="entity"
                  slideDirection="left"
                  autoCloseMs={autoCloseTimeMs}
                  isPaused={isPaused}
                  onClick={() => {
                    closeExpanded();
                    onCreateManagement();
                  }}
                  isVisible={true}
                  onMouseEnter={pauseAutoClose}
                  onMouseLeave={resumeAutoClose}
                />
              </div>
            )}

            {sortedManagements.map((mgmt, index) => {
              const projectCount = mgmt._count?.projects ?? 0;
              const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
              const isFirst = index === 0;

              return (
                <React.Fragment key={mgmt.id}>
                  <div data-flip-id={mgmt.id} className="relative group/card">
                    {/* Botãozinho + e linha vertical no lado esquerdo do primeiro card */}
                    {isFirst && canWrite && onCreateManagement && (
                      <CardInsertSeparator
                        side="left"
                        title="Criar gestão antes deste card"
                        onHoverStart={() => startDwell(0)}
                        onHoverEnd={cancelDwell}
                        onClick={() => openImmediate(0)}
                      />
                    )}

                    {/* Botãozinho + e linha vertical no lado direito de cada card */}
                    {canWrite && onCreateManagement && (
                      <CardInsertSeparator
                        side="right"
                        title="Criar gestão entre os cards"
                        onHoverStart={() => startDwell(index + 1)}
                        onHoverEnd={cancelDwell}
                        onClick={() => openImmediate(index + 1)}
                      />
                    )}

                    <EntityCard
                      type="management"
                      id={mgmt.id}
                      name={mgmt.name}
                      description={mgmt.description}
                      code={mgmt.code}
                      color={mgmt.color}
                      coverPath={mgmt.coverPath}
                      status={mgmt.status}
                      visibility={mgmt.visibility}
                      createdAt={mgmt.createdAt}
                      projectCount={projectCount}
                      memberCount={memberCount}
                      members={mgmt.members}
                      onSelect={() => onSelectManagement(mgmt.id)}
                      canWrite={canWrite}
                      canManageMembers={canManageMembers}
                      currentUserId={currentUserId}
                      onUpdate={
                        onUpdateManagement
                          ? (updates) => onUpdateManagement(mgmt.id, updates)
                          : undefined
                      }
                      onDelete={
                        onDeleteManagement
                          ? () => onDeleteManagement(mgmt.id)
                          : undefined
                      }
                      onLeave={
                        onLeaveManagement
                          ? () => onLeaveManagement(mgmt.id)
                          : undefined
                      }
                      onManageMembers={onOpenMembers ? () => onOpenMembers(mgmt) : undefined}
                    />
                  </div>

                  {/* Se o skeleton grande foi expandido nesta posição intermediária */}
                  {expandedIndex === index + 1 && canWrite && onCreateManagement && (
                    <div
                      data-flip-id={`__ghost_${index + 1}__`}
                      onMouseEnter={pauseAutoClose}
                      onMouseLeave={resumeAutoClose}
                      className="animate-in fade-in zoom-in-95 slide-in-from-right-6 duration-300"
                    >
                      <KanbanGhostCard
                        label="Novo"
                        sublabel="Criar nova gestão"
                        variant="entity"
                        slideDirection="right"
                        autoCloseMs={autoCloseTimeMs}
                        isPaused={isPaused}
                        onClick={() => {
                          closeExpanded();
                          onCreateManagement();
                        }}
                        isVisible={true}
                        onMouseEnter={pauseAutoClose}
                        onMouseLeave={resumeAutoClose}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Slot fantasma sutil para hover no final */}
            {expandedIndex === null && canWrite && onCreateManagement && (
              <div
                onClick={onCreateManagement}
                onMouseEnter={() => startDwell(sortedManagements.length)}
                onMouseLeave={cancelDwell}
                className="min-h-[190px] h-full rounded-xl border border-dashed border-border/30 hover:border-border/60 hover:bg-card/30 transition-all duration-200 flex items-center justify-center cursor-pointer group/ghostslot opacity-40 hover:opacity-100 select-none"
              >
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60 group-hover/ghostslot:text-foreground transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center group-hover/ghostslot:bg-primary group-hover/ghostslot:text-primary-foreground group-hover/ghostslot:border-primary transition-all duration-200 group-hover/ghostslot:scale-105 shadow-2xs">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-semibold">Novo</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lista Compacta sem Agrupamento */
        <div className="divide-y divide-border rounded-xl border border-border/80 bg-card shadow-md overflow-hidden">
          {sortedManagements.map((mgmt) => {
            const projectCount = mgmt._count?.projects ?? 0;
            const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
            const displayName = stripManagementPrefix(mgmt.name);
            const initials = mgmt.name.trim().slice(0, 2).toUpperCase() || "GE";
            const bgColor = mgmt.color || "var(--primary)";

            return (
              <div
                key={mgmt.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectManagement(mgmt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectManagement(mgmt.id);
                  }
                }}
                className="group flex items-center justify-between p-3 sm:p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: bgColor }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                        Gestão
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </span>
                    </div>
                    {mgmt.description?.trim() && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                        {mgmt.description.trim()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-3">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5" />
                    <span>{projectCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{memberCount}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
