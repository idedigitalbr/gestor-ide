import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";

// ============================================================================
// OPÇÕES DE ORDENAÇÃO (SORT)
// ============================================================================

export type ManagementSortOption =
  | "none"
  | "name-asc"
  | "name-desc"
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "created-asc"
  | "projects-desc"
  | "projects-asc"
  | "code-asc";

export const MANAGEMENT_SORT_LABELS: Record<ManagementSortOption, string> = {
  none: "Padrão",
  "name-asc": "Nome (A → Z)",
  "name-desc": "Nome (Z → A)",
  "updated-desc": "Última atualização (Recente)",
  "updated-asc": "Última atualização (Antiga)",
  "created-desc": "Data de criação (Mais nova)",
  "created-asc": "Data de criação (Mais antiga)",
  "projects-desc": "Mais projetos (Numérico ↓)",
  "projects-asc": "Menos projetos (Numérico ↑)",
  "code-asc": "Código / Sigla (A → Z)",
};

export type ProjectSortOption =
  | "none"
  | "name-asc"
  | "name-desc"
  | "dueDate-asc"
  | "dueDate-desc"
  | "priority-desc"
  | "priority-asc"
  | "updated-desc"
  | "created-desc"
  | "tasks-desc"
  | "tasks-asc"
  | "status-asc";

export const PROJECT_SORT_LABELS: Record<ProjectSortOption, string> = {
  none: "Padrão",
  "name-asc": "Nome (A → Z)",
  "name-desc": "Nome (Z → A)",
  "dueDate-asc": "Prazo (Mais próximo)",
  "dueDate-desc": "Prazo (Mais distante)",
  "priority-desc": "Prioridade (Maior)",
  "priority-asc": "Prioridade (Menor)",
  "updated-desc": "Última atualização (Recente)",
  "created-desc": "Data de criação (Mais nova)",
  "tasks-desc": "Mais tarefas (Numérico ↓)",
  "tasks-asc": "Menos tarefas (Numérico ↑)",
  "status-asc": "Status",
};

export type TaskSortOption =
  | "none"
  | "title-asc"
  | "title-desc"
  | "dueDate-asc"
  | "dueDate-desc"
  | "priority-desc"
  | "priority-asc"
  | "created-desc"
  | "updated-desc"
  | "status"
  | "assignee";

export const TASK_SORT_LABELS: Record<TaskSortOption, string> = {
  none: "Padrão / Manual",
  "title-asc": "Título (A → Z)",
  "title-desc": "Título (Z → A)",
  "dueDate-asc": "Prazo (Mais próximo)",
  "dueDate-desc": "Prazo (Mais distante)",
  "priority-desc": "Prioridade (Maior)",
  "priority-asc": "Prioridade (Menor)",
  "created-desc": "Data de criação (Mais nova)",
  "updated-desc": "Última atualização (Recente)",
  status: "Status",
  assignee: "Responsável",
};

// ============================================================================
// OPÇÕES DE AGRUPAMENTO (GROUP BY)
// ============================================================================

export type ManagementGroupBy = "none" | "status" | "visibility";

export const MANAGEMENT_GROUP_LABELS: Record<ManagementGroupBy, string> = {
  none: "Sem agrupamento",
  status: "Por Status",
  visibility: "Por Visibilidade",
};

export type ProjectGroupBy = "none" | "status" | "priority" | "visibility";

export const PROJECT_GROUP_LABELS: Record<ProjectGroupBy, string> = {
  none: "Sem agrupamento",
  status: "Por Status",
  priority: "Por Prioridade",
  visibility: "Por Visibilidade",
};

// ============================================================================
// OPÇÕES DE FILTROS (FILTERS)
// ============================================================================

export interface ManagementFilters {
  visibility: string; // 'all' | 'company' | 'unit' | 'team' | 'private'
  status: string; // 'all' | 'active' | 'in_progress' | 'paused' | 'completed' | 'archived'
  dateRange: string; // 'all' | 'today' | 'week' | 'month' | 'year'
  hasProjects: string; // 'all' | 'with_projects' | 'without_projects'
  tag: string; // 'all' | string
}

export const DEFAULT_MANAGEMENT_FILTERS: ManagementFilters = {
  visibility: "all",
  status: "all",
  dateRange: "all",
  hasProjects: "all",
  tag: "all",
};

