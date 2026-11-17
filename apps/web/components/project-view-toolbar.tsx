"use client";

import React, { useState } from "react";
import type { ViewMode, CustomProjectView } from "@gestor-ide/core";
import { renderCustomViewIcon } from "@/components/custom-views/icon-picker";
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
  Workflow,
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
  CheckCircle2,
  Plus,
  Folder,
  Pencil,
  Trash2,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
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
  customViews?: CustomProjectView[];
  activeCustomViewId?: string | null;
  onSelectCustomView?: (view: CustomProjectView | null) => void;
  onOpenCreateCustomView?: () => void;
  onEditCustomView?: (view: CustomProjectView) => void;
  onDeleteCustomView?: (view: CustomProjectView) => void;
  onReorderCustomViews?: (views: CustomProjectView[]) => void;
  canWrite?: boolean;
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
  { id: "canvas", label: "Canvas", icon: Workflow },
];

export function ProjectViewToolbar({
  viewMode,
  onViewModeChange,
  customViews = [],
  activeCustomViewId = null,
  onSelectCustomView,
  onOpenCreateCustomView,
  onEditCustomView,
  onDeleteCustomView,
  onReorderCustomViews,
  canWrite = true,
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isSortActive = taskSort && taskSort !== "none";

  // Identificar as visualizações predefinidas e personalizadas
  const predefinedGdrive = customViews.find(
    (v) => v.id.includes("gdrive") || v.name === "Arquivos & Documentos"
  );
  const predefinedChatGpt = customViews.find(
    (v) => v.id.includes("chatgpt") || v.name === "IA"
  );
  const customOnlyViews = customViews.filter(
    (v) =>
      v.type === "custom" &&
      !v.id.includes("gdrive") &&
      !v.id.includes("chatgpt")
  );

  function handleSelectNative(mode: ViewMode) {
    onSelectCustomView?.(null);
    onViewModeChange(mode);
  }

  function handlePredefinedClick(v?: CustomProjectView) {
    if (!v) return;
    onSelectCustomView?.(v);
  }

  function handleCustomViewClick(v: CustomProjectView) {
    onSelectCustomView?.(v);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const list = [...customOnlyViews];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(dropIndex, 0, moved);

    const nextFullList = [
      ...(predefinedGdrive ? [predefinedGdrive] : []),
      ...(predefinedChatGpt ? [predefinedChatGpt] : []),
      ...list,
    ].map((item, idx) => ({ ...item, order: idx }));

    setDraggedIndex(null);
    onReorderCustomViews?.(nextFullList);
  }

  function handleMoveView(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= customOnlyViews.length) return;
    const list = [...customOnlyViews];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const nextFullList = [
      ...(predefinedGdrive ? [predefinedGdrive] : []),
      ...(predefinedChatGpt ? [predefinedChatGpt] : []),
      ...list,
    ].map((item, idx) => ({ ...item, order: idx }));

    onReorderCustomViews?.(nextFullList);
  }

  const isNativeActive = (mode: ViewMode) =>
    activeCustomViewId === null && viewMode === mode;

  return (
    <div
      className={cn(
        "relative flex items-center justify-between w-full select-none pt-0.5",
        className
      )}
    >
      {/* ========================================================================= */}
      {/* 1. LINHA HORIZONTAL ESQUERDA (Conecta a lateral esquerda às abas centrais) */}
      {/* ========================================================================= */}
      <div className="flex-1 h-px bg-border/40 min-w-2 sm:min-w-4" />

      {/* ========================================================================= */}
      {/* 2. PÍLULA CENTRAL: Abas de Visualização (Nativas + Predefinidas + Custom + +) */}
      {/* ========================================================================= */}
      <div
        role="tablist"
        aria-label="Modo de visualização das tarefas"
        className="mx-1 sm:mx-3 flex items-center rounded-xl border border-border/70 bg-card/60 p-0.5 shadow-2xs backdrop-blur-xs shrink-0 max-w-[calc(100vw-120px)] sm:max-w-[70vw] overflow-x-auto no-scrollbar scroll-smooth"
      >
        {/* 1. Tabela */}
        <button
          type="button"
          role="tab"
          aria-selected={isNativeActive("table")}
          onClick={() => handleSelectNative("table")}
          className={cn(
            "group/table flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isNativeActive("table")
              ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          )}
          title="Visualização em Tabela"
        >
          <Table
            className={cn(
              "size-3.5 shrink-0 transition-colors duration-200",
              isNativeActive("table")
                ? "text-foreground"
                : "text-muted-foreground",
              "group-hover/table:text-sky-500 dark:group-hover/table:text-sky-400"
            )}
          />
          <span>Tabela</span>
          {isNativeActive("table") && totalTasks > 0 && (
            <span className="text-[10px] font-mono opacity-80 ml-0.5">
              ({totalTasks})
            </span>
          )}
        </button>

        {/* 2. Kanban */}
        <button
          type="button"
          role="tab"
          aria-selected={isNativeActive("kanban")}
          onClick={() => handleSelectNative("kanban")}
          className={cn(
            "group/kanban flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isNativeActive("kanban")
              ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          )}
          title="Visualização em Quadro Kanban"
        >
          <Kanban
            className={cn(
              "size-3.5 shrink-0 transition-colors duration-200",
              isNativeActive("kanban")
                ? "text-foreground"
                : "text-muted-foreground",
              "group-hover/kanban:text-amber-500 dark:group-hover/kanban:text-amber-400"
            )}
          />
          <span>Kanban</span>
          {isNativeActive("kanban") && totalTasks > 0 && (
            <span className="text-[10px] font-mono opacity-80 ml-0.5">
              ({totalTasks})
            </span>
          )}
        </button>

        {/* 3. Calendário */}
        <button
          type="button"
          role="tab"
          aria-selected={isNativeActive("calendar")}
          onClick={() => handleSelectNative("calendar")}
          className={cn(
            "group/calendar hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isNativeActive("calendar")
              ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          )}
          title="Visualização em Calendário"
        >
          <Calendar
            className={cn(
              "size-3.5 shrink-0 transition-colors duration-200",
              isNativeActive("calendar")
                ? "text-foreground"
                : "text-muted-foreground",
              "group-hover/calendar:text-emerald-500 dark:group-hover/calendar:text-emerald-400"
            )}
          />
          <span>Calendário</span>
        </button>

        {/* 4. Gantt */}
        <button
          type="button"
          role="tab"
          aria-selected={isNativeActive("gantt")}
          onClick={() => handleSelectNative("gantt")}
          className={cn(
            "group/gantt hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isNativeActive("gantt")
              ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
          )}
          title="Visualização em Gantt"
        >
          <GanttChart
            className={cn(
              "size-3.5 shrink-0 transition-colors duration-200",
              isNativeActive("gantt")
                ? "text-foreground"
                : "text-muted-foreground",
              "group-hover/gantt:text-orange-500 dark:group-hover/gantt:text-orange-400"
            )}
          />
          <span>Gantt</span>
        </button>

        {/* 5. Arquivos & Documentos (Predefinida - Hover revela (GDrive)) */}
        <div className="relative flex items-center group/gdrive shrink-0">
          <button
            type="button"
            role="tab"
            aria-selected={activeCustomViewId === predefinedGdrive?.id}
            onClick={() => handlePredefinedClick(predefinedGdrive)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              activeCustomViewId === predefinedGdrive?.id
                ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
            )}
            title={
              predefinedGdrive?.url
                ? `Google Drive (${predefinedGdrive.url})`
                : "Vincular pasta do Google Drive"
            }
          >
            <Folder
              className={cn(
                "size-3.5 shrink-0 transition-colors duration-200",
                activeCustomViewId === predefinedGdrive?.id
                  ? "text-foreground"
                  : "text-muted-foreground",
                "group-hover/gdrive:text-blue-500 dark:group-hover/gdrive:text-blue-400"
              )}
            />
            <span className="flex items-center">
              <span>Arquivos & Documentos</span>
              <span className="max-w-0 opacity-0 overflow-hidden group-hover/gdrive:max-w-[70px] group-hover/gdrive:opacity-80 transition-all duration-200 text-[10px] text-muted-foreground ml-0.5 font-normal">
                (GDrive)
              </span>
            </span>
          </button>
          {canWrite && predefinedGdrive && onEditCustomView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="opacity-0 group-hover/gdrive:opacity-100 p-0.5 text-muted-foreground hover:text-foreground rounded transition-opacity cursor-pointer ml-[-4px]"
                  title="Configurar Google Drive"
                  aria-label="Opções Google Drive"
                >
                  <ChevronDown className="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 text-xs">
                {predefinedGdrive.url && (
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(predefinedGdrive.url, "_blank", "noopener,noreferrer")
                    }
                    className="cursor-pointer gap-2"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Abrir em nova guia</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onEditCustomView(predefinedGdrive)}
                  className="cursor-pointer gap-2"
                >
                  <Pencil className="size-3.5" />
                  <span>Configurar link do Google Drive</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 6. IA (Predefinida - Hover revela (ChatGPT)) */}
        <div className="relative flex items-center group/chatgpt shrink-0">
          <button
            type="button"
            role="tab"
            aria-selected={activeCustomViewId === predefinedChatGpt?.id}
            onClick={() => handlePredefinedClick(predefinedChatGpt)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              activeCustomViewId === predefinedChatGpt?.id
                ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
            )}
            title={
              predefinedChatGpt?.url
                ? `Projeto ChatGPT (${predefinedChatGpt.url})`
                : "Vincular projeto do ChatGPT"
            }
          >
            <Sparkles
              className={cn(
                "size-3.5 shrink-0 transition-colors duration-200",
                activeCustomViewId === predefinedChatGpt?.id
                  ? "text-foreground"
                  : "text-muted-foreground",
                "group-hover/chatgpt:text-purple-500 dark:group-hover/chatgpt:text-purple-400"
              )}
            />
            <span className="flex items-center">
              <span>IA</span>
              <span className="max-w-0 opacity-0 overflow-hidden group-hover/chatgpt:max-w-[80px] group-hover/chatgpt:opacity-80 transition-all duration-200 text-[10px] text-muted-foreground ml-0.5 font-normal">
                (ChatGPT)
              </span>
            </span>
          </button>
          {canWrite && predefinedChatGpt && onEditCustomView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="opacity-0 group-hover/chatgpt:opacity-100 p-0.5 text-muted-foreground hover:text-foreground rounded transition-opacity cursor-pointer ml-[-4px]"
                  title="Configurar ChatGPT"
                  aria-label="Opções ChatGPT"
                >
                  <ChevronDown className="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 text-xs">
                {predefinedChatGpt.url && (
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(predefinedChatGpt.url, "_blank", "noopener,noreferrer")
                    }
                    className="cursor-pointer gap-2"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Abrir em nova guia</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onEditCustomView(predefinedChatGpt)}
                  className="cursor-pointer gap-2"
                >
                  <Pencil className="size-3.5" />
                  <span>Configurar link do ChatGPT</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 7. Visualizações Personalizadas (Custom Views) Criadas */}
        {customOnlyViews.map((v, idx) => (
          <div
            key={v.id}
            draggable={canWrite}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idx)}
            className={cn(
              "relative flex items-center group/customview shrink-0 rounded-lg transition-all",
              draggedIndex === idx && "opacity-40 border border-dashed border-primary"
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCustomViewId === v.id}
              onClick={() => handleCustomViewClick(v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                activeCustomViewId === v.id
                  ? "bg-muted/80 border border-border/60 text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
              )}
              title={v.name}
            >
              {renderCustomViewIcon(
                v.icon,
                cn(
                  "size-3.5 shrink-0 transition-colors duration-200",
                  activeCustomViewId === v.id
                    ? "text-foreground"
                    : "text-muted-foreground",
                  "group-hover/customview:text-primary"
                )
              )}
              <span>{v.name}</span>
            </button>

            {/* Menu de contexto da visualização personalizada */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="opacity-0 group-hover/customview:opacity-100 p-0.5 text-muted-foreground hover:text-foreground rounded transition-opacity cursor-pointer ml-[-4px]"
                  title="Gerenciar visualização"
                  aria-label={`Opções de ${v.name}`}
                >
                  <ChevronDown className="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 text-xs">
                <DropdownMenuItem
                  onClick={() =>
                    window.open(v.url, "_blank", "noopener,noreferrer")
                  }
                  className="cursor-pointer gap-2"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Abrir em nova guia</span>
                </DropdownMenuItem>

                {canWrite && onEditCustomView && (
                  <DropdownMenuItem
                    onClick={() => onEditCustomView(v)}
                    className="cursor-pointer gap-2"
                  >
                    <Pencil className="size-3.5" />
                    <span>Editar visualização</span>
                  </DropdownMenuItem>
                )}

                {canWrite && idx > 0 && (
                  <DropdownMenuItem
                    onClick={() => handleMoveView(idx, idx - 1)}
                    className="cursor-pointer gap-2"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>Mover para esquerda</span>
                  </DropdownMenuItem>
                )}

                {canWrite && idx < customOnlyViews.length - 1 && (
                  <DropdownMenuItem
                    onClick={() => handleMoveView(idx, idx + 1)}
                    className="cursor-pointer gap-2"
                  >
                    <ArrowRight className="size-3.5" />
                    <span>Mover para direita</span>
                  </DropdownMenuItem>
                )}

                {canWrite && onDeleteCustomView && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteCustomView(v)}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Excluir visualização</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {/* 8. Botão + : permite adicionar visualizações personalizadas */}
        {canWrite && onOpenCreateCustomView && (
          <button
            type="button"
            onClick={onOpenCreateCustomView}
            className="flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-0.5 shrink-0"
            title="Adicionar visualização personalizada (+)"
            aria-label="Adicionar visualização"
          >
            <Plus className="size-3.5" />
          </button>
        )}

        {/* Dropdown "Mais" para telas compactas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex md:hidden items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                (viewMode === "calendar" ||
                  viewMode === "gantt" ||
                  viewMode === "workload" ||
                  viewMode === "canvas") &&
                  activeCustomViewId === null &&
                  "text-foreground font-semibold"
              )}
              title="Mais visualizações nativas"
            >
              <span>Mais</span>
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-44 text-xs">
            {VIEW_OPTIONS.filter((opt) => opt.desktopOnly).map((opt) => {
              const IconComponent = opt.icon;
              const isSelected = isNativeActive(opt.id);
              return (
                <DropdownMenuItem
                  key={opt.id}
                  onClick={() => handleSelectNative(opt.id)}
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

      {/* ========================================================================= */}
      {/* 3. LINHA HORIZONTAL DIREITA (Conecta as abas centrais aos botões da direita) */}
      {/* ========================================================================= */}
      <div className="flex-1 h-px bg-border/40 min-w-4" />

      {/* ========================================================================= */}
      {/* 4. LADO DIREITO: Busca Expansível + Pílula com os 6 Botões de Ícones     */}
      {/* ========================================================================= */}
      <div className="ml-2 sm:ml-3 flex items-center gap-1.5 shrink-0">
        {/* Chip discreto se filtro estiver ativo */}
        {isFiltered && onClearFilters && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/60 border border-border text-[10px] text-muted-foreground">
            <span>Filtrado</span>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline cursor-pointer"
              title="Limpar todos os filtros"
            >
              <X className="size-2.5" />
            </button>
          </div>
        )}

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
              className="w-28 sm:w-36 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
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

        {/* Pílula com os 6 ícones - Exatamente igual ao Anexo 2 */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-border/70 bg-card/60 px-2 py-0.5 shadow-2xs">
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
                    "flex items-center justify-center size-9 sm:size-7 rounded-lg sm:rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isSortActive && "text-primary bg-primary/10 ring-1 ring-primary/40 font-semibold"
                  )}
                  title={`Ordenar tarefas (${TASK_SORT_LABELS[taskSort] || "Padrão"})`}
                  aria-label="Ordenar tarefas"
                >
                  <ArrowUpDown className="size-4 sm:size-3.5" />
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
                className="flex items-center justify-center size-9 sm:size-7 rounded-lg sm:rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Ações rápidas e automações"
                aria-label="Ações rápidas e automações"
              >
                <Zap className="size-4 sm:size-3.5" />
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
                className="flex items-center justify-center size-9 sm:size-7 rounded-lg sm:rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Piloto IA (Assistente Inteligente)"
                aria-label="Piloto IA"
              >
                <Wand2 className="size-4 sm:size-3.5" />
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
                "flex items-center justify-center size-9 sm:size-7 rounded-lg sm:rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                Boolean(searchQuery) && "text-primary bg-primary/10 ring-1 ring-primary/40 font-semibold"
              )}
              title="Buscar tarefas no projeto"
              aria-label="Buscar tarefas"
            >
              <Search className="size-4 sm:size-3.5" />
            </button>
          )}

          {/* 6. CONFIGURAÇÕES DA VISUALIZAÇÃO & CAMPOS (SlidersHorizontal) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center size-9 sm:size-7 rounded-lg sm:rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Configurações da visualização e campos"
                aria-label="Configurações da visualização"
              >
                <SlidersHorizontal className="size-4 sm:size-3.5" />
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
