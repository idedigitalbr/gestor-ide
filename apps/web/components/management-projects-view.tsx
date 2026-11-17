"use client";

import React, { useMemo, useState } from "react";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";
import { computeProjectTasksSummary } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import {
  Folder,
  CheckCircle2,
  ListTodo,
  Calendar,
  ArrowRight,
  Plus,
  ChevronRight,
  FileText,
  Play,
  Clock,
  CircleDot,
  ArrowUpDown,
  SlidersHorizontal,
  Layers,
  LayoutGrid,
  List,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatarGroup } from "@/components/member-avatar-group";
import { EntityHeader, type HeaderKpiItem } from "@/components/entity-header";
import { EntityCard } from "@/components/entity-card";
import {
  MembersDialog,
  normalizeMemberRole,
  type TeamMemberItem,
  type CanonicalMemberRole,
} from "@/components/members-dialog";
import {
  stripProjectPrefix,
  type ListDisplayMode,
} from "@/lib/list-view-options";
import {
  type ProjectSortOption,
  PROJECT_SORT_LABELS,
  type ProjectFilters,
  DEFAULT_PROJECT_FILTERS,
  type ProjectGroupBy,
  PROJECT_GROUP_LABELS,
  filterProjects,
  sortProjects,
  countActiveProjectFilters,
  extractProjectTags,
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
import {
  KanbanGhostCard,
  useFlipGrid,
  CardInsertSeparator,
  useDwellGhost,
} from "@/components/kanban-ghost-card";

interface ManagementProjectsViewProps {
  search: string;
  statusFilter: string;
  viewMode: ListDisplayMode;
  onViewModeChange?: (mode: ListDisplayMode) => void;
  cardColumns?: 3 | 4 | 5;
  onCardColumnsChange?: (cols: 3 | 4 | 5) => void;
  sortOption?: ProjectSortOption;
  onSortOptionChange?: (sort: ProjectSortOption) => void;
  filters?: ProjectFilters;
  onFiltersChange?: (filters: ProjectFilters) => void;
  groupBy?: ProjectGroupBy;
  onGroupByChange?: (groupBy: ProjectGroupBy) => void;
  onResetSettings?: () => void;
  management: CrmProjectManagement;
  projects: CrmProject[];
  tasks: Task[];
  availableUsers?: TeamMemberItem[];
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  isConnectedCrm?: boolean;
  canWrite?: boolean;
  canManageMembers?: boolean;
  onCreateProject?: () => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onSelectProject: (projectId: string) => void;
  onUpdateProject?: (
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      coverPath?: string | null;
      status?: string;
      visibility?: string;
      priority?: string;
      dueDate?: string | null;
    }
  ) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
  onLeaveProject?: (projectId: string) => Promise<void>;
}

/**
 * Formata data no formato brasileiro idêntico ao Print 3 (ex: "sex (20/nov)")
 */
function formatProjectDate(dateString?: string | null): string {
  if (!dateString) return "Sem data";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const months = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];
    const w = weekdays[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    return `${w} (${day}/${month})`;
  } catch {
    return dateString;
  }
}

/**
 * Badge de status idêntico ao Print 3 e à tabela de tarefas do projeto
 */
function ProjectStatusPill({ status }: { status?: string }) {
  const norm = (status || "").toLowerCase();
  if (norm === "completed" || norm === "concluida" || norm === "concluído") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold tracking-wide border border-emerald-500/20 select-none">
        <CheckCircle2 className="size-3.5" />
        <span>CONCLUÍDO</span>
      </div>
    );
  }
  if (norm === "active" || norm === "in_progress" || norm === "fazendo") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[11px] font-semibold tracking-wide border border-blue-500/20 select-none">
        <Play className="size-3.5 fill-current" />
        <span>FAZENDO AGORA</span>
      </div>
    );
  }
  if (norm === "paused" || norm === "pausada" || norm === "feedback" || norm === "review") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-semibold tracking-wide border border-amber-500/20 select-none">
        <Clock className="size-3.5" />
        <span>AGUARDANDO FEEDBACK...</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold tracking-wide border border-border/60 select-none">
      <CircleDot className="size-3.5" />
      <span>PENDENTE</span>
    </div>
  );
}