export interface ProjectFilters {
  status: string; // 'all' | 'active' | 'in_progress' | 'paused' | 'completed' | 'planning'
  priority: string; // 'all' | 'urgent' | 'high' | 'medium' | 'low'
  visibility: string; // 'all' | 'company' | 'team' | 'private'
  dueDateRange: string; // 'all' | 'overdue' | 'today' | 'week' | 'month' | 'no_date'
  dateRange: string; // 'all' | 'today' | 'week' | 'month' | 'year'
  hasTasks: string; // 'all' | 'with_tasks' | 'without_tasks'
  tag: string; // 'all' | string
}

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  status: "all",
  priority: "all",
  visibility: "all",
  dueDateRange: "all",
  dateRange: "all",
  hasTasks: "all",
  tag: "all",
};

// ============================================================================
// HELPERS DE EXTRAÇÃO DE TAGS
// ============================================================================

/**
 * Extrai hashtags ou tags embutidas nos nomes e descrições das gestões
 */
export function extractManagementTags(managements: CrmProjectManagement[]): string[] {
  const tags = new Set<string>();
  const hashtagRegex = /#([\w\u00C0-\u017F-]+)/gi;

  for (const m of managements) {
    const text = `${m.name || ""} ${m.description || ""}`;
    let match: RegExpExecArray | null;
    while ((match = hashtagRegex.exec(text)) !== null) {
      tags.add(match[1].toLowerCase());
    }
  }

  return Array.from(tags).sort();
}

/**
 * Extrai hashtags ou tags embutidas nos projetos
 */
export function extractProjectTags(projects: CrmProject[]): string[] {
  const tags = new Set<string>();
  const hashtagRegex = /#([\w\u00C0-\u017F-]+)/gi;

  for (const p of projects) {
    const text = `${p.name || ""} ${p.description || ""}`;
    let match: RegExpExecArray | null;
    while ((match = hashtagRegex.exec(text)) !== null) {
      tags.add(match[1].toLowerCase());
    }
  }

  return Array.from(tags).sort();
}

// ============================================================================
// HELPERS DE DATA
// ============================================================================

function isWithinRange(dateStr: string | null | undefined, range: string): boolean {
  if (!dateStr || range === "all") return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
  const itemTime = d.getTime();

  if (range === "today") {
    return itemTime >= startOfDay && itemTime <= endOfDay;
  }
  if (range === "week") {
    const sevenDaysAgo = startOfDay - 7 * 24 * 60 * 60 * 1000;
    return itemTime >= sevenDaysAgo && itemTime <= endOfDay;
  }
  if (range === "month") {
    const thirtyDaysAgo = startOfDay - 30 * 24 * 60 * 60 * 1000;
    return itemTime >= thirtyDaysAgo && itemTime <= endOfDay;
  }
  if (range === "year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    return itemTime >= startOfYear;
  }
  return true;
}

function isWithinDueDateRange(dateStr: string | null | undefined, range: string, status?: string): boolean {
  if (range === "all") return true;
  if (!dateStr) return range === "no_date";
  if (range === "no_date") return false;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
  const itemTime = d.getTime();

  if (range === "overdue") {
    return itemTime < startOfDay && status !== "completed";
  }
  if (range === "today") {
    return itemTime >= startOfDay && itemTime <= endOfDay;
  }
  if (range === "week") {
    const endOfWeek = startOfDay + 7 * 24 * 60 * 60 * 1000;
    return itemTime >= startOfDay && itemTime <= endOfWeek;
  }
  if (range === "month") {
    const endOfMonth = startOfDay + 30 * 24 * 60 * 60 * 1000;
    return itemTime >= startOfDay && itemTime <= endOfMonth;
  }
  return true;
}

// ============================================================================
// ORDENAÇÃO E FILTRAGEM DE GESTÕES
// ============================================================================

