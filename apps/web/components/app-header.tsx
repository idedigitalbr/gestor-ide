"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type {
  CrmProject,
  CrmProjectManagement,
  CrmUserProfile,
} from "@gestor-ide/core";
import type {
  ViewMode,
  TaskFilter,
  TaskGroupBy,
  Task,
} from "@/types/task";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  Filter,
  Home,
  LayoutDashboard,
  Layers,
  LogOut,
  Palette,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { PROJECT_STATUS_LABELS, type ListDisplayMode } from "@/lib/list-view-options";
import { GROUP_OPTIONS, getGroupByLabel } from "./task-table/task-grouping-menu";
import { TaskFilterMenu } from "./task-table/task-filter-menu";
import { HeaderWorkspaceSelector } from "./header-workspace-selector";
import { HeaderNotifications } from "./header-notifications";
import { MemberAvatarContent } from "./member-avatar-content";
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
          className="z-50 bg-popover text-popover-foreground text-xs px-2.5 py-1 rounded-md border border-border shadow-xl font-medium"
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
  isProjectPage?: boolean;
  isCalendarPage?: boolean;
  onOpenNewEvent?: () => void;
  canCreateCalendarEvent?: boolean;
  onHome?: () => void;
  managements?: CrmProjectManagement[];
  selectableManagements?: CrmProjectManagement[];
  projects?: CrmProject[];
  selectableProjects?: CrmProject[];
  onlyMyManagements: boolean;
  onOnlyMyManagementsChange: (value: boolean) => void;
  onlyMyProjects: boolean;
  onOnlyMyProjectsChange: (value: boolean) => void;
  onlyMyTasks: boolean;
  onOnlyMyTasksChange: (value: boolean) => void;
  onlyMyTaskNotifications?: boolean;
  onOnlyMyTaskNotificationsChange?: (value: boolean) => void;
  onSelectTaskFromNotification?: (task: Task) => void;
  currentManagementName?: string;
  currentProjectName?: string;
  selectedManagementId?: string | null;
  selectedProjectId?: string | null;
  onSelectManagement?: (managementId: string | null) => void;
  onSelectProject?: (projectId: string | null) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  onOpenNewTaskModal: () => void;
  listSearch: string;
  onListSearchChange: (value: string) => void;
  listDisplayMode: ListDisplayMode;
  onListDisplayModeChange: (mode: ListDisplayMode) => void;
  listFilter: string;
  onListFilterChange: (value: string) => void;
  onOpenNewProject: () => void;
  onOpenNewManagement: () => void;
  groupBy?: TaskGroupBy;
  onGroupByChange?: (groupBy: TaskGroupBy) => void;
  tasks?: Task[];
  currentUser?: CrmUserProfile | null;
  onOpenFieldsModal?: () => void;
  subtaskMode?: SubtaskDisplayMode;
  onSubtaskModeChange?: (mode: SubtaskDisplayMode) => void;
  showClosedTasks?: boolean;
  onToggleShowClosedTasks?: (show: boolean) => void;
  visibleColumnsCount?: number;
  onLogout?: () => void;
  canWrite?: boolean;
  projectMembersCount?: number;
  onOpenProjectMembers?: () => void;
  onRefreshSync?: () => void;
  isSyncing?: boolean;
  cardColumns?: 4 | 5;
  onCardColumnsChange?: (cols: 4 | 5) => void;
}

