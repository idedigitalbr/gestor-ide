// @gestor-ide/core — Contratos de domínio e mapeadores bidirecionais (IDE Gestor <-> IDE CRM)

export type CanonicalTaskStatus =
  | "PENDENTE"
  | "FAZENDO AGORA"
  | "AGUARDANDO FEEDBACK"
  | "BLOQUEADO"
  | "CONCLUÍDO";

export type TaskStatus =
  | CanonicalTaskStatus
  | "A Fazer"
  | "Em Andamento"
  | "Em Revisão"
  | "Concluído"
  | "Refação";

export type CanonicalTaskPriority = "Baixa" | "Normal" | "Alta" | "Urgente";

export type TaskPriority = CanonicalTaskPriority | "Média";

export type ViewMode = "table" | "kanban" | "calendar" | "gantt" | "workload";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  group?: string;
  inProgress?: boolean;
  dueDate?: string;
  assignee?: string;
  assigneeAvatar?: string;
  parentId?: string;
  items?: Subtask[];
}

export interface TaskComment {
  id: string;
  author: string;
  avatar?: string;
  timeAgo?: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  tag?: string;
  tags?: string[];
  estimate?: string;
  projectId?: string;
  projectName?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  assignee?: string;
  assigneeAvatar?: string;
  coverUrl?: string;
  icon?: string;
  itemType?: string;
  parentTaskId?: string;
  customGroup?: string;
  subtasks?: Subtask[];
  comments?: TaskComment[];
  createdAt: string;
  updatedAt?: string;
}

export type TaskGroupBy =
  | "none"
  | "status"
  | "assignee"
  | "priority"
  | "tag"
  | "dueDate"
  | "taskType";

export type GroupOrder = "asc" | "desc";

export type TaskFilter = {
  search: string;
  status: TaskStatus | "Todos";
  priority: TaskPriority | "Todas";
  statuses?: string[];
  assignees?: string[];
  priorities?: string[];
  tags?: string[];
  dueDateCategory?: string | null;
  taskType?: string | null;
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

export interface CrmAccount { id: string; name: string | null; email: string; avatarUrl: string | null }
export interface CrmNotification {
  id: string;
  title: string;
  message: string | null;
  createdAt: string;
  readAt: string | null;
  taskId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  status?: string | null;
}
export type CrmCalendarEventType = "MEETING" | "DELIVERY" | "OTHER";
export type CrmCalendarEventStatus = "CONFIRMED" | "TENTATIVE" | "CANCELLED";
export type CrmCalendarEventPriority = "LOW" | "MEDIUM" | "HIGH";
export type CrmCalendarMeetingMode = "ONLINE" | "IN_PERSON";
export type CrmCalendarRecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type CrmCalendarMutationScope = "OCCURRENCE" | "FOLLOWING" | "SERIES";

export interface CrmCalendarPerson {
  id: string;
  name: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

export interface CrmCalendarRecurrenceRule {
  frequency: CrmCalendarRecurrenceFrequency;
  interval: number;
  count: number;
}

export interface CrmCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: CrmCalendarEventType;
  status: CrmCalendarEventStatus;
  priority: CrmCalendarEventPriority;
  projectId: string | null;
  project?: { id: string; name: string; code?: string | null } | null;
  organizer?: CrmCalendarPerson;
  isAllDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
  allDayStartDate: string | null;
  allDayEndDate: string | null;
  timeZone: string;
  meetingMode: CrmCalendarMeetingMode | null;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  reminderMinutes: number | null;
  participants: Array<{ user: CrmCalendarPerson }>;
  seriesId?: string;
  occurrenceKey?: string;
  seriesStartsAt?: string | null;
  seriesEndsAt?: string | null;
  seriesAllDayStartDate?: string | null;
  seriesAllDayEndDate?: string | null;
  recurrenceRule?: CrmCalendarRecurrenceRule | null;
}

export interface CrmCalendarTaskItem {
  id: string;
  projectId?: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  startDate: string | null;
  dueDate: string | null;
  project?: { id: string; name: string; code?: string | null } | null;
  assignees?: Array<{ user: CrmCalendarPerson }>;
}

export interface CrmCalendarAvailabilityConflict {
  start: string;
  end: string;
}

export interface CrmCalendarAvailabilityResult {
  userId: string;
  status: "AVAILABLE" | "BUSY";
  conflicts: CrmCalendarAvailabilityConflict[];
}

export interface CrmCalendarBusyInterval {
  userId: string;
  start: string;
  end: string;
}

export interface CrmCalendarSuggestedSlot {
  start: string;
  end: string;
}
export interface CrmProjectsDashboard {
  generatedAt: string;
  metrics: { totalManagements: number; activeManagements: number; totalProjects: number; openTasks: number; overdueTasks: number; unassignedOpenTasks: number; totalMembers: number };
  statusDistribution: { status: string; label: string; count: number; percentage: number }[];
  managements: { id: string; name: string; projects: number; openTasks: number; overdueTasks: number; progress: number }[];
  insights: { title: string; description: string; rule: string; severity: string }[];
}

export interface CrmProjectManagement {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  color?: string | null;
  coverPath?: string | null;
  visibility?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  members?: Array<{
    userId?: string;
    role?: string;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    };
  }>;
  _count?: {
    projects?: number;
    members?: number;
  };
}

