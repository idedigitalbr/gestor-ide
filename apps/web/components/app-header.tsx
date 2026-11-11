"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import type {
  CrmProject,
  CrmProjectManagement,
  CrmProjectMember,
  CrmUserProfile,
} from "@gestor-ide/core";
import type {
  AppModuleSection,
  ViewMode,
  TaskFilter,
  TaskStatus,
  TaskPriority,
  TaskGroupBy,
  GroupOrder,
  Task,
} from "@/types/task";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  Filter,
  Home,
  Layers,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { GROUP_OPTIONS, getGroupByLabel } from "./task-table/task-grouping-menu";
import { TaskFilterMenu } from "./task-table/task-filter-menu";
import { HeaderWorkspaceSelector } from "./header-workspace-selector";
import { cn } from "@/lib/utils";

// Ícone ClickUp de Subtarefas (Ramificação com dois nós conectados)
function SubtaskBranchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-3.5 h-3.5", className)}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M4 6v2a4 4 0 0 0 4 4h2" />
    </svg>
  );
}

// Helper para Tooltips idênticos ao ClickUp
function HeaderTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-50 bg-[#1e2029] text-white text-xs px-2.5 py-1 rounded-md border border-[#2e3142] shadow-xl font-medium"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Exportador rápido de tarefas para CSV
function exportTasksToCsv(tasks: Task[]) {
  if (!tasks || tasks.length === 0) return;
  const headers = ["Código", "Título", "Status", "Prioridade", "Responsável", "Prazo"];
  const rows = tasks.map((t) => [
    t.code || "",
    `"${(t.title || "").replace(/"/g, '""')}"`,
    t.status || "",
    t.priority || "",
    `"${(t.assignee || "").replace(/"/g, '""')}"`,
    t.dueDate || "",
  ]);
  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `tarefas-${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export type SubtaskDisplayMode = "collapsed" | "expanded" | "separate";

interface AppHeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  managements?: CrmProjectManagement[];
  projects?: CrmProject[];
  currentManagementName?: string;
  currentProjectName?: string;
  selectedManagementId?: string | null;
  selectedProjectId?: string | null;
  onSelectManagement?: (managementId: string | null) => void;
  onSelectProject?: (projectId: string | null) => void;
  activeModule: AppModuleSection;
  onModuleChange: (module: AppModuleSection) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  onOpenNewTaskModal: () => void;
  totalTasks: number;
  groupBy?: TaskGroupBy;
  groupOrder?: GroupOrder;
  onGroupByChange?: (groupBy: TaskGroupBy) => void;
  onGroupOrderChange?: (order: GroupOrder) => void;
  tasks?: Task[];
  currentUser?: CrmUserProfile | null;
  members?: CrmProjectMember[];
  onOpenFieldsModal?: () => void;
  subtaskMode?: SubtaskDisplayMode;
  onSubtaskModeChange?: (mode: SubtaskDisplayMode) => void;
  showClosedTasks?: boolean;
  onToggleShowClosedTasks?: (show: boolean) => void;
  showClosedSubtasks?: boolean;
  onToggleShowClosedSubtasks?: (show: boolean) => void;
  visibleColumnsCount?: number;
}

export function AppHeader({
  isSidebarOpen,
  onToggleSidebar,
  managements = [],
  projects = [],
  currentManagementName,
  currentProjectName,
  selectedManagementId,
  selectedProjectId,
  onSelectManagement,
  onSelectProject,
  activeModule,
  onModuleChange,
  viewMode = "table",
  onViewModeChange,
  filters,
  onFilterChange,
  onOpenNewTaskModal,
  totalTasks,
  groupBy = "none",
  groupOrder = "asc",
  onGroupByChange,
  onGroupOrderChange,
  tasks = [],
  currentUser = null,
  members = [],
  onOpenFieldsModal,
  subtaskMode = "collapsed",
  onSubtaskModeChange,
  showClosedTasks = true,
  onToggleShowClosedTasks,
  showClosedSubtasks = true,
  onToggleShowClosedSubtasks,
  visibleColumnsCount = 5,
}: AppHeaderProps) {
  const isInsideProject = Boolean(selectedProjectId);

  // Estados locais para a janela de configurações da visualização (Anexo 2)
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<
    "main" | "grupo" | "subtarefas" | "filtro"
  >("main");
  const [avatarError, setAvatarError] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);

  // Fechar popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setIsSettingsPopoverOpen(false);
        setActiveSubView("main");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quantidade de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search?.trim()) count++;
    if (filters.status && filters.status !== "Todos") count++;
    if (filters.priority && filters.priority !== "Todas") count++;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (filters.assignees && filters.assignees.length > 0) count++;
    if (filters.priorities && filters.priorities.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  const groupByLabel = getGroupByLabel(groupBy);
  const subtaskLabel =
    subtaskMode === "collapsed"
      ? "Recolhidas"
      : subtaskMode === "expanded"
      ? "Expandidas"
      : "Separar";

  const displayName = currentUser?.name || currentUser?.email || "Usuário";
  const initials = (displayName || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="planw-app-header min-h-12 px-3 py-1 border-b border-border/60 bg-background/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-y-1 select-none text-xs shrink-0 relative z-50 text-foreground">
      {/* ========================================================= */}
      {/* LADO ESQUERDO: Home + Seletor de Gestão e Projeto          */}
      {/* (Sem ícones redundantes no header, conforme solicitado)     */}
      {/* ========================================================= */}
      <div className={cn("flex items-center gap-1.5 min-w-0", isInsideProject && "w-full sm:w-auto sm:flex-1")}>
        <HeaderTooltip label="Início (Todas as Gestões)">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 rounded-lg hover:bg-muted/60"
            onClick={() => {
              onSelectManagement?.(null);
              onSelectProject?.(null);
            }}
            aria-label="Início (Todas as Gestões)"
          >
            <Home className="w-4 h-4" />
          </Button>
        </HeaderTooltip>

        <HeaderWorkspaceSelector
          managements={managements}
          selectedManagementId={selectedManagementId ?? null}
          onSelectManagement={onSelectManagement}
          projects={projects}
          selectedProjectId={selectedProjectId ?? null}
          onSelectProject={onSelectProject}
          currentManagementName={currentManagementName}
          currentProjectName={currentProjectName}
        />
      </div>

      {/* ========================================================= */}
      {/* LADO DIREITO: Avatar + Busca + "|" + Config + "+ Tarefa"    */}
      {/* (Super minimalista, exatamente como no Anexo 2)            */}
      {/* ========================================================= */}
      {isInsideProject ? (
        <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:shrink-0">
          {/* Avatar do Usuário com Indicador Online Verde */}
          <HeaderTooltip label={displayName}>
            <div className="relative shrink-0 mr-0.5">
              <div
                className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border border-border/80 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-xs cursor-pointer"
                aria-label="Perfil do usuário"
              >
                {currentUser?.avatarUrl && !avatarError ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
                title="Online"
              />
            </div>
          </HeaderTooltip>

          {/* Campo de Busca Rápida */}
          <div className="relative flex min-w-0 flex-1 items-center sm:flex-none">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ ...filters, search: e.target.value })
              }
              placeholder="Buscar tarefas..."
              className="h-8 w-full sm:w-48 md:w-56 pl-8 pr-2.5 text-xs bg-muted/40 border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Divisor vertical "|" */}
          <div className="w-[1px] h-4 bg-border/60 mx-1" aria-hidden="true" />

          {/* Configurações da Visualização (Engrenagem) - Abre o Popover Completo do Anexo 2 */}
          <div className="relative" ref={settingsRef}>
            <HeaderTooltip label="Personalize as configurações da sua visualização">
              <button
                type="button"
                onClick={() => {
                  setActiveSubView("main");
                  setIsSettingsPopoverOpen((prev) => !prev);
                }}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer",
                  isSettingsPopoverOpen && "bg-muted text-foreground ring-1 ring-border"
                )}
                aria-label="Personalize as configurações da sua visualização"
                aria-expanded={isSettingsPopoverOpen}
              >
                <Settings className="w-4 h-4" />
              </button>
            </HeaderTooltip>

            {/* Menu Dropdown idêntico ao Anexo 2 */}
            {isSettingsPopoverOpen && (
              <div
                role="dialog"
                aria-label="Personalizar visualização"
                className="absolute right-0 mt-1.5 w-72 z-50 rounded-xl border border-[#2c2f44] bg-[#161722] text-[#e2e4ef] shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100 flex flex-col"
              >
                {activeSubView === "main" && (
                  <>
                    {/* Header com X */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#25283a]">
                      <span className="text-xs font-bold text-white">
                        Personalizar visualização
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSettingsPopoverOpen(false)}
                        className="text-muted-foreground hover:text-white cursor-pointer p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subheader: [Lista] Lista */}
                    <div className="px-2 py-1.5 flex items-center gap-2 border-b border-[#25283a]">
                      <div className="flex items-center justify-center h-5 w-5 rounded bg-muted/30">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-semibold text-white">Lista</span>
                    </div>

                    {/* Lista de Opções */}
                    <div className="py-1 space-y-0.5">
                      {/* 1. Campos */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsPopoverOpen(false);
                          onOpenFieldsModal?.();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1f2130] text-[#c9cddf] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Campos</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {visibleColumnsCount} exibido &gt;
                        </span>
                      </button>

                      {/* 2. Filtro */}
                      <button
                        type="button"
                        onClick={() => setActiveSubView("filtro")}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1f2130] text-[#c9cddf] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Filtro</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {activeFiltersCount > 0
                            ? `${activeFiltersCount} ativo`
                            : "Nenhum"}{" "}
                          &gt;
                        </span>
                      </button>

                      {/* 3. Grupo */}
                      <button
                        type="button"
                        onClick={() => setActiveSubView("grupo")}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1f2130] text-[#c9cddf] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Grupo</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {groupByLabel} &gt;
                        </span>
                      </button>

                      {/* 4. Subtarefas */}
                      <button
                        type="button"
                        onClick={() => setActiveSubView("subtarefas")}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1f2130] text-[#c9cddf] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <SubtaskBranchIcon />
                          <span>Subtarefas</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {subtaskLabel} &gt;
                        </span>
                      </button>

                      {/* 5. Tarefas Concluídas / Fechadas */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#c9cddf]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Tarefas concluídas</span>
                        </div>
                        <Switch
                          checked={showClosedTasks}
                          onCheckedChange={(checked) =>
                            onToggleShowClosedTasks?.(checked)
                          }
                        />
                      </div>
                    </div>

                    {/* Ações Inferiores */}
                    <div className="border-t border-[#25283a] pt-1 mt-1 space-y-0.5">
                      {/* Copiar link */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            void navigator.clipboard.writeText(
                              window.location.href
                            );
                          }
                          setIsSettingsPopoverOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1f2130] text-[#c9cddf] transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Copiar link da visualização</span>
                      </button>

                      {/* Exportar visualização */}
                      <button
                        type="button"
                        onClick={() => {
                          exportTasksToCsv(tasks);
                          setIsSettingsPopoverOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#1f2130] text-[#c9cddf] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Exportar visualização</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Sub-view: Grupo */}
                {activeSubView === "grupo" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-[#25283a]">
                      <button
                        type="button"
                        onClick={() => setActiveSubView("main")}
                        className="p-1 rounded hover:bg-[#1f2130] text-muted-foreground hover:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">
                        Agrupar tarefas por
                      </span>
                    </div>
                    <div className="py-1 space-y-0.5 max-h-60 overflow-y-auto">
                      {GROUP_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onGroupByChange?.(opt.id);
                            setActiveSubView("main");
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                            groupBy === opt.id
                              ? "bg-[#25283a] text-white font-semibold"
                              : "hover:bg-[#1f2130] text-[#c9cddf]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <opt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{opt.label}</span>
                          </div>
                          {groupBy === opt.id && (
                            <Check className="w-3.5 h-3.5 text-[#a78bfa]" />
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          onGroupByChange?.("none");
                          setActiveSubView("main");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                          groupBy === "none"
                            ? "bg-[#25283a] text-white font-semibold"
                            : "hover:bg-[#1f2130] text-[#c9cddf]"
                        )}
                      >
                        <span>Sem agrupamento (Nenhum)</span>
                        {groupBy === "none" && (
                          <Check className="w-3.5 h-3.5 text-[#a78bfa]" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-view: Subtarefas */}
                {activeSubView === "subtarefas" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-[#25283a]">
                      <button
                        type="button"
                        onClick={() => setActiveSubView("main")}
                        className="p-1 rounded hover:bg-[#1f2130] text-muted-foreground hover:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">
                        Mostrar subtarefas
                      </span>
                    </div>
                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSubtaskModeChange?.("collapsed");
                          setActiveSubView("main");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                          subtaskMode === "collapsed"
                            ? "bg-[#25283a] text-white font-semibold"
                            : "hover:bg-[#1f2130] text-[#c9cddf]"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Recolhidas</span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            (padrão)
                          </span>
                        </div>
                        {subtaskMode === "collapsed" && (
                          <Check className="w-3.5 h-3.5 text-[#a78bfa]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSubtaskModeChange?.("expanded");
                          setActiveSubView("main");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                          subtaskMode === "expanded"
                            ? "bg-[#25283a] text-white font-semibold"
                            : "hover:bg-[#1f2130] text-[#c9cddf]"
                        )}
                      >
                        <span>Expandidas</span>
                        {subtaskMode === "expanded" && (
                          <Check className="w-3.5 h-3.5 text-[#a78bfa]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSubtaskModeChange?.("separate");
                          setActiveSubView("main");
                        }}
                        className={cn(
                          "w-full flex items-start justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left",
                          subtaskMode === "separate"
                            ? "bg-[#25283a] text-white font-semibold"
                            : "hover:bg-[#1f2130] text-[#c9cddf]"
                        )}
                      >
                        <div>
                          <p className="font-semibold text-white">Separar</p>
                          <p className="text-[10px] text-muted-foreground">
                            Usar isto para filtrar subtarefas
                          </p>
                        </div>
                        {subtaskMode === "separate" && (
                          <Check className="w-3.5 h-3.5 text-[#a78bfa] mt-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-view: Filtro */}
                {activeSubView === "filtro" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-[#25283a]">
                      <button
                        type="button"
                        onClick={() => setActiveSubView("main")}
                        className="p-1 rounded hover:bg-[#1f2130] text-muted-foreground hover:text-white cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">Filtros</span>
                    </div>
                    <div className="p-1">
                      <TaskFilterMenu
                        filters={filters}
                        onFilterChange={onFilterChange}
                        tasks={tasks}
                        align="end"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botão Roxo ClickUp "+ Tarefa ▾" */}
          <div className="inline-flex items-center rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-xs transition-colors overflow-hidden ml-1">
            <button
              type="button"
              onClick={onOpenNewTaskModal}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-white"
              title="Criar nova tarefa"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tarefa</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-1.5 border-l border-white/20 hover:bg-black/10 flex items-center justify-center cursor-pointer text-white"
                  title="Mais opções de criação"
                  aria-label="Mais opções de criação"
                >
                  <ChevronDown className="w-3 h-3 opacity-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover border-border p-1">
                <DropdownMenuItem
                  onClick={onOpenNewTaskModal}
                  className="text-xs cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Nova Tarefa</span>
                </DropdownMenuItem>
                {onOpenFieldsModal && (
                  <DropdownMenuItem
                    onClick={onOpenFieldsModal}
                    className="text-xs cursor-pointer flex items-center gap-2"
                  >
                    <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Adicionar Coluna</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2" />
      )}
    </header>
  );
}