/**
 * Barra de progresso segmentada idêntica ao Print 3
 * ([==---] completed/total)
 */
function SegmentedProgressBar({
  completed,
  total,
  className,
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAllDone = completed === total && total > 0;
  const segmentCount = 6;
  const filledSegments =
    total > 0
      ? Math.min(segmentCount, Math.round((completed / total) * segmentCount))
      : 0;

  return (
    <div
      className={cn("inline-flex items-center gap-2 select-none", className)}
      title={`Concluído ${completed} de ${total} (${percent}%)`}
    >
      <div className="flex h-2.5 gap-0.5" aria-hidden="true">
        {Array.from({ length: segmentCount }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-full w-2.5 rounded-[2px] transition-colors",
              isAllDone
                ? "bg-primary"
                : index < filledSegments
                ? "bg-primary"
                : "bg-muted-foreground/25"
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground font-mono">
        {completed}/{total}
      </span>
    </div>
  );
}

export function ManagementProjectsView({
  search,
  statusFilter,
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
  onResetSettings,
  management,
  projects,
  tasks,
  availableUsers = [],
  currentUserId = null,
  currentUserEmail = null,
  isConnectedCrm = false,
  canWrite = true,
  canManageMembers = false,
  onCreateProject,
  onRefresh,
  onBack,
  onSelectProject,
  onUpdateProject,
  onDeleteProject,
  onLeaveProject,
}: ManagementProjectsViewProps) {
  // Estados de membros
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [remoteMemberIds, setRemoteMemberIds] = useState<string[] | null>(null);
  const [localRoleOverrides, setLocalRoleOverrides] = useState<Map<string, string>>(new Map());
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set());
  const [optimisticAddedMembers, setOptimisticAddedMembers] = useState<TeamMemberItem[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Status atual da gestão
  const [currentStatus, setCurrentStatus] = useState<string>("Ativa");

  // Hook de detecção de hover nas bordas do Kanban/Cards
  const gridContainerRef = React.useRef<HTMLDivElement>(null);

  // Hook com dwell time (~2.2s) para expandir o skeleton grande entre cards ao pousar o mouse
  const {
    expandedIndex,
    startDwell,
    cancelDwell,
    keepExpanded,
    closeExpanded,
  } = useDwellGhost({ dwellTimeMs: 2200, leaveDelayMs: 280 });

  // Animação FLIP suave para empurrar os cards existentes
  useFlipGrid(gridContainerRef, expandedIndex, 260);

  // Projetos que pertencem a esta gestão
  const managementProjects = useMemo(() => {
    return projects.filter((p) => p.projectManagementId === management.id);
  }, [projects, management.id]);

  // Contagem de tarefas e progresso específico por projeto (SEM DADOS FALSOS)
  const projectTaskStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const p of managementProjects) {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      if (projTasks.length > 0) {
        const summary = computeProjectTasksSummary(projTasks);
        map.set(p.id, { total: summary.totalItems, completed: summary.completedItems });
      } else {
        const total = p._count?.tasks ?? 0;
        const completed = p.status === "completed" ? total : 0;
        map.set(p.id, { total, completed });
      }
    }
    return map;
  }, [managementProjects, tasks]);

  // Filtros efetivos combinando prop filters com fallback em statusFilter
  const effectiveFilters = useMemo<ProjectFilters>(() => {
    if (filters) return filters;
    return {
      ...DEFAULT_PROJECT_FILTERS,
      status: statusFilter || "all",
    };
  }, [filters, statusFilter]);

  // Filtragem e ordenação local compartilhada
  const filteredProjects = useMemo(() => {
    return filterProjects(managementProjects, effectiveFilters, search, projectTaskStats);
  }, [managementProjects, effectiveFilters, search, projectTaskStats]);

  const sortedProjects = useMemo(() => {
    return sortProjects(filteredProjects, sortOption, projectTaskStats);
  }, [filteredProjects, sortOption, projectTaskStats]);

  const activeFiltersCount = useMemo(() => {
    return countActiveProjectFilters(effectiveFilters);
  }, [effectiveFilters]);

  const availableTags = useMemo(() => {
    return extractProjectTags(managementProjects);
  }, [managementProjects]);

  const gridColsClass = useMemo(() => {
    if (cardColumns === 3) {
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
    if (cardColumns === 5) {
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";
    }
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  }, [cardColumns]);

  // Resolução unificada de integrantes com mutações locais
  const resolvedMembers = useMemo<TeamMemberItem[]>(() => {
    const byId = new Map<string, TeamMemberItem>();
    for (const m of management.members ?? []) {
      const uid = m.userId || m.user?.id;
      if (!uid || removedUserIds.has(uid)) continue;
      byId.set(uid, {
        userId: uid,
        name: m.user?.name,
        email: m.user?.email,
        avatarUrl: m.user?.avatarUrl,
        role: localRoleOverrides.get(uid) ?? m.role,
      });
    }
    for (const proj of managementProjects) {
      for (const m of proj.members ?? []) {
        const uid = m.userId || m.user?.id;
        if (!uid || removedUserIds.has(uid)) continue;
        const existing = byId.get(uid);
        const assignedRole = localRoleOverrides.get(uid) ?? m.role;
        if (!existing) {
          byId.set(uid, {
            userId: uid,
            name: m.user?.name,
            email: m.user?.email,
            avatarUrl: m.user?.avatarUrl,
            role: assignedRole,
          });
        } else if (!existing.name && m.user?.name) {
          byId.set(uid, {
            ...existing,
            name: m.user.name,
            email: existing.email ?? m.user.email,
            avatarUrl: existing.avatarUrl ?? m.user.avatarUrl,
            role: assignedRole,
          });
        }
      }
    }
    for (const uid of remoteMemberIds ?? []) {
      if (removedUserIds.has(uid)) continue;
      if (!byId.has(uid)) {
        byId.set(uid, {
          userId: uid,
          role: localRoleOverrides.get(uid) ?? "editor",
        });
      }
    }

    for (const m of optimisticAddedMembers) {
      if (removedUserIds.has(m.userId)) continue;
      if (!byId.has(m.userId)) {
        byId.set(m.userId, {
          ...m,
          role: localRoleOverrides.get(m.userId) ?? m.role,
        });
      }
    }

    // Enriquece itens que possuem apenas userId com dados conhecidos de availableUsers
    for (const [uid, item] of byId.entries()) {
      if (!item.name || !item.email) {
        const found = availableUsers.find((u) => u.userId === uid);
        if (found) {
          byId.set(uid, {
            ...item,
            name: item.name || found.name,
            email: item.email || found.email,
            avatarUrl: item.avatarUrl || found.avatarUrl,
          });
        }
      }
    }

    return Array.from(byId.values());
  }, [
    management.members,
    managementProjects,
    remoteMemberIds,
    removedUserIds,
    localRoleOverrides,
    optimisticAddedMembers,
    availableUsers,
  ]);

  // Permissão efetiva para gerenciar integrantes da gestão
  const effectiveCanManageMembers = useMemo(() => {
    return (
      canManageMembers ||
      canWrite ||
      !isConnectedCrm ||
      resolvedMembers.some(
        (m) =>
          (Boolean(currentUserId && m.userId === currentUserId) ||
            Boolean(currentUserEmail && m.email && m.email.toLowerCase() === currentUserEmail.toLowerCase())) &&
          (normalizeMemberRole(m.role) === "manager" || normalizeMemberRole(m.role) === "editor")
      )
    );
  }, [canManageMembers, canWrite, isConnectedCrm, resolvedMembers, currentUserId, currentUserEmail]);

  async function handleOpenMembersDialog() {
    setMembersDialogOpen(true);
    setMembersError(null);
    if (!isConnectedCrm) return;
    setLoadingMembers(true);
    try {
      const res = await ideCrmClient.listManagementMembers(management.id);
      setRemoteMemberIds((res.members ?? []).map((m) => m.userId).filter(Boolean));
    } catch (err) {
      setMembersError(
        err instanceof Error ? err.message : "Não foi possível atualizar a lista de membros."
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleChangeMemberRole(member: TeamMemberItem, newRole: CanonicalMemberRole) {
    if (!isConnectedCrm) {
      setLocalRoleOverrides((prev) => new Map(prev).set(member.userId, newRole));
      return;
    }
    try {
      await ideCrmClient.updateManagementMemberRole(management.id, member.userId, newRole);
      setLocalRoleOverrides((prev) => new Map(prev).set(member.userId, newRole));
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar papel do integrante.";
      setMembersError(msg);
      throw err;
    }
  }

  async function handleRemoveMember(member: TeamMemberItem) {
    if (!isConnectedCrm) {
      setRemovedUserIds((prev) => new Set([...prev, member.userId]));
      return;
    }
    try {
      await ideCrmClient.removeManagementMember(management.id, member.userId);
      setRemovedUserIds((prev) => new Set([...prev, member.userId]));
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao remover integrante.";
      setMembersError(msg);
      throw err;
    }
  }

  async function handleAddMember(data: {
    emailOrId: string;
    role: CanonicalMemberRole;
    user?: TeamMemberItem;
  }) {
    const isEmail = data.emailOrId.includes("@");
    const targetUserId = data.user?.userId || (!isEmail ? data.emailOrId : undefined);
    const targetEmail = data.user?.email || (isEmail ? data.emailOrId : undefined);

    const optimisticItem: TeamMemberItem = {
      userId: targetUserId || `temp-${Date.now()}`,
      name: data.user?.name || (targetEmail ? targetEmail.split("@")[0] : data.emailOrId),
      email: targetEmail || (isEmail ? data.emailOrId : null),
      avatarUrl: data.user?.avatarUrl || null,
      role: data.role,
    };
    setOptimisticAddedMembers((prev) => [...prev, optimisticItem]);

    if (!isConnectedCrm) {
      setRemoteMemberIds((prev) => [...(prev ?? []), optimisticItem.userId]);
      setLocalRoleOverrides((prev) => new Map(prev).set(optimisticItem.userId, data.role));
      return;
    }
    try {
      await ideCrmClient.addManagementMember(management.id, {
        email: targetEmail,
        userId: targetUserId,
        role: data.role,
      });
      await handleOpenMembersDialog();
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao adicionar integrante.";
      setMembersError(msg);
      throw err;
    }
  }

  // Contadores KPI REAIS (sem mocks)
  const completedProjectsCount = useMemo(() => {
    return managementProjects.filter((p) => p.status === "completed").length;
  }, [managementProjects]);

  const totalTasksCount = useMemo(() => {
    const projectIds = new Set(managementProjects.map((p) => p.id));
    const tasksInMgmt = tasks.filter((t) => t.projectId && projectIds.has(t.projectId));
    if (tasksInMgmt.length > 0) return tasksInMgmt.length;
    return managementProjects.reduce((acc, p) => acc + (p._count?.tasks ?? 0), 0);
  }, [managementProjects, tasks]);

  const mgmtColor = management.color || "var(--primary)";
  const memberCount = resolvedMembers.length || management.members?.length || 1;

  // 3 KPIs da Gestão (Projetos, Concluídos, Tarefas)
  const managementKpis = useMemo<HeaderKpiItem[]>(() => {
    return [
      {
        key: "projects",
        label: "Projetos",
        value: managementProjects.length,
        icon: <Folder className="size-4 text-blue-400" />,
        iconBgColor: "bg-blue-500/10 text-blue-400",
      },
      {
        key: "completed",
        label: "Concluídos",
        value: completedProjectsCount,
        icon: <CheckCircle2 className="size-4 text-emerald-400" />,
        iconBgColor: "bg-emerald-500/10 text-emerald-400",
      },
      {
        key: "tasks",
        label: "Tarefas",
        value: totalTasksCount,
        icon: <ListTodo className="size-4 text-purple-400" />,
        iconBgColor: "bg-purple-500/10 text-purple-400",
      },
    ];
  }, [managementProjects.length, completedProjectsCount, totalTasksCount]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO UNIFICADO DA GESTÃO (EXATO MESMO COMPONENTE EntityHeader)    */}
      {/* ========================================================================= */}
      <EntityHeader
        type="management"
        id={management.id}
        name={management.name}
        description={management.description}
        code={management.code}
        color={mgmtColor}
        createdAt={management.createdAt}
        status={currentStatus}
        visibility={management.visibility}
        onBack={onBack}
        backLabel="Gestões"
        kpis={managementKpis}
        members={resolvedMembers}
        memberCount={memberCount}
        onOpenMembers={() => void handleOpenMembersDialog()}
        canWrite={canWrite}
        onUpdate={async (updates) => {
          if (isConnectedCrm) {
            await ideCrmClient.updateManagement(management.id, {
              name: updates.name,
              description: updates.description,
              status: updates.status,
              visibility: updates.visibility,
            });
            onRefresh?.();
          }
          if (updates.status) {
            setCurrentStatus(updates.status);
          }
        }}
        onRefresh={onRefresh}
      />

      {/* ========================================================================= */}
      {/* 2. BARRA DE FERRAMENTAS CLICKUP/NOTION: Ordenar, Filtros, Agrupar, Layout */}
      {/* ========================================================================= */}
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
                    {sortOption !== "none" ? PROJECT_SORT_LABELS[sortOption] : "Ordenar"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Organizar projetos por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(PROJECT_SORT_LABELS) as [ProjectSortOption, string][]).map(([key, label]) => (
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
                    <span className="text-xs font-bold text-foreground">Filtros de projetos</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onFiltersChange(DEFAULT_PROJECT_FILTERS)}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {/* Status */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "all", label: "Todos" },
                        { value: "active", label: "Ativo" },
                        { value: "in_progress", label: "Em andamento" },
                        { value: "planning", label: "Planejamento" },
                        { value: "paused", label: "Pausado" },
                        { value: "completed", label: "Concluído" },
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

                  {/* Prioridade */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Prioridade
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "all", label: "Todas" },
                        { value: "urgent", label: "Urgente" },
                        { value: "high", label: "Alta" },
                        { value: "medium", label: "Média" },
                        { value: "low", label: "Baixa" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              priority: opt.value,
                            })
                          }
                          className={cn(
                            "px-2 py-1 text-left rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.priority === opt.value &&
                              "bg-accent font-semibold border-primary/50 text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prazo */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Prazo / Vencimento
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: "all", label: "Todos os prazos" },
                        { value: "overdue", label: "Atrasados" },
                        { value: "today", label: "Vence hoje" },
                        { value: "week", label: "Esta semana" },
                        { value: "month", label: "Este mês" },
                        { value: "no_date", label: "Sem prazo" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              dueDateRange: opt.value,
                            })
                          }
                          className={cn(
                            "px-2 py-1 text-left rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.dueDateRange === opt.value &&
                              "bg-accent font-semibold border-primary/50 text-primary"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Escopo de Tarefas */}
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Tarefas vinculadas
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { value: "all", label: "Todos" },
                        { value: "with_tasks", label: "Com tarefas" },
                        { value: "without_tasks", label: "Sem tarefas" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onFiltersChange({
                              ...effectiveFilters,
                              hasTasks: opt.value,
                            })
                          }
                          className={cn(
                            "px-2 py-1 text-center rounded text-xs border border-border/60 hover:bg-accent transition-colors",
                            effectiveFilters.hasTasks === opt.value &&
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
                  <span>{groupBy !== "none" ? PROJECT_GROUP_LABELS[groupBy] : "Agrupar"}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Agrupar projetos por
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(PROJECT_GROUP_LABELS) as [ProjectGroupBy, string][]).map(([key, label]) => (
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

      {/* Badges de Filtros e Ordenação Ativos */}
      {(sortOption !== "none" || activeFiltersCount > 0 || groupBy !== "none") && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
          <span className="text-[11px] text-muted-foreground">Filtros ativos:</span>

          {sortOption !== "none" && (
            <button
              type="button"
              onClick={() => onSortOptionChange?.("none")}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <span>Ordenar: {PROJECT_SORT_LABELS[sortOption]}</span>
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

          {effectiveFilters.priority !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, priority: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Prioridade: {effectiveFilters.priority}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.dueDateRange !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, dueDateRange: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Prazo: {effectiveFilters.dueDateRange}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {effectiveFilters.hasTasks !== "all" && (
            <button
              type="button"
              onClick={() => onFiltersChange?.({ ...effectiveFilters, hasTasks: "all" })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border/80 text-[11px] text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>{effectiveFilters.hasTasks === "with_tasks" ? "Com tarefas" : "Sem tarefas"}</span>
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
              <span>Agrupamento: {PROJECT_GROUP_LABELS[groupBy]}</span>
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onSortOptionChange?.("none");
              onFiltersChange?.(DEFAULT_PROJECT_FILTERS);
              onGroupByChange?.("none");
              onResetSettings?.();
            }}
            className="text-[11px] text-destructive hover:underline ml-1 cursor-pointer font-medium"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONTAINER DE PROJETOS DA GESTÃO: EXATAMENTE IGUAL AO PRINT 3           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xl space-y-3">
        {sortedProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
            <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Nenhum projeto encontrado nesta gestão
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Nenhum projeto corresponde aos filtros aplicados ou ainda não há projetos cadastrados.
            </p>
            {onCreateProject && (
              <Button onClick={onCreateProject} size="sm" className="gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" />
                Criar primeiro projeto
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ========================================================================= */
          /* MODO LISTA: CABEÇALHO UNIFICADO COM COLUNAS + LINHAS (EXATO PRINT 3)      */
          /* ========================================================================= */
          <div className="space-y-2">
            {/* Linha Única de Cabeçalho das Colunas: PROJETOS [progresso] | STATUS | DATA | RESPONSÁVEL | [+] */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 select-none">
              {/* Coluna 1: PROJETOS + Progresso Real dos Projetos da Gestão */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PROJETOS
                </span>
                <SegmentedProgressBar
                  completed={completedProjectsCount}
                  total={managementProjects.length}
                />
              </div>

              {/* Colunas Direitas: STATUS | DATA | RESPONSÁVEL | [+] */}
              <div className="flex items-center shrink-0">
                <div className="w-36 sm:w-44 text-center px-2 border-l border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  STATUS
                </div>
                <div className="hidden sm:block w-32 text-center px-2 border-l border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DATA
                </div>
                <div className="hidden sm:block w-28 text-center px-2 border-l border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  RESPONSÁVEL
                </div>
                <div className="w-10 flex justify-end pl-2">
                  {onCreateProject && (
                    <button
                      type="button"
                      onClick={onCreateProject}
                      className="size-7 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
                      title="Adicionar novo projeto"
                      aria-label="Adicionar novo projeto"
                    >
                      <Plus className="size-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Linhas dos Projetos formatadas como na tabela de tarefas do Print 3 */}
            {sortedProjects.map((project) => {
              const projectColor = project.color || "var(--primary)";
              const stats = projectTaskStats.get(project.id) || { total: 0, completed: 0 };
              const projMembers = project.members ?? [];

              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectProject(project.id);
                    }
                  }}
                  className="group relative flex items-center justify-between p-2.5 sm:px-4 sm:py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Faixa Fina Colorida na Lateral Esquerda do Bloco (3.5px) */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-2xl z-20 pointer-events-none"
                    style={{ backgroundColor: projectColor }}
                  />

                  {/* Lado Esquerdo: Chevron > + Ícone Documento + Nome do Projeto + Progresso Segmentado */}
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pl-1 sm:pl-2">
                    <div className="size-6 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <FileText className="size-4 text-muted-foreground/80 shrink-0" />

                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                        Projeto
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {stripProjectPrefix(project.name)}
                      </span>
                    </div>

                    {/* Progresso Segmentado específico deste projeto */}
                    <SegmentedProgressBar
                      completed={stats.completed}
                      total={stats.total}
                      className="hidden md:inline-flex ml-2"
                    />
                  </div>

                  {/* Lado Direito: Status + Data + Responsável + Seta */}
                  <div className="flex items-center shrink-0">
                    <div className="w-36 sm:w-44 flex justify-center px-2">
                      <ProjectStatusPill status={project.status} />
                    </div>

                    <div className="hidden sm:flex w-32 items-center justify-center gap-1.5 text-xs text-muted-foreground px-2">
                      <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{formatProjectDate(project.createdAt || project.updatedAt)}</span>
                    </div>

                    <div className="hidden sm:flex w-28 items-center justify-center px-2">
                      {projMembers.length > 0 ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <MemberAvatarGroup
                            members={projMembers.map((m) => ({
                              userId: m.userId,
                              name: m.user?.name,
                              avatarUrl: m.user?.avatarUrl,
                              role: m.role,
                              email: m.user?.email,
                            }))}
                            showCount={false}
                            isCompact
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </div>

                    <div className="w-10 flex justify-end pl-2 text-muted-foreground group-hover:text-primary transition-colors pr-1">
                      <ArrowRight className="size-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Botão + Novo item no rodapé da tabela (idêntico ao Print 3) */}
            {onCreateProject && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-muted/40 transition-colors font-medium"
                >
                  <Plus className="size-3.5" />
                  <span>Novo item</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* MODO CARDS: CABEÇALHO LIMPO + CARDS COMPACTOS EM 4 A 5 COLUNAS            */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* Cabeçalho Limpo: PROJETOS [progresso real] na esquerda e [+] na direita */}
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PROJETOS
                </span>
                <SegmentedProgressBar
                  completed={completedProjectsCount}
                  total={managementProjects.length}
                />
              </div>

              {onCreateProject && (
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="size-7 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
                  title="Adicionar novo projeto"
                  aria-label="Adicionar novo projeto"
                >
                  <Plus className="size-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Grade de Cards Compactos com detecção de hover nas bordas */}
            <div
              ref={gridContainerRef}
              className="relative"
            >
              <div className={cn("grid gap-3.5", gridColsClass)}>
                {/* Se o skeleton grande foi expandido na posição 0 (antes do primeiro card) */}
                {expandedIndex === 0 && canWrite && onCreateProject && (
                  <div
                    data-flip-id="__ghost_0__"
                    onMouseEnter={keepExpanded}
                    onMouseLeave={cancelDwell}
                    className="animate-in fade-in zoom-in-95 slide-in-from-left-6 duration-200"
                  >
                    <KanbanGhostCard
                      label="Novo"
                      sublabel="Criar no início"
                      variant="entity"
                      slideDirection="left"
                      onClick={() => {
                        closeExpanded();
                        onCreateProject();
                      }}
                      isVisible={true}
                      onMouseEnter={keepExpanded}
                      onMouseLeave={cancelDwell}
                    />
                  </div>
                )}

                {sortedProjects.map((project, index) => {
                  const projectColor = project.color || "var(--primary)";
                  const stats = projectTaskStats.get(project.id) || { total: 0, completed: 0 };
                  const taskCount = stats.total || project._count?.tasks || 0;
                  const projMembers = project.members ?? [];
                  const pMemberCount = project._count?.members ?? (projMembers.length || 0);
                  const isFirst = index === 0;

                  return (
                    <React.Fragment key={project.id}>
                      <div
                        data-flip-id={project.id}
                        className="relative group/card"
                      >
                        {/* Botãozinho + e linha vertical no lado esquerdo do primeiro card (posição 0) */}
                        {isFirst && canWrite && onCreateProject && (
                          <CardInsertSeparator
                            side="left"
                            title="Criar projeto antes deste card"
                            onHoverStart={() => startDwell(0)}
                            onHoverEnd={cancelDwell}
                            onClick={() => {
                              closeExpanded();
                              onCreateProject();
                            }}
                          />
                        )}

                        {/* Botãozinho + e linha vertical no lado direito de cada card (posição index + 1) */}
                        {canWrite && onCreateProject && (
                          <CardInsertSeparator
                            side="right"
                            title="Criar projeto entre os cards"
                            onHoverStart={() => startDwell(index + 1)}
                            onHoverEnd={cancelDwell}
                            onClick={() => {
                              closeExpanded();
                              onCreateProject();
                            }}
                          />
                        )}

                        <EntityCard
                          type="project"
                          id={project.id}
                          name={project.name}
                          description={project.description}
                          code={project.code}
                          color={projectColor}
                          coverPath={project.coverPath}
                          status={project.status}
                          visibility={project.visibility}
                          createdAt={project.createdAt}
                          dueDate={project.dueDate}
                          priority={project.priority}
                          taskCount={taskCount}
                          memberCount={pMemberCount}
                          members={projMembers}
                          onSelect={() => onSelectProject(project.id)}
                          canWrite={canWrite}
                          canManageMembers={effectiveCanManageMembers}
                          currentUserId={currentUserId}
                          onUpdate={
                            onUpdateProject
                              ? (updates) => onUpdateProject(project.id, updates)
                              : undefined
                          }
                          onDelete={
                            onDeleteProject
                              ? () => onDeleteProject(project.id)
                              : undefined
                          }
                          onLeave={
                            onLeaveProject
                              ? () => onLeaveProject(project.id)
                              : undefined
                          }
                          onManageMembers={() => void handleOpenMembersDialog()}
                        />
                      </div>

                      {/* Se o skeleton grande foi expandido nesta posição intermediária (empurrando os cards) */}
                      {expandedIndex === index + 1 && canWrite && onCreateProject && (
                        <div
                          data-flip-id={`__ghost_${index + 1}__`}
                          onMouseEnter={keepExpanded}
                          onMouseLeave={cancelDwell}
                          className="animate-in fade-in zoom-in-95 slide-in-from-right-6 duration-200"
                        >
                          <KanbanGhostCard
                            label="Novo"
                            sublabel="Criar novo projeto"
                            variant="entity"
                            slideDirection="right"
                            onClick={() => {
                              closeExpanded();
                              onCreateProject();
                            }}
                            isVisible={true}
                            onMouseEnter={keepExpanded}
                            onMouseLeave={cancelDwell}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Slot fantasma sutil para hover no final quando nenhum skeleton está aberto */}
                {expandedIndex === null && canWrite && onCreateProject && (
                  <div
                    onClick={onCreateProject}
                    onMouseEnter={() => startDwell(sortedProjects.length)}
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
          </div>
        )}
      </div>

      {/* Diálogo de Membros Completo (com troca de papel, remoção e sair) */}
      <MembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        title={`Membros de ${management.name}`}
        description="Pessoas liberadas no funil operacional desta gestão."
        members={resolvedMembers}
        availableUsers={availableUsers}
        loading={loadingMembers}
        error={membersError}
        canManageMembers={effectiveCanManageMembers}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        entityType="management"
        onChangeRole={handleChangeMemberRole}
        onRemoveMember={handleRemoveMember}
        onAddMember={handleAddMember}
        onSelfLeave={onBack}
      />
    </div>
  );
}
