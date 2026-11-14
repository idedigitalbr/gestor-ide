"use client";

import React, { useMemo, useState } from "react";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import {
  Folder,
  CheckCircle2,
  ListTodo,
  Calendar,
  Users,
  Shield,
  ArrowLeft,
  ArrowRight,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { MembersDialog, type TeamMemberItem } from "@/components/members-dialog";
import {
  MANAGEMENT_VISIBILITY_LABELS,
  PROJECT_STATUS_LABELS,
  type ListDisplayMode,
} from "@/lib/list-view-options";
import { cn } from "@/lib/utils";

interface ManagementProjectsViewProps {
  search: string;
  statusFilter: string;
  viewMode: ListDisplayMode;
  management: CrmProjectManagement;
  projects: CrmProject[];
  tasks: Task[];
  isConnectedCrm?: boolean;
  canWrite?: boolean;
  canManageMembers?: boolean;
  onCreateProject?: () => void;
  onBack?: () => void;
  onSelectProject: (projectId: string) => void;
}

const PRIORITY_TONES: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "Baixa", bg: "bg-blue-500/10", text: "text-blue-500" },
  medium: { label: "Média", bg: "bg-amber-500/10", text: "text-amber-500" },
  high: { label: "Alta", bg: "bg-orange-500/10", text: "text-orange-500" },
  urgent: { label: "Urgente", bg: "bg-rose-500/10", text: "text-rose-500" },
};

function SectionToggleButton({
  isExpanded,
  onToggle,
  title,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="size-7 rounded-md border border-border bg-card/80 text-muted-foreground hover:text-foreground hover:bg-muted/70 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
      title={isExpanded ? `Recolher ${title}` : `Expandir ${title}`}
      aria-label={isExpanded ? `Recolher ${title}` : `Expandir ${title}`}
      aria-expanded={isExpanded}
    >
      <ChevronRight
        className={cn(
          "size-4 transition-transform duration-200",
          isExpanded && "rotate-90"
        )}
      />
    </button>
  );
}

