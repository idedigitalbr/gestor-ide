// @gestor-ide/core — Contratos de domínio e mapeadores bidirecionais (IDE Gestor <-> IDE CRM)

export type TaskStatus = "A Fazer" | "Em Andamento" | "Em Revisão" | "Concluído";

export type TaskPriority = "Baixa" | "Média" | "Alta" | "Urgente";

export type ViewMode = "table" | "kanban";

export type AppModuleSection =
  | "tasks"
  | "clients"
  | "crm"
  | "finance"
  | "members";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tag?: string;
  estimate?: string;
  projectId?: string;
  projectName?: string;
  subtasks?: Subtask[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt?: string;
}

export type TaskFilter = {
  search: string;
  status: TaskStatus | "Todos";
  priority: TaskPriority | "Todas";
};

// ============================================================================
// Contratos da API Central do IDE CRM
// ============================================================================

export interface CrmModuleAccess {
  crm: boolean;
  projects: boolean;
  finance: boolean;
}

export interface CrmUserProfile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  modules: CrmModuleAccess;
}

export interface CrmProjectManagement {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  status?: string;
}

export interface CrmProject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status: string;
  priority?: string;
  projectManagementId: string;
  projectManagement?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  _count?: {
    tasks: number;
    members: number;
  };
}

export interface CrmChecklistItem {
  id: string;
  taskId: string;
  parentId?: string | null;
  title: string;
  completed: boolean;
  position?: number;
}

export interface CrmProjectComment {
  id: string;
  taskId?: string | null;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}

export interface CrmProjectTask {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  position?: number;
  startDate?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt?: string;
  project?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  checklistItems?: CrmChecklistItem[];
  comments?: CrmProjectComment[];
  assignees?: Array<{
    userId: string;
    role?: string;
    user?: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl?: string | null;
    };
  }>;
}

export interface CrmContact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  status?: string | null;
  company?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface CrmCompany {
  id: string;
  name: string;
  legalName?: string | null;
  document?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  _count?: {
    contacts?: number;
    leads?: number;
  };
}

export interface CrmLead {
  id: string;
  title: string;
  value?: number | string | null;
  temperature?: string | null;
  status?: string | null;
  stage?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  contact?: {
    id: string;
    fullName: string;
    email?: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface CrmFinancialEntry {
  id: string;
  type: "PAYABLE" | "RECEIVABLE";
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  description: string;
  amount: number | string;
  dueDate: string;
  category?: {
    id: string;
    name: string;
  } | string | null;
  categoryName?: string | null;
  financialCategory?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  contactProfile?: {
    id: string;
    displayName: string;
  } | null;
  financialContactName?: string | null;
}

export interface CrmFinancialSummary {
  totalReceivable?: number;
  totalPayable?: number;
  paidReceivable?: number;
  paidPayable?: number;
  balance?: number;
  overdueCount?: number;
}

export interface CrmProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  project?: {
    id: string;
    name: string;
  } | null;
}

// ============================================================================
// Mapeadores Bidirecionais (IDE CRM <-> IDE Gestor)
// ============================================================================

export function mapCrmStatusToGestor(crmStatus?: string | null): TaskStatus {
  const normalized = (crmStatus ?? "pending").toLowerCase().trim();
  if (
    normalized === "completed" ||
    normalized === "concluido" ||
    normalized === "concluído" ||
    normalized === "done"
  ) {
    return "Concluído";
  }
  if (
    normalized === "in_review" ||
    normalized === "review" ||
    normalized === "em_revisao" ||
    normalized === "em revisão" ||
    normalized === "testing"
  ) {
    return "Em Revisão";
  }
  if (
    normalized === "in_progress" ||
    normalized === "doing" ||
    normalized === "em_andamento" ||
    normalized === "em andamento" ||
    normalized === "active"
  ) {
    return "Em Andamento";
  }
  return "A Fazer";
}

export function mapGestorStatusToCrm(status: TaskStatus): string {
  switch (status) {
    case "Concluído":
      return "completed";
    case "Em Revisão":
      return "in_review";
    case "Em Andamento":
      return "in_progress";
    case "A Fazer":
    default:
      return "pending";
  }
}

export function mapCrmPriorityToGestor(crmPriority?: string | null): TaskPriority {
  const normalized = (crmPriority ?? "medium").toLowerCase().trim();
  if (normalized === "urgent" || normalized === "urgente" || normalized === "critical") {
    return "Urgente";
  }
  if (normalized === "high" || normalized === "alta") {
    return "Alta";
  }
  if (normalized === "low" || normalized === "baixa") {
    return "Baixa";
  }
  return "Média";
}

export function mapGestorPriorityToCrm(
  priority: TaskPriority
): "low" | "medium" | "high" | "urgent" {
  switch (priority) {
    case "Urgente":
      return "urgent";
    case "Alta":
      return "high";
    case "Baixa":
      return "low";
    case "Média":
    default:
      return "medium";
  }
}

export function formatEstimateFromMinutes(minutes?: number | null): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  if (minutes % 480 === 0) {
    return `${minutes / 480}d`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}

export function parseEstimateToMinutes(estimate?: string | null): number | null {
  if (!estimate) return null;
  const trimmed = estimate.trim().toLowerCase();
  if (!trimmed) return null;

  const dayMatch = /^(\d+(?:\.\d+)?)\s*d$/.exec(trimmed);
  if (dayMatch?.[1]) {
    return Math.round(parseFloat(dayMatch[1]) * 480);
  }

  const hourMatch = /^(\d+(?:\.\d+)?)\s*h$/.exec(trimmed);
  if (hourMatch?.[1]) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }

