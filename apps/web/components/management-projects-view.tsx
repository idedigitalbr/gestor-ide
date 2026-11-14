"use client";

import React, { useMemo, useState } from "react";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
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
import { cn } from "@/lib/utils";

interface ManagementProjectsViewProps {
  search: string;
  statusFilter: string;
  viewMode: ListDisplayMode;
  onViewModeChange?: (mode: ListDisplayMode) => void;
  cardColumns?: 4 | 5;
  onCardColumnsChange?: (cols: 4 | 5) => void;
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
  cardColumns = 4,
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

  // Status atual da gestão
  const [currentStatus, setCurrentStatus] = useState<string>("Ativa");

  // Projetos que pertencem a esta gestão
  const managementProjects = useMemo(() => {
    return projects.filter((p) => p.projectManagementId === management.id);
  }, [projects, management.id]);

  // Contagem de tarefas e progresso específico por projeto (SEM DADOS FALSOS)
  const projectTaskStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const p of managementProjects) {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      let total = projTasks.length;
      let completed = projTasks.filter((t) => normalizeTaskStatus(t.status) === "CONCLUÍDO").length;

      // Fallback para contagem do CRM se tarefas ainda não foram carregadas individualmente
      if (total === 0 && (p._count?.tasks ?? 0) > 0) {
        total = p._count?.tasks ?? 0;
        completed = p.status === "completed" ? total : 0;
      }
      map.set(p.id, { total, completed });
    }
    return map;
  }, [managementProjects, tasks]);

  // Filtragem local conforme pesquisa e status
  const filteredProjects = useMemo(() => {
    return managementProjects.filter((project) => {
      const matchesSearch =
        search === "" ||
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(search.toLowerCase())) ||
        (project.code && project.code.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        project.status === statusFilter ||
        (statusFilter === "active" && (!project.status || project.status === "active"));

      return matchesSearch && matchesStatus;
    });
  }, [managementProjects, search, statusFilter]);

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
      {/* 2. CONTAINER DE PROJETOS DA GESTÃO: EXATAMENTE IGUAL AO PRINT 3           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        {filteredProjects.length === 0 ? (
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
            {filteredProjects.map((project) => {
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
                  className="group relative flex items-center justify-between p-2.5 sm:px-4 sm:py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-xs"
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

            {/* Grade de Cards Compactos */}
            <div
              className={cn(
                "grid gap-3.5",
                cardColumns === 5
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {filteredProjects.map((project) => {
                const projectColor = project.color || "var(--primary)";
                const stats = projectTaskStats.get(project.id) || { total: 0, completed: 0 };
                const taskCount = stats.total || project._count?.tasks || 0;
                const projMembers = project.members ?? [];
                const pMemberCount = project._count?.members ?? (projMembers.length || 0);

                return (
                  <EntityCard
                    key={project.id}
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
                );
              })}
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
