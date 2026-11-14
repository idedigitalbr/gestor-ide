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
  Users,
  ArrowRight,
  Plus,
  ChevronRight,
  FileText,
  Play,
  Clock,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { EntityHeader, type HeaderKpiItem } from "@/components/entity-header";
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
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  isConnectedCrm?: boolean;
  canWrite?: boolean;
  canManageMembers?: boolean;
  onCreateProject?: () => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onSelectProject: (projectId: string) => void;
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
  currentUserId = null,
  currentUserEmail = null,
  isConnectedCrm = false,
  canWrite = true,
  canManageMembers = false,
  onCreateProject,
  onRefresh,
  onBack,
  onSelectProject,
}: ManagementProjectsViewProps) {
  // Estados de membros
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [remoteMemberIds, setRemoteMemberIds] = useState<string[] | null>(null);
  const [localRoleOverrides, setLocalRoleOverrides] = useState<Map<string, string>>(new Map());
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set());

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
    return Array.from(byId.values());
  }, [management.members, managementProjects, remoteMemberIds, removedUserIds, localRoleOverrides]);

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

  async function handleAddMember(data: { emailOrId: string; role: CanonicalMemberRole }) {
    if (!isConnectedCrm) {
      setRemoteMemberIds((prev) => [...(prev ?? []), data.emailOrId]);
      setLocalRoleOverrides((prev) => new Map(prev).set(data.emailOrId, data.role));
      return;
    }
    try {
      await ideCrmClient.addManagementMember(management.id, {
        email: data.emailOrId.includes("@") ? data.emailOrId : undefined,
        userId: !data.emailOrId.includes("@") ? data.emailOrId : undefined,
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
                        <div className="flex -space-x-1.5 items-center">
                          {projMembers.slice(0, 2).map((m, idx) => (
                            <div
                              key={m.userId || idx}
                              className="size-7 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground ring-1 ring-border"
                              title={m.user?.name || "Membro"}
                            >
                              <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                            </div>
                          ))}
                          {projMembers.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-mono pl-1">
                              +{projMembers.length - 2}
                            </span>
                          )}
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
                const displayProjectName = stripProjectPrefix(project.name);
                const pInitials = project.name.trim().slice(0, 2).toUpperCase() || "PR";
                const stats = projectTaskStats.get(project.id) || { total: 0, completed: 0 };
                const taskCount = stats.total || project._count?.tasks || 0;
                const projMembers = project.members ?? [];
                const pMemberCount = project._count?.members ?? (projMembers.length || 0);
                const bgColor = projectColor;

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
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xs transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Banner Superior com Cor ou Imagem */}
                    <div
                      className="relative h-24 w-full p-3 flex items-start justify-between"
                      style={
                        project.coverPath
                          ? {
                              backgroundImage: `url("${encodeURI(project.coverPath)}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : {
                              background: `linear-gradient(135deg, ${bgColor}ee 0%, ${bgColor}99 100%)`,
                            }
                      }
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                      {/* Monograma flutuante na base do banner */}
                      <div className="absolute -bottom-3 left-3 z-10">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-card flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105"
                          style={{ backgroundColor: bgColor }}
                        >
                          {pInitials}
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                            Projeto
                          </span>
                          <h3 className="font-semibold text-xs md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {displayProjectName}
                          </h3>
                        </div>
                        {project.description?.trim() && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {project.description.trim()}
                          </p>
                        )}
                      </div>

                      {/* Rodapé do Card */}
                      <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1">
                            <ListTodo className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                            </span>
                          </span>
                          {pMemberCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>{pMemberCount}</span>
                              {projMembers && projMembers.length > 0 && (
                                <div className="flex -space-x-1.5 items-center ml-1">
                                  {projMembers.slice(0, 3).map((m, idx) => (
                                    <div
                                      key={m.userId || idx}
                                      className="w-5 h-5 rounded-full border-1.5 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[8px] font-bold text-foreground"
                                      title={m.user?.name || "Membro"}
                                    >
                                      <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                                    </div>
                                  ))}
                                  {pMemberCount > 3 && (
                                    <div className="w-5 h-5 rounded-full border-1.5 border-card bg-secondary text-secondary-foreground text-[8px] font-bold flex items-center justify-center shadow-2xs">
                                      +{pMemberCount - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="text-muted-foreground group-hover:text-primary transition-colors">
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
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
