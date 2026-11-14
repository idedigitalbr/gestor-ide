// @gestor-ide/sdk — Cliente HTTP tipado da API Central do IDE CRM
import type {
  CrmAccount,
  CrmCalendarAvailabilityResult,
  CrmCalendarBusyInterval,
  CrmCalendarEvent,
  CrmCalendarMutationScope,
  CrmCalendarPerson,
  CrmCalendarSuggestedSlot,
  CrmCalendarTaskItem,
  CrmNotification,
  CrmProjectsDashboard,
  CrmProject,
  CrmProjectComment,
  CrmProjectManagement,
  CrmProjectMember,
  CrmProjectTask,
  CrmUserProfile,
} from "@gestor-ide/core";
import { getStoredCrmToken, setStoredCrmToken } from "@gestor-ide/auth";

declare const process: { env?: Record<string, string | undefined> } | undefined;

export class IdeCrmApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = "IdeCrmApiError";
  }
}

export interface IdeCrmClientOptions {
  baseUrl?: string;
  getToken?: () => string | null;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ide-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class IdeCrmClient {
  private readonly baseUrl: string;
  private readonly getTokenFn: () => string | null;

  constructor(options: IdeCrmClientOptions = {}) {
    // No browser, usamos por padrão o proxy integrado /api/crm (configurado no next.config.ts)
    // ou NEXT_PUBLIC_IDE_CRM_API_URL quando definido.
    const defaultBase =
      typeof process !== "undefined" && process.env?.NEXT_PUBLIC_IDE_CRM_API_URL
        ? process.env.NEXT_PUBLIC_IDE_CRM_API_URL
        : "/api/crm";
    this.baseUrl = (options.baseUrl ?? defaultBase).replace(/\/+$/, "");
    this.getTokenFn = options.getToken ?? getStoredCrmToken;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    useIdempotency = false
  ): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    const headers = new Headers(init.headers);

    const token = this.getTokenFn();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (useIdempotency && !headers.has("Idempotency-Key")) {
      headers.set("Idempotency-Key", generateIdempotencyKey());
    }

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : `Erro HTTP ${response.status}`;
      throw new IdeCrmApiError(response.status, errorMsg, payload);
    }