export function filterManagements(
  managements: CrmProjectManagement[],
  filters: ManagementFilters,
  search: string = ""
): CrmProjectManagement[] {
  let list = managements;

  // Busca textual
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.code ?? "").toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q)
    );
  }

  // Visibilidade
  if (filters.visibility && filters.visibility !== "all") {
    list = list.filter((m) => (m.visibility || "company") === filters.visibility);
  }

  // Status
  if (filters.status && filters.status !== "all") {
    list = list.filter((m) => {
      const s = (m.status || "active").toLowerCase();
      return s === filters.status.toLowerCase();
    });
  }

  // Período de criação
  if (filters.dateRange && filters.dateRange !== "all") {
    list = list.filter((m) => isWithinRange(m.createdAt, filters.dateRange));
  }

  // Com / sem projetos
  if (filters.hasProjects && filters.hasProjects !== "all") {
    if (filters.hasProjects === "with_projects") {
      list = list.filter((m) => (m._count?.projects ?? 0) > 0);
    } else if (filters.hasProjects === "without_projects") {
      list = list.filter((m) => (m._count?.projects ?? 0) === 0);
    }
  }

  // Tag
  if (filters.tag && filters.tag !== "all") {
    const targetTag = filters.tag.toLowerCase();
    list = list.filter((m) => {
      const text = `${m.name || ""} ${m.description || ""}`.toLowerCase();
      return text.includes(`#${targetTag}`) || text.includes(targetTag);
    });
  }

  return list;
}

export function sortManagements(
  managements: CrmProjectManagement[],
  sortOption: ManagementSortOption
): CrmProjectManagement[] {
  if (sortOption === "none") return managements;

  const sorted = [...managements];

  sorted.sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      case "name-desc":
        return b.name.localeCompare(a.name, "pt-BR", { sensitivity: "base" });
      case "code-asc":
        return (a.code || "").localeCompare(b.code || "", "pt-BR", { sensitivity: "base" });
      case "updated-desc": {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      }
      case "updated-asc": {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeA - timeB;
      }
      case "created-desc": {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      case "created-asc": {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      case "projects-desc": {
        const countA = a._count?.projects ?? 0;
        const countB = b._count?.projects ?? 0;
        return countB - countA;
      }
      case "projects-asc": {
        const countA = a._count?.projects ?? 0;
        const countB = b._count?.projects ?? 0;
        return countA - countB;
      }
      default:
        return 0;
    }
  });

  return sorted;
}

// ============================================================================
// ORDENAÇÃO E FILTRAGEM DE PROJETOS
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function filterProjects(
  projects: CrmProject[],
  filters: ProjectFilters,
  search: string = "",
  projectTaskCounts?: Map<string, { total: number; completed: number }>
): CrmProject[] {
  let list = projects;

  // Busca textual
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    );
  }

  // Status
  if (filters.status && filters.status !== "all") {
    list = list.filter((p) => {
      const s = (p.status || "active").toLowerCase();
      if (filters.status === "active") {
        return !p.status || s === "active";
      }
      return s === filters.status.toLowerCase();
    });
  }

  // Prioridade
  if (filters.priority && filters.priority !== "all") {
    list = list.filter((p) => (p.priority || "medium").toLowerCase() === filters.priority.toLowerCase());
  }

  // Visibilidade
  if (filters.visibility && filters.visibility !== "all") {
    list = list.filter((p) => (p.visibility || "company") === filters.visibility);
  }

  // Prazo / Vencimento
  if (filters.dueDateRange && filters.dueDateRange !== "all") {
    list = list.filter((p) => isWithinDueDateRange(p.dueDate, filters.dueDateRange, p.status));
  }

  // Período de criação
  if (filters.dateRange && filters.dateRange !== "all") {
    list = list.filter((p) => isWithinRange(p.createdAt, filters.dateRange));
  }

  // Com / sem tarefas
  if (filters.hasTasks && filters.hasTasks !== "all") {
    list = list.filter((p) => {
      const taskCount = projectTaskCounts?.get(p.id)?.total ?? p._count?.tasks ?? 0;
      if (filters.hasTasks === "with_tasks") return taskCount > 0;
      if (filters.hasTasks === "without_tasks") return taskCount === 0;
      return true;
    });
  }

  // Tag
  if (filters.tag && filters.tag !== "all") {
    const targetTag = filters.tag.toLowerCase();
    list = list.filter((p) => {
      const text = `${p.name || ""} ${p.description || ""}`.toLowerCase();
      return text.includes(`#${targetTag}`) || text.includes(targetTag);
    });
  }

  return list;
}