  const minMatch = /^(\d+)\s*m(?:in)?$/.exec(trimmed);
  if (minMatch?.[1]) {
    return parseInt(minMatch[1], 10);
  }

  const plainNum = Number(trimmed);
  if (Number.isFinite(plainNum) && plainNum > 0) {
    return Math.round(plainNum * 60);
  }

  return null;
}

export function mapCrmTaskToGestorTask(crmTask: CrmProjectTask, index = 0): Task {
  const prefix = crmTask.project?.code?.toUpperCase() || "IDE";
  const shortSuffix = crmTask.id.slice(-3).toUpperCase();
  const code = `${prefix}-${101 + index}${shortSuffix ? "" : ""}`;

  const dueDate = crmTask.dueDate
    ? crmTask.dueDate.slice(0, 10)
    : undefined;

  const tags = Array.isArray(crmTask.tags) ? crmTask.tags : [];
  const primaryTag = tags[0] ?? crmTask.project?.name;

  const subtasks: Subtask[] = (crmTask.checklistItems ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    completed: Boolean(item.completed),
  }));

  const comments: TaskComment[] = (crmTask.comments ?? []).map((comment) => ({
    id: comment.id,
    author: comment.user?.name || comment.user?.email || "Equipe IDE",
    avatar: comment.user?.avatarUrl ?? undefined,
    content: comment.content,
    createdAt: comment.createdAt,
  }));

  return {
    id: crmTask.id,
    code,
    title: crmTask.title,
    description: crmTask.description ?? "",
    status: mapCrmStatusToGestor(crmTask.status),
    priority: mapCrmPriorityToGestor(crmTask.priority),
    dueDate,
    tag: primaryTag,
    estimate: formatEstimateFromMinutes(crmTask.estimateMinutes),
    projectId: crmTask.projectId,
    projectName: crmTask.project?.name,
    subtasks,
    comments,
    createdAt: crmTask.createdAt,
    updatedAt: crmTask.updatedAt,
  };
}

export function mapGestorTaskToCrmCreateInput(
  task: Omit<Task, "id" | "createdAt" | "code">,
  projectId: string
) {
  return {
    projectId,
    title: task.title.trim(),
    description: task.description?.trim() || null,
    status: mapGestorStatusToCrm(task.status),
    priority: mapGestorPriorityToCrm(task.priority),
    dueDate: task.dueDate ? task.dueDate : null,
    estimateMinutes: parseEstimateToMinutes(task.estimate),
    tags: task.tag?.trim() ? [task.tag.trim()] : [],
  };
}

export function mapGestorTaskToCrmUpdateInput(task: Partial<Task>) {
  const payload: Record<string, unknown> = {};
  if (task.title !== undefined) payload.title = task.title.trim();
  if (task.description !== undefined) payload.description = task.description.trim() || null;
  if (task.status !== undefined) payload.status = mapGestorStatusToCrm(task.status);
  if (task.priority !== undefined) payload.priority = mapGestorPriorityToCrm(task.priority);
  if (task.dueDate !== undefined) payload.dueDate = task.dueDate || null;
  if (task.estimate !== undefined) payload.estimateMinutes = parseEstimateToMinutes(task.estimate);
  if (task.tag !== undefined) payload.tags = task.tag.trim() ? [task.tag.trim()] : [];
  return payload;
}