export function ManagementProjectsView({
  search,
  statusFilter,
  viewMode,
  management,
  projects,
  tasks,
  isConnectedCrm = false,
  canWrite = true,
  canManageMembers = false,
  onCreateProject,
  onBack,
  onSelectProject,
}: ManagementProjectsViewProps) {
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [remoteMemberIds, setRemoteMemberIds] = useState<string[] | null>(null);

  // Estados de recolhimento das seções com persistência
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(() => {
    try {
      return localStorage.getItem("gestor_mgmt_header_expanded") === "true";
    } catch {
      return false; // Minimalista e compacto por padrão para dar destaque aos cards de projetos!
    }
  });

  const [isProjectsExpanded, setIsProjectsExpanded] = useState(() => {
    try {
      return localStorage.getItem("gestor_mgmt_projects_expanded") !== "false";
    } catch {
      return true;
    }
  });

  function toggleHeader() {
    setIsHeaderExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("gestor_mgmt_header_expanded", String(next)); } catch {}
      return next;
    });
  }

  function toggleProjects() {
    setIsProjectsExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem("gestor_mgmt_projects_expanded", String(next)); } catch {}
      return next;
    });
  }

  // Projetos que pertencem a esta gestão
  const managementProjects = useMemo(() => {
    return projects.filter((p) => p.projectManagementId === management.id);
  }, [projects, management.id]);

  const resolvedMembers = useMemo<TeamMemberItem[]>(() => {
    const byId = new Map<string, TeamMemberItem>();
    for (const m of management.members ?? []) {
      const uid = m.userId || m.user?.id;
      if (!uid) continue;
      byId.set(uid, {
        userId: uid,
        name: m.user?.name,
        email: m.user?.email,
        avatarUrl: m.user?.avatarUrl,
        role: m.role,
      });
    }
    for (const proj of managementProjects) {
      for (const m of proj.members ?? []) {
        const uid = m.userId || m.user?.id;
        if (!uid) continue;
        const existing = byId.get(uid);
        if (!existing) {
          byId.set(uid, {
            userId: uid,
            name: m.user?.name,
            email: m.user?.email,
            avatarUrl: m.user?.avatarUrl,
            role: m.role,
          });
        } else if (!existing.name && m.user?.name) {
          byId.set(uid, {
            ...existing,
            name: m.user.name,
            email: existing.email ?? m.user.email,
            avatarUrl: existing.avatarUrl ?? m.user.avatarUrl,
          });
        }
      }
    }
    for (const uid of remoteMemberIds ?? []) {
      if (!byId.has(uid)) {
        byId.set(uid, { userId: uid });
      }
    }
    return Array.from(byId.values());
  }, [management.members, managementProjects, remoteMemberIds]);

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

  // Contadores KPI
  const completedProjectsCount = useMemo(() => {
    return managementProjects.filter((p) => p.status === "completed").length;
  }, [managementProjects]);

  const activeProjectsCount = useMemo(() => {
    return managementProjects.filter((p) => p.status !== "completed" && p.status !== "archived").length;
  }, [managementProjects]);

  const totalTasksCount = useMemo(() => {
    // Soma de tarefas dos projetos da gestão
    const projectIds = new Set(managementProjects.map((p) => p.id));
    const tasksInMgmt = tasks.filter((t) => t.projectId && projectIds.has(t.projectId));
    if (tasksInMgmt.length > 0) return tasksInMgmt.length;

    // Fallback para contagem reportada pela API nos projetos
    return managementProjects.reduce((acc, p) => acc + (p._count?.tasks ?? 0), 0);
  }, [managementProjects, tasks]);

  // Filtragem
  const filteredProjects = useMemo(() => {
    let list = managementProjects;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [managementProjects, statusFilter, search]);

  const initials = management.name.trim().slice(0, 2).toUpperCase() || "GE";
  const mgmtColor = management.color || "#2563eb";
  const memberCount = management._count?.members ?? (management.members?.length || 0);

  const formattedDate = useMemo(() => {
    if (!management.createdAt) return "";
    try {
      const d = new Date(management.createdAt);
      return d.toLocaleDateString("pt-BR");
    } catch {
      return "";
    }
  }, [management.createdAt]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Seção Unificada: Cabeçalho da Gestão com Toggle Retrátil ("Uma coisa só") */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xs transition-all">
        {/* Linha Principal (Sempre Visível - minimalista quando recolhido) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title="Voltar para todas as gestões"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden md:inline">Gestões</span>
                </Button>
                <div className="h-4 w-px bg-border shrink-0" />
              </>
            )}

            <div
              className="size-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: mgmtColor }}
            >
              {initials}
            </div>

            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                {management.name}
              </h1>
              {management.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground shrink-0">
                  {management.code}
                </span>
              )}
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border bg-secondary/50 text-muted-foreground font-normal shrink-0">
                {managementProjects.length} {managementProjects.length === 1 ? "projeto" : "projetos"}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border bg-secondary/50 text-muted-foreground font-normal shrink-0">
                {memberCount} {memberCount === 1 ? "membro" : "membros"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {/* Avatares dos membros em miniatura */}
            {management.members && management.members.length > 0 && (
              <div className="flex -space-x-1.5 items-center mr-1">
                {management.members.slice(0, 4).map((m, idx) => (
                  <div
                    key={m.userId || idx}
                    className="size-6 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground"
                    title={m.user?.name || "Membro"}
                  >
                    <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                  </div>
                ))}
                {memberCount > 4 && (
                  <div className="size-6 rounded-full border-2 border-card bg-secondary text-secondary-foreground text-[8px] font-bold flex items-center justify-center shadow-2xs">
                    +{memberCount - 4}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={toggleHeader}
              className="size-8 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title={isHeaderExpanded ? "Recolher detalhes e métricas" : "Expandir detalhes e métricas"}
              aria-label={isHeaderExpanded ? "Recolher detalhes e métricas" : "Expandir detalhes e métricas"}
              aria-expanded={isHeaderExpanded}
            >
              <ChevronRight
                className={cn(
                  "size-4 transition-transform duration-200",
                  isHeaderExpanded && "rotate-90"
                )}
              />
            </button>
          </div>
        </div>

        {/* Detalhes & Métricas Expandidos ("Uma coisa só") */}
        {isHeaderExpanded && (
          <div className="border-t border-border/60 bg-muted/10 p-4 sm:p-5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Lado Esquerdo: Descrição e Metadados */}
              <div className="lg:col-span-5 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {management.description?.trim() || "Gestão das atividades e projetos relacionados."}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1">
                  {formattedDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground/80 shrink-0" />
                      <span>Criada em {formattedDate}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Shield className="size-3.5 text-muted-foreground/80 shrink-0" />
                    <span>
                      Visibilidade: {MANAGEMENT_VISIBILITY_LABELS[management.visibility || "company"] || management.visibility || "Empresa"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Folder className="size-3.5 text-muted-foreground/80 shrink-0" />
                    <span>Status: {management.status || "Ativa"}</span>
                  </span>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleOpenMembersDialog()}
                    className="h-7 px-2.5 text-[11px] gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3 h-3" />
                    <span>Ver membros ({resolvedMembers.length})</span>
                  </Button>
                </div>
              </div>

              {/* Lado Direito: Os 3 KPIs Compactos Lado a Lado */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Card 1: Projetos */}
                <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground">Projetos</span>
                    <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                      {managementProjects.length}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeProjectsCount} ativos de {managementProjects.length} no total
                    </p>
                  </div>
                  <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Folder className="size-4" />
                  </div>
                </div>

                {/* Card 2: Concluídos */}
                <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground">Concluídos</span>
                    <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                      {completedProjectsCount}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Projetos finalizados
                    </p>
                  </div>
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>

                {/* Card 3: Tarefas */}
                <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground">Tarefas</span>
                    <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                      {totalTasksCount}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Total de tarefas ativas
                    </p>
                  </div>
                  <div className="size-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <ListTodo className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção 3: Projetos da Gestão */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Projetos da gestão
            </h2>
            <p className="text-xs text-muted-foreground">
              Filtre o portfólio e abra cada workspace para acompanhar a execução.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs text-muted-foreground font-mono">
              {filteredProjects.length} de {managementProjects.length}
            </span>
            <SectionToggleButton
              isExpanded={isProjectsExpanded}
              onToggle={toggleProjects}
              title="projetos"
            />
          </div>
        </div>

        {isProjectsExpanded && (
          filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
            <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Nenhum projeto encontrado nesta gestão
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Nenhum projeto corresponde aos filtros aplicados ou ainda não há projetos cadastrados.
            </p>
            {onCreateProject && canWrite && (
              <Button
                type="button"
                size="sm"
                onClick={onCreateProject}
                className="h-8 gap-1.5 text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo projeto</span>
              </Button>
            )}
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProjects.map((project) => {
              const projectColor = project.color || "#3b82f6";
              const pInitials = project.name.trim().slice(0, 2).toUpperCase() || "PR";
              const taskCount = project._count?.tasks ?? 0;
              const pMemberCount = project._count?.members ?? (project.members?.length || 0);
              const priorityInfo =
                PRIORITY_TONES[project.priority || "medium"] || PRIORITY_TONES.medium;

              const formattedDueDate = project.dueDate
                ? new Date(`${project.dueDate.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
                : null;

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
                  {/* Top Colored Banner */}
                  <div
                    className="relative h-20 w-full p-3 flex items-start justify-between"
                    style={
                      project.coverPath
                        ? {
                            backgroundImage: `url("${encodeURI(project.coverPath)}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            background: `linear-gradient(135deg, ${projectColor}ee 0%, ${projectColor}99 100%)`,
                          }
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {/* Monograma flutuante */}
                    <div className="absolute -bottom-3 left-3 z-10">
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-card flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105"
                        style={{ backgroundColor: projectColor }}
                      >
                        {pInitials}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Card do Projeto */}
                  <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-xs md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        {project.code && (
                          <span className="shrink-0 text-[9px] font-mono px-1 py-0.2 rounded border border-border bg-muted/60 text-muted-foreground">
                            {project.code}
                          </span>
                        )}
                      </div>

                      {/* Tags / Prioridade / Data */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            priorityInfo.bg,
                            priorityInfo.text
                          )}
                        >
                          {priorityInfo.label}
                        </span>

                        {formattedDueDate && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{formattedDueDate}</span>
                          </span>
                        )}

                        {/* Avatares dos membros do projeto */}
                        {project.members && project.members.length > 0 && (
                          <div className="flex -space-x-1 items-center ml-auto">
                            {project.members.slice(0, 2).map((m, idx) => (
                              <div
                                key={m.userId || idx}
                                className="w-5 h-5 rounded-full border border-card bg-muted overflow-hidden flex items-center justify-center text-[8px] font-bold"
                              >
                                <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} initialsLength={1} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1">
                          <ListTodo className="w-3 h-3 shrink-0" />
                          <span>
                            {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                          </span>
                        </span>
                        {pMemberCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 shrink-0" />
                            <span>{pMemberCount}</span>
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
        ) : (
          /* Lista Compacta de Projetos */
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {filteredProjects.map((project) => {
              const projectColor = project.color || "#3b82f6";
              const pInitials = project.name.trim().slice(0, 2).toUpperCase() || "PR";
              const taskCount = project._count?.tasks ?? 0;
              const pMemberCount = project._count?.members ?? (project.members?.length || 0);

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
                  className="group flex items-center justify-between p-3 sm:p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: projectColor }}
                    >
                      {pInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </span>
                        {project.code && (
                          <span className="text-[9px] font-mono px-1 rounded border border-border bg-muted/60 text-muted-foreground">
                            {project.code}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border">
                          {PROJECT_STATUS_LABELS[project.status] || project.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-3">
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>
                        {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{pMemberCount}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <MembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        title={`Membros de ${management.name}`}
        description="Integrantes vinculados a esta gestão e aos seus projetos no IDE CRM."
        members={resolvedMembers}
        loading={loadingMembers}
        error={membersError}
        canManageMembers={canManageMembers}
      />
    </div>
  );
}