export function sortProjects(
  projects: CrmProject[],
  sortOption: ProjectSortOption,
  projectTaskCounts?: Map<string, { total: number; completed: number }>
): CrmProject[] {
  if (sortOption === "none") return projects;

  const sorted = [...projects];

  sorted.sort((a, b) => {
    switch (sortOption) {
      case "name-asc":
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      case "name-desc":
        return b.name.localeCompare(a.name, "pt-BR", { sensitivity: "base" });
      case "dueDate-asc": {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case "dueDate-desc": {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      case "priority-desc": {
        const pA = PRIORITY_ORDER[(a.priority || "medium").toLowerCase()] ?? 2;
        const pB = PRIORITY_ORDER[(b.priority || "medium").toLowerCase()] ?? 2;
        return pB - pA;
      }
      case "priority-asc": {
        const pA = PRIORITY_ORDER[(a.priority || "medium").toLowerCase()] ?? 2;
        const pB = PRIORITY_ORDER[(b.priority || "medium").toLowerCase()] ?? 2;
        return pA - pB;
      }
      case "updated-desc": {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      }
      case "created-desc": {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      case "tasks-desc": {
        const countA = projectTaskCounts?.get(a.id)?.total ?? a._count?.tasks ?? 0;
        const countB = projectTaskCounts?.get(b.id)?.total ?? b._count?.tasks ?? 0;
        return countB - countA;
      }
      case "tasks-asc": {
        const countA = projectTaskCounts?.get(a.id)?.total ?? a._count?.tasks ?? 0;
        const countB = projectTaskCounts?.get(b.id)?.total ?? b._count?.tasks ?? 0;
        return countA - countB;
      }
      case "status-asc":
        return (a.status || "active").localeCompare(b.status || "active");
      default:
        return 0;
    }
  });

  return sorted;
}

// ============================================================================
// ORDENAÇÃO DE TAREFAS
// ============================================================================

const TASK_PRIORITY_ORDER: Record<string, number> = {
  urgente: 4,
  alta: 3,
  normal: 2,
  media: 2,
  média: 2,
  baixa: 1,
};

export function sortTasks(tasks: Task[], sortOption: TaskSortOption): Task[] {
  if (sortOption === "none") return tasks;

  const sorted = [...tasks];

  sorted.sort((a, b) => {
    switch (sortOption) {
      case "title-asc":
        return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
      case "title-desc":
        return b.title.localeCompare(a.title, "pt-BR", { sensitivity: "base" });
      case "dueDate-asc": {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case "dueDate-desc": {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      case "priority-desc": {
        const pA = TASK_PRIORITY_ORDER[(a.priority || "normal").toLowerCase()] ?? 2;
        const pB = TASK_PRIORITY_ORDER[(b.priority || "normal").toLowerCase()] ?? 2;
        return pB - pA;
      }
      case "priority-asc": {
        const pA = TASK_PRIORITY_ORDER[(a.priority || "normal").toLowerCase()] ?? 2;
        const pB = TASK_PRIORITY_ORDER[(b.priority || "normal").toLowerCase()] ?? 2;
        return pA - pB;
      }
      case "created-desc": {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      case "updated-desc": {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      }
      case "status":
        return a.status.localeCompare(b.status);
      case "assignee":
        return (a.assignee || "").localeCompare(b.assignee || "");
      default:
        return 0;
    }
  });

  return sorted;
}

// ============================================================================
// CONTAGEM DE FILTROS ATIVOS
// ============================================================================

export function countActiveManagementFilters(filters: ManagementFilters): number {
  let count = 0;
  if (filters.visibility && filters.visibility !== "all") count++;
  if (filters.status && filters.status !== "all") count++;
  if (filters.dateRange && filters.dateRange !== "all") count++;
  if (filters.hasProjects && filters.hasProjects !== "all") count++;
  if (filters.tag && filters.tag !== "all") count++;
  return count;
}

export function countActiveProjectFilters(filters: ProjectFilters): number {
  let count = 0;
  if (filters.status && filters.status !== "all") count++;
  if (filters.priority && filters.priority !== "all") count++;
  if (filters.visibility && filters.visibility !== "all") count++;
  if (filters.dueDateRange && filters.dueDateRange !== "all") count++;
  if (filters.dateRange && filters.dateRange !== "all") count++;
  if (filters.hasTasks && filters.hasTasks !== "all") count++;
  if (filters.tag && filters.tag !== "all") count++;
  return count;
}