export interface CrmProject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status: string;
  priority?: string;
  color?: string | null;
  coverPath?: string | null;
  visibility?: string;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  projectManagementId: string;
  projectManagement?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  members?: Array<{
    userId?: string;
    role?: string;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    };
  }>;
  _count?: {
    tasks?: number;
    members?: number;
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

export function normalizeTaskStatus(status?: string | null): CanonicalTaskStatus {
  if (!status) return "PENDENTE";
  const normalized = status.toUpperCase().trim();
  if (
    normalized.includes("CONCLU") ||
    normalized === "COMPLETED" ||
    normalized === "DONE"
  ) {
    return "CONCLUÍDO";
  }
  if (
    normalized.includes("BLOQUE") ||
    normalized.includes("BLOCK") ||
    normalized.includes("REFA")
  ) {
    return "BLOQUEADO";
  }
  if (
    normalized.includes("FEEDBACK") ||
    normalized.includes("REVIS") ||
    normalized === "IN_REVIEW" ||
    normalized === "REVIEW"
  ) {
    return "AGUARDANDO FEEDBACK";
  }
  if (
    normalized.includes("FAZENDO") ||
    normalized.includes("ANDAMENTO") ||
    normalized.includes("INICIAD") ||
    normalized === "STARTED" ||
    normalized === "IN_PROGRESS" ||
    normalized === "DOING" ||
    normalized === "ACTIVE"
  ) {
    return "FAZENDO AGORA";
  }
  return "PENDENTE";
}

export function normalizeTaskPriority(priority?: string | null): CanonicalTaskPriority {
  if (!priority) return "Normal";
  const normalized = priority.toLowerCase().trim();
  if (normalized.includes("urg") || normalized.includes("crit")) return "Urgente";
  if (normalized.includes("alt") || normalized.includes("high")) return "Alta";
  if (normalized.includes("baix") || normalized.includes("low")) return "Baixa";
  return "Normal";
}

export function mapCrmStatusToGestor(crmStatus?: string | null): CanonicalTaskStatus {
  return normalizeTaskStatus(crmStatus);
}

export function mapGestorStatusToCrm(status: TaskStatus): string {
  const norm = normalizeTaskStatus(status);
  switch (norm) {
    case "CONCLUÍDO":
      return "completed";
    case "BLOQUEADO":
      return "blocked";
    case "AGUARDANDO FEEDBACK":
      return "in_review";
    case "FAZENDO AGORA":
      return "in_progress";
    case "PENDENTE":
    default:
      return "pending";
  }
}

export function mapCrmPriorityToGestor(crmPriority?: string | null): CanonicalTaskPriority {
  return normalizeTaskPriority(crmPriority);
}

export function mapGestorPriorityToCrm(
  priority: TaskPriority
): "low" | "medium" | "high" | "urgent" {
  const norm = normalizeTaskPriority(priority);
  switch (norm) {
    case "Urgente":
      return "urgent";
    case "Alta":
      return "high";
    case "Baixa":
      return "low";
    case "Normal":
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
  const code = `${prefix}-${101 + index}`;

  const dueDate = crmTask.dueDate
    ? crmTask.dueDate.slice(0, 10)
    : undefined;

  const tags = Array.isArray(crmTask.tags) ? crmTask.tags : [];
  const primaryTag = tags[0];
  const firstAssignee = crmTask.assignees?.[0]?.user;

  const subtasks: Subtask[] = (crmTask.checklistItems ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    completed: Boolean(item.completed),
    parentId: item.parentId ?? undefined,
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
    startDate: crmTask.startDate?.slice(0, 10),
    dueDate,
    tag: primaryTag,
    tags: tags.length > 0 ? tags : undefined,
    estimate: formatEstimateFromMinutes(crmTask.estimateMinutes),
    projectId: crmTask.projectId,
    parentTaskId: crmTask.parentTaskId ?? undefined,
    projectName: crmTask.project?.name,
    assigneeId: crmTask.assignees?.[0]?.userId,
    assigneeIds: crmTask.assignees?.map((assignee) => assignee.userId),
    assignee: firstAssignee?.name || undefined,
    assigneeAvatar: firstAssignee?.avatarUrl || undefined,
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
    ...(task.parentTaskId ? { parentTaskId: task.parentTaskId } : {}),
    ...(task.assigneeId ? { assigneeIds: [task.assigneeId] } : {}),
    title: task.title.trim(),
    description: task.description?.trim() || null,
    status: mapGestorStatusToCrm(task.status),
    priority: mapGestorPriorityToCrm(task.priority),
    startDate: task.startDate || null,
    dueDate: task.dueDate ? task.dueDate : null,
    estimateMinutes: parseEstimateToMinutes(task.estimate),
    tags: task.tags !== undefined
      ? task.tags.map((tag) => tag.trim()).filter(Boolean)
      : task.tag?.trim() ? [task.tag.trim()] : [],
  };
}

export function mapGestorTaskToCrmUpdateInput(task: Partial<Task>) {
  const payload: Record<string, unknown> = {};
  if (task.title !== undefined) payload.title = task.title.trim();
  if (task.description !== undefined) payload.description = task.description.trim() || null;
  if (task.status !== undefined) payload.status = mapGestorStatusToCrm(task.status);
  if (task.priority !== undefined) payload.priority = mapGestorPriorityToCrm(task.priority);
  if (task.startDate !== undefined) payload.startDate = task.startDate || null;
  if (task.dueDate !== undefined) payload.dueDate = task.dueDate || null;
  if ("parentTaskId" in task) payload.parentTaskId = task.parentTaskId ?? null;
  if (task.estimate !== undefined) payload.estimateMinutes = parseEstimateToMinutes(task.estimate);
  if (task.tags !== undefined) payload.tags = task.tags.map((tag) => tag.trim()).filter(Boolean);
  else if (task.tag !== undefined) payload.tags = task.tag.trim() ? [task.tag.trim()] : [];
  return payload;
}

// ============================================================================
// Métricas e Sumarização Unificada de Projetos e Tarefas
// ============================================================================

export interface ProjectTasksSummary {
  directTasksCount: number;
  totalSubtasks: number;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  percent: number;
  hasSubtasks: boolean;
}

export function computeProjectTasksSummary(
  tasks: readonly Task[],
  fallbackCount?: number
): ProjectTasksSummary {
  const directTasksCount = tasks.length || (fallbackCount ?? 0);
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let completedDirectTasks = 0;

  for (const t of tasks) {
    if (normalizeTaskStatus(t.status) === "CONCLUÍDO") {
      completedDirectTasks++;
    }
    if (t.subtasks && t.subtasks.length > 0) {
      totalSubtasks += t.subtasks.length;
      for (const st of t.subtasks) {
        if (st.completed) {
          completedSubtasks++;
        }
      }
    }
  }

  const hasSubtasks = totalSubtasks > 0;
  const totalItems = hasSubtasks
    ? tasks.length + totalSubtasks
    : directTasksCount;
  const completedItems = hasSubtasks
    ? completedDirectTasks + completedSubtasks
    : completedDirectTasks;
  const pendingItems = Math.max(0, totalItems - completedItems);
  const percent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    directTasksCount,
    totalSubtasks,
    totalItems,
    completedItems,
    pendingItems,
    percent,
    hasSubtasks,
  };
}

