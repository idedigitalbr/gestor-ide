"use client";

import React, { useMemo } from "react";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";
import { computeProjectTasksSummary } from "@gestor-ide/core";
import { ListTodo, CheckCircle2, Clock, Folder } from "lucide-react";
import { EntityHeader, type HeaderKpiItem } from "@/components/entity-header";
import type { TeamMemberItem } from "@/components/members-dialog";
import { stripManagementPrefix } from "@/lib/list-view-options";

export interface ProjectHeaderProps {
  project: CrmProject;
  management?: CrmProjectManagement | null;
  tasks: Task[];
  members?: TeamMemberItem[];
  canWrite?: boolean;
  isConnectedCrm?: boolean;
  onOpenMembers?: () => void;
  onBack?: () => void;
  onUpdateProject?: (updates: {
    description?: string;
    status?: string;
    priority?: string;
    name?: string;
    dueDate?: string | null;
    visibility?: string;
  }) => Promise<void> | void;
  onRefresh?: () => void;
  className?: string;
}

export function ProjectHeader({
  project,
  management,
  tasks,
  members,
  canWrite = true,
  onOpenMembers,
  onBack,
  onUpdateProject,
  onRefresh,
  className,
}: ProjectHeaderProps) {
  // Contagem de tarefas e cálculo do escopo completo do projeto
  const projectTasks = useMemo(() => {
    const list = tasks.filter((t) => t.projectId === project.id);
    return list.length > 0 ? list : tasks;
  }, [tasks, project.id]);

  const summary = useMemo(() => {
    return computeProjectTasksSummary(projectTasks, project._count?.tasks);
  }, [projectTasks, project._count?.tasks]);

  // Iniciais e cor do projeto
  const projectColor = project.color || management?.color || "var(--primary)";

  // Integrantes resolvidos
  const resolvedMembers = useMemo<TeamMemberItem[]>(() => {
    if (members && members.length > 0) return members;
    if (project.members && project.members.length > 0) {
      const list: TeamMemberItem[] = [];
      for (const m of project.members) {
        const uid = m.userId || m.user?.id;
        if (!uid) continue;
        list.push({
          userId: uid,
          name: m.user?.name,
          email: m.user?.email,
          avatarUrl: m.user?.avatarUrl,
          role: m.role,
        });
      }
      return list;
    }
    return [];
  }, [members, project.members]);

  const memberCount = resolvedMembers.length || project._count?.members || 1;

  // 3 KPIs do Projeto
  const kpis = useMemo<HeaderKpiItem[]>(() => {
    if (summary.hasSubtasks) {
      return [
        {
          key: "tasks",
          label: "Tarefas & Itens",
          value: summary.totalItems,
          subValue: `(${summary.directTasksCount} tarefas)`,
          tooltip: `${summary.directTasksCount} tarefas principais e ${summary.totalSubtasks} subtarefas/checklists (${summary.totalItems} itens no total)`,
          icon: <ListTodo className="size-4 text-blue-400" />,
          iconBgColor: "bg-blue-500/10 text-blue-400",
        },
        {
          key: "completed",
          label: "Concluídas",
          value: summary.completedItems,
          subValue: `(${summary.percent}%)`,
          tooltip: `${summary.completedItems} de ${summary.totalItems} itens concluídos (${summary.percent}%)`,
          icon: <CheckCircle2 className="size-4 text-emerald-400" />,
          iconBgColor: "bg-emerald-500/10 text-emerald-400",
        },
        {
          key: "pending",
          label: "Pendentes",
          value: summary.pendingItems,
          subValue: `(${100 - summary.percent}%)`,
          tooltip: `${summary.pendingItems} itens pendentes de execução`,
          icon: <Clock className="size-4 text-purple-400" />,
          iconBgColor: "bg-purple-500/10 text-purple-400",
        },
      ];
    }

    return [
      {
        key: "tasks",
        label: "Tarefas",
        value: summary.totalItems,
        tooltip: `${summary.totalItems} tarefas no projeto`,
        icon: <ListTodo className="size-4 text-blue-400" />,
        iconBgColor: "bg-blue-500/10 text-blue-400",
      },
      {
        key: "completed",
        label: "Concluídas",
        value: summary.completedItems,
        subValue: summary.totalItems > 0 ? `(${summary.percent}%)` : undefined,
        tooltip: `${summary.completedItems} de ${summary.totalItems} tarefas concluídas (${summary.percent}%)`,
        icon: <CheckCircle2 className="size-4 text-emerald-400" />,
        iconBgColor: "bg-emerald-500/10 text-emerald-400",
      },
      {
        key: "pending",
        label: "Pendentes",
        value: summary.pendingItems,
        tooltip: `${summary.pendingItems} tarefas pendentes de execução`,
        icon: <Clock className="size-4 text-purple-400" />,
        iconBgColor: "bg-purple-500/10 text-purple-400",
      },
    ];
  }, [summary]);

  // Parent badge (Gestão)
  const parentBadge = useMemo(() => {
    if (!management?.name) return null;
    return {
      icon: <Folder className="size-3 text-blue-400 shrink-0" />,
      label: stripManagementPrefix(management.name),
      onClick: onBack,
    };
  }, [management, onBack]);

  return (
    <EntityHeader
      type="project"
      id={project.id}
      name={project.name}
      description={project.description}
      code={project.code}
      color={projectColor}
      createdAt={project.createdAt}
      dueDate={project.dueDate}
      status={project.status}
      visibility={project.visibility}
      parentBadge={parentBadge}
      kpis={kpis}
      members={resolvedMembers}
      memberCount={memberCount}
      onOpenMembers={onOpenMembers}
      canWrite={canWrite}
      onUpdate={onUpdateProject}
      onRefresh={onRefresh}
      className={className}
    />
  );
}