export function AppHeader({
  isProjectPage = false,
  isCalendarPage = false,
  onOpenNewEvent,
  canCreateCalendarEvent = false,
  onHome,
  managements = [],
  selectableManagements,
  projects = [],
  selectableProjects,
  onlyMyManagements,
  onOnlyMyManagementsChange,
  onlyMyProjects,
  onOnlyMyProjectsChange,
  onlyMyTasks,
  onOnlyMyTasksChange,
  onlyMyTaskNotifications = true,
  onOnlyMyTaskNotificationsChange,
  onSelectTaskFromNotification,
  currentManagementName,
  currentProjectName,
  selectedManagementId,
  selectedProjectId,
  onSelectManagement,
  onSelectProject,
  viewMode = "table",
  onViewModeChange,
  filters,
  onFilterChange,
  onOpenNewTaskModal,
  listSearch,
  onListSearchChange,
  listDisplayMode,
  onListDisplayModeChange,
  listFilter,
  onListFilterChange,
  onOpenNewProject,
  onOpenNewManagement,
  groupBy = "none",
  onGroupByChange,
  tasks = [],
  currentUser = null,
  onOpenFieldsModal,
  subtaskMode = "collapsed",
  onSubtaskModeChange,
  showClosedTasks = true,
  onToggleShowClosedTasks,
  visibleColumnsCount = 5,
  onLogout,
  canWrite = true,
  projectMembersCount = 0,
  onOpenProjectMembers,
  cardColumns = 4,
  onCardColumnsChange,
}: AppHeaderProps) {
  const isInsideProject = Boolean(selectedProjectId);

  // Estados locais para a janela de configurações da visualização (Anexo 2)
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [activeSubView, setActiveSubView] = useState<
    "main" | "grupo" | "subtarefas" | "filtro"
  >("main");

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

  return (
    <header className="planw-app-header min-h-12 px-3 py-1 border-b border-border/80 bg-card/95 backdrop-blur-xs shadow-2xs flex flex-wrap items-center justify-between gap-y-1 select-none text-xs shrink-0 relative z-50 text-foreground">
      {/* ========================================================= */}
      {/* LADO ESQUERDO: Home + Seletor de Gestão e Projeto          */}
      {/* (Sem ícones redundantes no header, conforme solicitado)     */}
      {/* ========================================================= */}
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:flex-1">
        <HeaderTooltip label="Início (Todas as Gestões)">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 rounded-lg hover:bg-muted/60"
            onClick={() => {
              onSelectManagement?.(null);
              onSelectProject?.(null);
              onHome?.();
            }}
            aria-label="Início (Todas as Gestões)"
          >
            <Home className="w-4 h-4" />
          </Button>
        </HeaderTooltip>

        <HeaderWorkspaceSelector
          key={currentUser?.id ?? "anonymous"}
          managements={managements}
          selectableManagements={selectableManagements}
          selectedManagementId={selectedManagementId ?? null}
          onSelectManagement={onSelectManagement}
          projects={projects}
          selectedProjectId={selectedProjectId ?? null}
          onSelectProject={onSelectProject}
          currentManagementName={currentManagementName}
          currentProjectName={currentProjectName}
          selectableProjects={selectableProjects}
        />
        <HeaderTooltip label="Calendário"><Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Link href="/projects/calendar" aria-label="Calendário"><CalendarDays className="size-4" /></Link></Button></HeaderTooltip>
      </div>

      {/* ========================================================= */}
      {/* LADO DIREITO: Avatar + Busca + "|" + Config + "+ Tarefa"    */}
      {/* (Super minimalista, exatamente como no Anexo 2)            */}
      {/* ========================================================= */}
      {(
        <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:shrink-0">
          {/* Campo de Busca Rápida */}
          <div className="relative flex min-w-0 flex-1 items-center sm:flex-none">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={isInsideProject ? filters.search : listSearch}
              onChange={(e) =>
                isInsideProject ? onFilterChange({ ...filters, search: e.target.value }) : onListSearchChange(e.target.value)
              }
              placeholder={isInsideProject ? "Buscar tarefas..." : selectedManagementId ? "Buscar projetos..." : "Buscar gestões..."}
              aria-label={isInsideProject ? "Buscar tarefas" : selectedManagementId ? "Buscar projetos" : "Buscar gestões"}
              className="h-8 w-full sm:w-48 md:w-56 pl-8 pr-2.5 text-xs bg-muted/40 border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Divisor vertical "|" - exibido apenas quando houver botões de ferramentas intermediários */}
          {(isInsideProject || Boolean(selectedManagementId)) && (
            <div className="w-[1px] h-4 bg-border/60 mx-1" aria-hidden="true" />
          )}

          {!isProjectPage && isInsideProject && onOpenProjectMembers && (
            <HeaderTooltip label={`Membros do projeto (${projectMembersCount})`}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenProjectMembers}
                className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={`Membros do projeto (${projectMembersCount})`}
              >
                <Users className="w-4 h-4" />
                {projectMembersCount > 0 && (
                  <span className="text-[11px] font-mono">{projectMembersCount}</span>
                )}
              </Button>
            </HeaderTooltip>
          )}

          {/* Configurações da Visualização (Engrenagem) - Abre o Popover Completo do Anexo 2 */}
          {isProjectPage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Configurações da visualização"><Settings className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => void navigator.clipboard.writeText(window.location.href)}><Copy className="w-3.5 h-3.5" /> Copiar link da visualização</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          ) : isInsideProject ? <Popover open={isSettingsPopoverOpen} onOpenChange={(open) => { setIsSettingsPopoverOpen(open); if (!open) setActiveSubView("main"); }}>
            <HeaderTooltip label="Personalize as configurações da sua visualização">
              <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer",
                  isSettingsPopoverOpen && "bg-muted text-foreground ring-1 ring-border"
                )}
                aria-label="Personalize as configurações da sua visualização"
                aria-expanded={isSettingsPopoverOpen}
              >
                <Settings className="w-4 h-4" />
              </button>
              </PopoverTrigger>
            </HeaderTooltip>

            {/* Menu Dropdown idêntico ao Anexo 2 */}
              <PopoverContent
                align="end"
                collisionPadding={8}
                aria-label="Personalizar visualização"
                className="w-72 rounded-xl p-2 shadow-2xl"
              >
                {activeSubView === "main" && (
                  <>
                    {/* Header com X */}
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
                      <span className="text-xs font-bold text-foreground">
                        Personalizar visualização
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSettingsPopoverOpen(false)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="border-b border-border px-2 py-2">
                      <span className="text-xs font-semibold text-foreground">Visualizar em:</span>
                      <div role="radiogroup" aria-label="Visualizar em" className="mt-1 space-y-0.5">
                        {([ ["table", "Tabela"], ["kanban", "Kanban"], ["calendar", "Calendário"], ["gantt", "Gantt"], ["workload", "Carga de Trabalho"] ] as const).map(([mode, label]) => (
                          <button key={mode} type="button" role="radio" aria-checked={viewMode === mode} onClick={() => { onViewModeChange?.(mode); setIsSettingsPopoverOpen(false); }} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {label}{viewMode === mode && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
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
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer"
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
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer"
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
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer"
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
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer"
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
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-foreground">
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
                    <div className="border-t border-border pt-1 mt-1 space-y-0.5">
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
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer"
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
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-accent text-foreground transition-colors cursor-pointer"
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
                    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-border">
                      <button
                        type="button"
                        onClick={() => setActiveSubView("main")}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-foreground">
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
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "hover:bg-accent text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <opt.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{opt.label}</span>
                          </div>
                          {groupBy === opt.id && (
                            <Check className="w-3.5 h-3.5 text-primary" />
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
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-accent text-foreground"
                        )}
                      >
                        <span>Sem agrupamento (Nenhum)</span>
                        {groupBy === "none" && (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-view: Subtarefas */}
                {activeSubView === "subtarefas" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-border">
                      <button
                        type="button"
                        onClick={() => setActiveSubView("main")}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-foreground">
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
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-accent text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Recolhidas</span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            (padrão)
                          </span>
                        </div>
                        {subtaskMode === "collapsed" && (
                          <Check className="w-3.5 h-3.5 text-primary" />
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
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-accent text-foreground"
                        )}
                      >
                        <span>Expandidas</span>
                        {subtaskMode === "expanded" && (
                          <Check className="w-3.5 h-3.5 text-primary" />
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
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-accent text-foreground"
                        )}
                      >
                        <div>
                          <p className="font-semibold text-foreground">Separar</p>
                          <p className="text-[10px] text-muted-foreground">
                            Usar isto para filtrar subtarefas
                          </p>
                        </div>
                        {subtaskMode === "separate" && (
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-view: Filtro */}
                {activeSubView === "filtro" && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-border">
                      <button
                        type="button"
                        onClick={() => setActiveSubView("main")}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-foreground">Filtros</span>
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
              </PopoverContent>
          </Popover>

          : selectedManagementId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Configurações da visualização"><Settings className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visualização</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={listDisplayMode} onValueChange={(value) => onListDisplayModeChange(value as ListDisplayMode)}>
                  <DropdownMenuRadioItem value="cards">Cards</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="list">Lista</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                {listDisplayMode === "cards" && onCardColumnsChange && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Colunas dos cards</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={String(cardColumns ?? 4)}
                      onValueChange={(val) => onCardColumnsChange(Number(val) as 4 | 5)}
                    >
                      <DropdownMenuRadioItem value="4">4 colunas</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="5">5 colunas</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status dos projetos</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={listFilter} onValueChange={onListFilterChange}>
                  {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                    <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(window.location.href)}><Copy className="w-3.5 h-3.5" /> Copiar link da visualização</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Botão Roxo ClickUp "+ Tarefa ▾" */}
          {!isProjectPage ? (isInsideProject ? <div className={cn("inline-flex items-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-colors overflow-hidden ml-1", canWrite ? "hover:bg-primary/90" : "opacity-50")}>
            <button
              type="button"
              disabled={!canWrite}
              onClick={onOpenNewTaskModal}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed text-primary-foreground"
              title={canWrite ? "Criar nova tarefa" : "Sem permissão para criar tarefas"}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tarefa</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={!canWrite}
                  className="h-8 px-1.5 border-l border-primary-foreground/20 hover:bg-primary-foreground/10 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed text-primary-foreground"
                  title="Mais opções de criação"
                  aria-label="Mais opções de criação"
                >
                  <ChevronDown className="w-3 h-3 opacity-90" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover border-border p-1">
                <DropdownMenuItem
                  onClick={onOpenNewTaskModal}
                  disabled={!canWrite}
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
          </div> : <Button size="sm" className="h-8 gap-1.5" disabled={!canWrite} title={canWrite ? undefined : "Sem permissão de escrita no IDE CRM"} onClick={selectedManagementId ? onOpenNewProject : onOpenNewManagement}><Plus className="w-3.5 h-3.5" /> {selectedManagementId ? "Projeto" : "Gestão"}</Button>) : isCalendarPage ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={onOpenNewEvent} disabled={!canCreateCalendarEvent}><Plus className="w-3.5 h-3.5" /> Evento</Button>
          ) : null}
          <HeaderNotifications
            connected={Boolean(currentUser)}
            currentUser={currentUser}
            tasks={tasks}
            projects={projects}
            onlyMyTaskNotifications={onlyMyTaskNotifications}
            onOnlyMyTaskNotificationsChange={onOnlyMyTaskNotificationsChange}
            onSelectTask={onSelectTaskFromNotification}
          />
          {/* Avatar do Usuário com Indicador Online Verde */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 shrink-0 rounded-full" aria-label="Abrir menu da conta">
              <span className="h-7 w-7 rounded-full bg-primary border border-border/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground overflow-hidden shadow-xs">
                <MemberAvatarContent
                  key={currentUser?.avatarUrl ?? "no-avatar"}
                  name={displayName}
                  src={currentUser?.avatarUrl}
                  initialsLength={2}
                />
              </span>
              <span
                className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-background"
                title="Online"
              />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={8} className="w-68 max-w-[calc(100vw-1rem)] p-1.5">
              {/* Usuário + Minha Conta */}
              <div className="px-3 pt-2.5 pb-1.5">
                <div className="truncate font-semibold text-xs text-foreground">{displayName}</div>
                {currentUser?.email && (
                  <div className="truncate text-[11px] text-muted-foreground mt-0.5">{currentUser.email}</div>
                )}
              </div>
              <DropdownMenuItem asChild className="cursor-pointer gap-2.5 p-2 rounded-lg text-xs font-medium">
                <Link href="/settings/account">
                  <UserRound className="size-4 shrink-0 text-muted-foreground" />
                  <span>Minha Conta</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              {/* Dashboard, Aparência e Configurações Admin */}
              <DropdownMenuItem asChild className="cursor-pointer gap-2.5 p-2 rounded-lg text-xs font-medium">
                <Link href="/projects/dashboard">
                  <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="cursor-pointer gap-2.5 p-2 rounded-lg text-xs font-medium"
                onSelect={() => {
                  setTimeout(() => setIsThemeSelectorOpen(true), 50);
                }}
              >
                <Palette className="size-4 shrink-0 text-primary" />
                <span>Aparência</span>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer gap-2.5 p-2 rounded-lg text-xs font-medium">
                <Link href="/settings">
                  <Settings className="size-4 shrink-0 text-muted-foreground" />
                  <span>Configurações Admin</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              {/* Preferências expansível (Sanfona com setinha V) */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsPreferencesOpen((prev) => !prev);
                }}
                className="cursor-pointer justify-between gap-2.5 p-2 rounded-lg text-xs font-medium"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
                  <span>Preferências</span>
                </div>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isPreferencesOpen && "rotate-180"
                  )}
                />
              </DropdownMenuItem>

              {isPreferencesOpen && (
                <div
                  className="mx-1 my-1 p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-2 text-xs animate-in fade-in-50 duration-150"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <label htmlFor="only-my-managements" className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] leading-tight select-none">
                      Ver somente gestões que faço parte
                    </label>
                    <Switch
                      id="only-my-managements"
                      checked={onlyMyManagements}
                      onCheckedChange={onOnlyMyManagementsChange}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2.5">
                    <label htmlFor="only-my-projects" className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] leading-tight select-none">
                      Ver somente projetos que faço parte
                    </label>
                    <Switch
                      id="only-my-projects"
                      checked={onlyMyProjects}
                      onCheckedChange={onOnlyMyProjectsChange}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2.5">
                    <label htmlFor="only-my-tasks" className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] leading-tight select-none">
                      Ver somente tarefas que sou responsável
                    </label>
                    <Switch
                      id="only-my-tasks"
                      checked={onlyMyTasks}
                      onCheckedChange={onOnlyMyTasksChange}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2.5">
                    <label htmlFor="only-my-task-notifications" className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] leading-tight select-none">
                      Notificações somente de tarefas que faço parte
                    </label>
                    <Switch
                      id="only-my-task-notifications"
                      checked={onlyMyTaskNotifications}
                      onCheckedChange={onOnlyMyTaskNotificationsChange}
                    />
                  </div>
                </div>
              )}

              <DropdownMenuSeparator className="my-1" />

              {/* Sair */}
              <DropdownMenuItem
                className="cursor-pointer gap-2.5 p-2 rounded-lg text-xs font-medium text-destructive focus:text-destructive"
                onSelect={onLogout}
                disabled={!currentUser}
              >
                <LogOut className="size-4 shrink-0" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeSelector
            open={isThemeSelectorOpen}
            onOpenChange={setIsThemeSelectorOpen}
            showTrigger={false}
            position="top-right"
          />

        </div>
      )}
    </header>
  );
}