    return payload as T;
  }

  // --------------------------------------------------------------------------
  // Saúde & Autenticação Unificada
  // --------------------------------------------------------------------------

  async health(): Promise<{ status: string; timestamp: string; version?: string }> {
    return this.request("/health");
  }

  async getSession(): Promise<{ authenticated: boolean; user: CrmUserProfile | null }> {
    try {
      return await this.request("/auth/token");
    } catch (error) {
      if (error instanceof IdeCrmApiError && error.status === 401) {
        return { authenticated: false, user: null };
      }
      throw error;
    }
  }

  async login(
    email: string,
    password: string,
    clientName = "IDE Gestor Web"
  ): Promise<{ token: string; expiresAt: string; user: CrmUserProfile }> {
    const result = await this.request<{
      token: string;
      expiresAt: string;
      user: CrmUserProfile;
    }>("/auth/token", {
      method: "POST",
      body: JSON.stringify({ email, password, clientName }),
    });
    if (result.token) {
      setStoredCrmToken(result.token);
    }
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/auth/token", { method: "DELETE" });
    } finally {
      setStoredCrmToken(null);
    }
  }

  async getAccount(): Promise<{ account: CrmAccount }> { return this.request("/account"); }
  async updateAccount(input: { name?: string; email?: string; avatarUrl?: string | null; currentPassword?: string; password?: string }): Promise<{ account: CrmAccount }> {
    return this.request("/account", { method: "PATCH", body: JSON.stringify(input) });
  }
  async uploadAvatar(file: File): Promise<{ account: CrmAccount }> {
    const body = new FormData(); body.append("file", file);
    return this.request("/account/avatar", { method: "POST", body });
  }
  async listNotifications(): Promise<{ notifications: CrmNotification[]; unreadCount: number }> { return this.request("/notifications?limit=50"); }
  async markNotificationRead(id: string): Promise<void> { await this.request(`/notifications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ read: true }) }); }
  async getProjectsDashboard(): Promise<{ dashboard: CrmProjectsDashboard }> { return this.request("/projects/dashboard"); }
  async getCalendar(
    start: string,
    end: string,
    projectId?: string | null
  ): Promise<{ events: CrmCalendarEvent[]; tasks: CrmCalendarTaskItem[] }> {
    const params = new URLSearchParams({ start, end });
    if (projectId) params.set("projectId", projectId);
    return this.request(`/projects/calendar?${params}`);
  }
  async listCalendarFallbackTasks(projectId?: string | null): Promise<{ tasks: CrmProjectTask[] }> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const query = params.toString();
    return this.request(query ? `/projects/tasks?${query}` : "/projects/tasks");
  }
  async listCalendarParticipants(
    projectId?: string | null
  ): Promise<{ participants: CrmCalendarPerson[] }> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const query = params.toString();
    return this.request(
      query ? `/projects/calendar/participants?${query}` : "/projects/calendar/participants"
    );
  }
  async checkCalendarAvailability(
    input: Record<string, unknown>
  ): Promise<{ results: CrmCalendarAvailabilityResult[] }> {
    return this.request("/projects/calendar/availability", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  async suggestCalendarSlots(params: {
    start: string;
    end: string;
    durationMinutes: number;
    projectId?: string | null;
    participants?: string[];
  }): Promise<{
    busy: CrmCalendarBusyInterval[];
    suggestions: CrmCalendarSuggestedSlot[];
    rule?: string;
  }> {
    const query = new URLSearchParams({
      start: params.start,
      end: params.end,
      durationMinutes: String(params.durationMinutes),
    });
    if (params.projectId) query.set("projectId", params.projectId);
    if (params.participants?.length) query.set("participants", params.participants.join(","));
    return this.request(`/projects/calendar/availability?${query}`);
  }
  async saveCalendarEvent(
    data: Record<string, unknown>,
    id?: string
  ): Promise<{ event?: CrmCalendarEvent; reminderScheduled?: boolean }> {
    return this.request(
      id ? `/projects/calendar/${encodeURIComponent(id)}` : "/projects/calendar",
      { method: id ? "PATCH" : "POST", body: JSON.stringify(data) },
      !id
    );
  }
  async deleteCalendarEvent(
    id: string,
    scope?: CrmCalendarMutationScope
  ): Promise<void> {
    await this.request(`/projects/calendar/${encodeURIComponent(id)}`, {
      method: "DELETE",
      ...(scope ? { body: JSON.stringify({ scope }) } : {}),
    });
  }
  async getSettings(): Promise<{ settings: Record<string, unknown> }> { return this.request("/settings"); }
  async saveSettings(settings: Record<string, unknown>): Promise<void> { await this.request("/settings", { method: "POST", body: JSON.stringify({ settings }) }); }

  // --------------------------------------------------------------------------
  // Módulo: Projetos & Tarefas
  // --------------------------------------------------------------------------

  async listManagements(): Promise<{ managements: CrmProjectManagement[] }> {
    return this.request("/projects/managements");
  }
  async listManagementMembers(id: string): Promise<{ members: Array<{ userId: string }> }> {
    return this.request(`/projects/managements/${encodeURIComponent(id)}/members`);
  }

  async addManagementMember(
    id: string,
    input: { userId?: string; email?: string; role?: string }
  ): Promise<{ ok?: boolean }> {
    return this.request(
      `/projects/managements/${encodeURIComponent(id)}/members`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateManagementMemberRole(
    managementId: string,
    userId: string,
    role: string
  ): Promise<{ ok?: boolean }> {
    return this.request<{ ok?: boolean }>(
      `/projects/managements/${encodeURIComponent(managementId)}/members/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }
    ).catch(async () => {
      return this.request<{ ok?: boolean }>(
        `/projects/managements/${encodeURIComponent(managementId)}/members`,
        {
          method: "PATCH",
          body: JSON.stringify({ userId, role }),
        }
      );
    });
  }

  async removeManagementMember(
    managementId: string,
    userId: string
  ): Promise<{ ok?: boolean }> {
    return this.request<{ ok?: boolean }>(
      `/projects/managements/${encodeURIComponent(managementId)}/members/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      }
    ).catch(async () => {
      return this.request<{ ok?: boolean }>(
        `/projects/managements/${encodeURIComponent(managementId)}/members?userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        }
      );
    });
  }

  async createManagement(input: { name: string; description?: string }): Promise<{ management: CrmProjectManagement }> {
    return this.request("/projects/managements", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateManagement(
    managementId: string,
    input: {
      name?: string;
      description?: string;
      color?: string;
      visibility?: string;
      status?: string;
    }
  ): Promise<{ management?: CrmProjectManagement; ok?: boolean }> {
    return this.request<{ management?: CrmProjectManagement; ok?: boolean }>(
      `/projects/managements/${encodeURIComponent(managementId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      }
    );
  }

  async listProjects(search?: string): Promise<{ projects: CrmProject[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request(`/projects/items${query}`);
  }

  async createProject(managementId: string, input: { name: string; description?: string }): Promise<{ project: CrmProject }> {
    return this.request(`/projects/managements/${encodeURIComponent(managementId)}/projects`, {
      method: "POST",
      body: JSON.stringify(input),
    }, true);
  }

  async updateProject(
    projectId: string,
    input: {
      name?: string;
      description?: string;
      color?: string;
      visibility?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
    }
  ): Promise<{ project?: CrmProject; ok?: boolean }> {
    try {
      return await this.request<{ project?: CrmProject; ok?: boolean }>(
        `/projects/items/${encodeURIComponent(projectId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    } catch {
      return this.request<{ project?: CrmProject; ok?: boolean }>(
        `/projects/${encodeURIComponent(projectId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    }
  }

  async deleteManagement(managementId: string): Promise<{ ok?: boolean }> {
    return this.request<{ ok?: boolean }>(
      `/projects/managements/${encodeURIComponent(managementId)}`,
      { method: "DELETE" }
    );
  }

  async deleteProject(projectId: string): Promise<{ ok?: boolean }> {
    try {
      return await this.request<{ ok?: boolean }>(
        `/projects/items/${encodeURIComponent(projectId)}`,
        { method: "DELETE" }
      );
    } catch {
      return this.request<{ ok?: boolean }>(
        `/projects/${encodeURIComponent(projectId)}`,
        { method: "DELETE" }
      );
    }
  }

  async listTasks(params?: {
    projectId?: string;
    status?: string;
    search?: string;
  }): Promise<{ tasks: CrmProjectTask[] }> {
    const searchParams = new URLSearchParams();
    searchParams.set("include", "hierarchy,checklists,summary");
    if (params?.projectId) searchParams.set("projectId", params.projectId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    return this.request(`/projects/tasks?${searchParams.toString()}`);
  }

  async createTask(input: {
    projectId: string;
    parentTaskId?: string;
    assigneeIds?: string[];
    title: string;
    description?: string | null;
    status?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    startDate?: string | null;
    dueDate?: string | null;
    estimateMinutes?: number | null;
    tags?: string[];
  }): Promise<{ task: CrmProjectTask }> {
    return this.request(
      "/projects/tasks",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      true
    );
  }

  async updateTask(
    taskId: string,
    input: Record<string, unknown>
  ): Promise<{ task: CrmProjectTask }> {
    return this.request(`/projects/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteTask(taskId: string): Promise<{ ok?: boolean }> {
    return this.request(`/projects/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    });
  }

  async setTaskAssignees(taskId: string, assigneeIds: string[]): Promise<{ task: CrmProjectTask }> {
    return this.updateTask(taskId, { assigneeIds });
  }

  async createChecklistItem(
    taskId: string,
    title: string
  ): Promise<{ item: { id: string; title: string; completed: boolean } }> {
    return this.request(
      `/projects/tasks/${encodeURIComponent(taskId)}/checklist`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
      true
    );
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    data: { title?: string; completed?: boolean }
  ): Promise<{ item: { id: string; title: string; completed: boolean } }> {
    return this.request(`/projects/tasks/${encodeURIComponent(taskId)}/checklist`, {
      method: "PATCH",
      body: JSON.stringify({ itemId, ...data }),
    });
  }

  async deleteChecklistItem(taskId: string, itemId: string): Promise<{ ok?: boolean }> {
    return this.request(
      `/projects/tasks/${encodeURIComponent(taskId)}/checklist?itemId=${encodeURIComponent(itemId)}`,
      {
        method: "DELETE",
      }
    );
  }

  async listTaskComments(taskId: string): Promise<{ comments: CrmProjectComment[] }> {
    return this.request(`/projects/tasks/${encodeURIComponent(taskId)}/comments`);
  }

  async createTaskComment(
    taskId: string,
    content: string
  ): Promise<{ comment: CrmProjectComment }> {
    return this.request(
      `/projects/tasks/${encodeURIComponent(taskId)}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
      true
    );
  }

  async listProjectMembers(projectId?: string): Promise<{ members: CrmProjectMember[] }> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return this.request(`/projects/members${query}`);
  }

  async addProjectMember(
    projectId: string,
    input: { userId?: string; email?: string; role?: string }
  ): Promise<{ ok?: boolean }> {
    return this.request(
      `/projects/members`,
      {
        method: "POST",
        body: JSON.stringify({ projectId, ...input }),
      },
      true
    );
  }

  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    role: string
  ): Promise<{ ok?: boolean }> {
    return this.request<{ ok?: boolean }>(
      `/projects/members/${encodeURIComponent(userId)}?projectId=${encodeURIComponent(projectId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }
    ).catch(async () => {
      return this.request<{ ok?: boolean }>(
        `/projects/members`,
        {
          method: "PATCH",
          body: JSON.stringify({ projectId, userId, role }),
        }
      );
    });
  }

  async removeProjectMember(
    projectId: string,
    userId: string
  ): Promise<{ ok?: boolean }> {
    return this.request<{ ok?: boolean }>(
      `/projects/members/${encodeURIComponent(userId)}?projectId=${encodeURIComponent(projectId)}`,
      {
        method: "DELETE",
      }
    ).catch(async () => {
      return this.request<{ ok?: boolean }>(
        `/projects/members?projectId=${encodeURIComponent(projectId)}&userId=${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
        }
      );
    });
  }
}

export const ideCrmClient = new IdeCrmClient();
