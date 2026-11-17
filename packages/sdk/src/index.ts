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
  CustomProjectView,
  CustomViewOpenMode,
  CustomViewType,
  FrameEmbedCheckResult,
  CanvasCreateInput,
  CanvasUpdateInput,
  CanvasDuplicateInput,
  CanvasSummary,
  CanvasDetail,
} from "@gestor-ide/core";
import { getDefaultProjectViews, sanitizeExternalUrl } from "@gestor-ide/core";
import { getStoredCrmToken, setStoredCrmToken } from "@gestor-ide/auth";
import { crmCache, IdeCrmCache } from "./cache";

export { crmCache, IdeCrmCache };

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
  enableCache?: boolean;
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
  private readonly enableCache: boolean;
  public readonly cache = crmCache;

  constructor(options: IdeCrmClientOptions = {}) {
    // No browser, usamos por padrão o proxy integrado /api/crm (configurado no next.config.ts)
    // ou NEXT_PUBLIC_IDE_CRM_API_URL quando definido.
    const defaultBase =
      typeof process !== "undefined" && process.env?.NEXT_PUBLIC_IDE_CRM_API_URL
        ? process.env.NEXT_PUBLIC_IDE_CRM_API_URL
        : "/api/crm";
    this.baseUrl = (options.baseUrl ?? defaultBase).replace(/\/+$/, "");
    this.getTokenFn = options.getToken ?? getStoredCrmToken;
    this.enableCache = options.enableCache ?? (typeof window !== "undefined");
  }

  private revalidateInBackground<T>(
    url: string,
    init: RequestInit,
    headers: Headers,
    cacheKey: string
  ): void {
    void fetch(url, {
      ...init,
      headers,
      credentials: "include",
    })
      .then(async (res) => {
        if (res.ok) {
          const fresh = await res.json().catch(() => null);
          if (fresh) {
            await this.cache.set(cacheKey, fresh);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("ide-crm:revalidated", {
                  detail: { key: cacheKey, data: fresh },
                })
              );
            }
          }
        }
      })
      .catch(() => {});
  }

  private invalidateRelatedCaches(path: string): void {
    if (path.includes("/tasks") || path.includes("/projects")) {
      void this.cache.invalidatePrefix("crm_/projects");
      void this.cache.invalidatePrefix("crm_/calendar");
    } else if (path.includes("/calendar")) {
      void this.cache.invalidatePrefix("crm_/calendar");
    } else if (path.includes("/account") || path.includes("/auth")) {
      void this.cache.clear();
    } else if (path.includes("/settings")) {
      void this.cache.invalidatePrefix("crm_/settings");
    }
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

    const method = init.method?.toUpperCase() ?? "GET";
    const cacheKey = `crm_${normalizedPath}`;

    // 1. Verificação de Cache para GET (0ms Stale-While-Revalidate)
    if (this.enableCache && method === "GET" && !headers.has("Cache-Control")) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        // Dispara revalidação silenciosa em segundo plano para manter atualizado
        this.revalidateInBackground<T>(url, init, headers, cacheKey);
        return cached;
      }
    }

    try {
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

      // Se for GET com sucesso, grava no cache (Memória + IndexedDB)
      if (this.enableCache && method === "GET") {
        void this.cache.set(cacheKey, payload);
      }

      // Se for mutação (POST/PATCH/DELETE/PUT), invalida caches relacionados
      if (this.enableCache && method !== "GET") {
        this.invalidateRelatedCaches(normalizedPath);
      }

      return payload as T;
    } catch (error) {
      // Se falhar a rede (offline / queda transitória da VPS) e houver cache anterior, resgata do cache!
      if (this.enableCache && method === "GET") {
        const fallback = await this.cache.get<T>(cacheKey);
        if (fallback !== null) {
          return fallback;
        }
      }
      throw error;
    }
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
  // Módulo: Visualizações Personalizadas por Projeto
  // --------------------------------------------------------------------------

  async listProjectCustomViews(projectId: string): Promise<{ views: CustomProjectView[] }> {
    if (!projectId) return { views: [] };
    try {
      const { settings } = await this.getSettings();
      const allProjectViews =
        (settings?.projectCustomViews as Record<string, CustomProjectView[]> | undefined) ||
        (settings?.projectViews as Record<string, CustomProjectView[]> | undefined) ||
        {};
      const stored = allProjectViews[projectId];
      if (Array.isArray(stored) && stored.length > 0) {
        const defaults = getDefaultProjectViews(projectId);
        const existingIds = new Set(stored.map((v) => v.id));
        const merged = [...stored];
        for (const def of defaults) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        }
        merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return { views: merged };
      }
    } catch {
      // Fallback gracioso
    }
    return { views: getDefaultProjectViews(projectId) };
  }

  async saveProjectCustomViews(
    projectId: string,
    views: CustomProjectView[]
  ): Promise<{ views: CustomProjectView[] }> {
    if (!projectId) throw new Error("projectId é obrigatório");
    const sanitizedViews = views.map((v, idx) => ({
      ...v,
      projectId,
      order: typeof v.order === "number" ? v.order : idx,
      url: v.url ? sanitizeExternalUrl(v.url) : "",
      updatedAt: new Date().toISOString(),
    }));

    try {
      const { settings } = await this.getSettings();
      const currentMap =
        (settings?.projectCustomViews as Record<string, CustomProjectView[]> | undefined) || {};
      const updatedMap = {
        ...currentMap,
        [projectId]: sanitizedViews,
      };
      const updatedSettings = {
        ...settings,
        projectCustomViews: updatedMap,
      };
      await this.saveSettings(updatedSettings);
      // Mantém o cache Local-First (RAM + IndexedDB) alinhado ao CRM
      void this.cache.set("crm_/settings", { settings: updatedSettings });
    } catch (err) {
      console.warn("Aviso ao persistir visualizações no CRM Settings:", err);
    }
    return { views: sanitizedViews };
  }

  async createProjectCustomView(
    projectId: string,
    input: {
      name: string;
      icon: string;
      url: string;
      openMode?: CustomViewOpenMode;
      type?: CustomViewType;
    }
  ): Promise<{ view: CustomProjectView }> {
    const { views } = await this.listProjectCustomViews(projectId);
    const newView: CustomProjectView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      name: input.name.trim(),
      icon: input.icon || "Globe",
      url: sanitizeExternalUrl(input.url),
      openMode: input.openMode || "auto",
      order: views.length,
      type: input.type || "custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextViews = [...views, newView];
    await this.saveProjectCustomViews(projectId, nextViews);
    return { view: newView };
  }

  async updateProjectCustomView(
    projectId: string,
    viewId: string,
    updates: Partial<Omit<CustomProjectView, "id" | "projectId">>
  ): Promise<{ view: CustomProjectView }> {
    const { views } = await this.listProjectCustomViews(projectId);
    let targetView: CustomProjectView | null = null;
    const nextViews = views.map((v) => {
      if (v.id === viewId) {
        const next: CustomProjectView = {
          ...v,
          ...updates,
          url: updates.url !== undefined ? sanitizeExternalUrl(updates.url) : v.url,
          name: updates.name !== undefined ? updates.name.trim() : v.name,
          updatedAt: new Date().toISOString(),
        };
        targetView = next;
        return next;
      }
      return v;
    });

    if (!targetView) {
      throw new Error(`Visualização ${viewId} não encontrada no projeto ${projectId}`);
    }

    await this.saveProjectCustomViews(projectId, nextViews);
    return { view: targetView };
  }

  async deleteProjectCustomView(projectId: string, viewId: string): Promise<{ ok: boolean }> {
    const { views } = await this.listProjectCustomViews(projectId);
    const target = views.find((v) => v.id === viewId);
    if (target?.type === "predefined") {
      throw new Error("Visualizações predefinidas não podem ser excluídas.");
    }
    const filtered = views.filter((v) => v.id !== viewId);
    await this.saveProjectCustomViews(projectId, filtered);
    return { ok: true };
  }

  // --------------------------------------------------------------------------
  // Módulo: Projetos & Tarefas
  // --------------------------------------------------------------------------

  async listManagements(): Promise<{ managements: CrmProjectManagement[] }> {
    return this.request("/projects/managements");
  }
  async listManagementMembers(id: string): Promise<{
    members: Array<{
      userId: string;
      role?: string;
      user?: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl?: string | null;
      };
    }>;
  }> {
    return this.request(`/projects/managements/${encodeURIComponent(id)}/members`);
  }

  async addManagementMember(
    id: string,
    input: { userId?: string; email?: string; role?: string }
  ): Promise<{ ok?: boolean }> {
    try {
      return await this.request(
        `/projects/managements/${encodeURIComponent(id)}/members`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        true
      );
    } catch (err) {
      // Fallback 1: se rota direta com id na URL falhar, tentar na rota /projects/members com managementId
      try {
        return await this.request(
          `/projects/members`,
          {
            method: "POST",
            body: JSON.stringify({ managementId: id, ...input }),
          },
          true
        );
      } catch {
        // Fallback 2: tentar com memberId
        if (input.userId) {
          try {
            return await this.request(
              `/projects/managements/${encodeURIComponent(id)}/members`,
              {
                method: "POST",
                body: JSON.stringify({ memberId: input.userId, role: input.role }),
              },
              true
            );
          } catch {}
        }
        throw err;
      }
    }
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

  async createManagement(input: {
    name: string;
    description?: string;
    ownerUserId?: string;
    memberIds?: string[];
  }): Promise<{ management: CrmProjectManagement }> {
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
      coverPath?: string | null;
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

  async createProject(
    managementId: string,
    input: {
      name: string;
      description?: string;
      ownerUserId?: string;
      memberIds?: string[];
    }
  ): Promise<{ project: CrmProject }> {
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
      coverPath?: string | null;
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
    try {
      return await this.request(
        `/projects/members`,
        {
          method: "POST",
          body: JSON.stringify({ projectId, ...input }),
        },
        true
      );
    } catch (err) {
      try {
        return await this.request(
          `/projects/${encodeURIComponent(projectId)}/members`,
          {
            method: "POST",
            body: JSON.stringify(input),
          },
          true
        );
      } catch {
        throw err;
      }
    }
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

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // Módulo: IDE Gestor Canvas v2 (com fallback resiliente Local-First + CRM)
  // --------------------------------------------------------------------------

  private getLocalCanvasMap(projectId: string): Record<string, CanvasDetail> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`gestor_canvas_${projectId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private setLocalCanvasMap(projectId: string, map: Record<string, CanvasDetail>): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`gestor_canvas_${projectId}`, JSON.stringify(map));
    } catch {}
  }

  private async getFallbackCanvasMap(projectId: string): Promise<Record<string, CanvasDetail>> {
    // 1. Prioriza armazenamento local do navegador (ultra-rápido e 100% resiliente)
    const local = this.getLocalCanvasMap(projectId);
    if (Object.keys(local).length > 0) {
      return local;
    }
    // 2. Tenta recuperar do CRM settings caso exista
    try {
      const { settings } = await this.getSettings();
      const all = (settings?.projectCanvases as Record<string, Record<string, CanvasDetail>> | undefined) || {};
      const fromRemote = all[projectId] || {};
      if (Object.keys(fromRemote).length > 0) {
        this.setLocalCanvasMap(projectId, fromRemote);
        return fromRemote;
      }
    } catch {}
    return {};
  }

  private async saveFallbackCanvasMap(projectId: string, map: Record<string, CanvasDetail>): Promise<void> {
    // 1. Salva localmente com garantia imediata
    this.setLocalCanvasMap(projectId, map);

    // 2. Tenta sincronizar com o CRM settings de forma não-bloqueante
    try {
      const { settings } = await this.getSettings();
      const all = (settings?.projectCanvases as Record<string, Record<string, CanvasDetail>> | undefined) || {};
      const updatedAll = { ...all, [projectId]: map };
      const updatedSettings = { ...settings, projectCanvases: updatedAll };
      await this.saveSettings(updatedSettings);
      void this.cache.set("crm_/settings", { settings: updatedSettings });
    } catch (err) {
      // Se o schema do CRM for estrito (400), o armazenamento local mantém tudo são e salvo!
      console.warn("Aviso: CRM Settings não aceitou chave personalizada, mantendo no storage local:", err);
    }
  }

  async listProjectCanvases(projectId: string): Promise<{ canvases: CanvasSummary[] }> {
    try {
      return await this.request(`/projects/${encodeURIComponent(projectId)}/canvases`);
    } catch (err: any) {
      // Falha na rota dedicada do CRM -> Aciona fallback resiliente
      const map = await this.getFallbackCanvasMap(projectId);
      const canvases: CanvasSummary[] = Object.values(map)
        .filter((c) => !c.archivedAt)
        .map((c) => ({
          id: c.id,
          projectId: c.projectId,
          name: c.name,
          revision: c.revision,
          createdByUserId: c.createdByUserId,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      return { canvases };
    }
  }

  async getProjectCanvas(projectId: string, canvasId: string): Promise<CanvasDetail> {
    try {
      return await this.request(
        `/projects/${encodeURIComponent(projectId)}/canvases/${encodeURIComponent(canvasId)}`
      );
    } catch (err: any) {
      const map = await this.getFallbackCanvasMap(projectId);
      const found = map[canvasId];
      if (found) {
        return found;
      }
      return {
        id: canvasId,
        projectId,
        name: "Quadro Principal",
        revision: 1,
        createdByUserId: "current_user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        canEdit: true,
      };
    }
  }

  async createProjectCanvas(
    projectId: string,
    input: CanvasCreateInput
  ): Promise<{ id: string; projectId: string; name: string; revision: number; updatedAt: string }> {
    try {
      return await this.request(
        `/projects/${encodeURIComponent(projectId)}/canvases`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        true
      );
    } catch (err: any) {
      const map = await this.getFallbackCanvasMap(projectId);
      const newId = `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const newDetail: CanvasDetail = {
        id: newId,
        projectId,
        name: input.name.trim(),
        description: input.description,
        templateKey: input.templateKey,
        revision: 1,
        createdByUserId: "current_user",
        createdAt: now,
        updatedAt: now,
        document: input.document || {
          schemaVersion: 1,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        canEdit: true,
      };
      map[newId] = newDetail;
      await this.saveFallbackCanvasMap(projectId, map);
      return {
        id: newDetail.id,
        projectId: newDetail.projectId,
        name: newDetail.name,
        revision: newDetail.revision,
        updatedAt: newDetail.updatedAt,
      };
    }
  }

  async updateProjectCanvas(
    projectId: string,
    canvasId: string,
    input: CanvasUpdateInput
  ): Promise<{ id: string; revision: number; updatedAt: string }> {
    try {
      return await this.request(
        `/projects/${encodeURIComponent(projectId)}/canvases/${encodeURIComponent(canvasId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        }
      );
    } catch (err: any) {
      const map = await this.getFallbackCanvasMap(projectId);
      const found = map[canvasId] || {
        id: canvasId,
        projectId,
        name: "Quadro Principal",
        revision: 1,
        createdByUserId: "current_user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        canEdit: true,
      };

      if (input.expectedRevision && found.revision !== input.expectedRevision) {
        const conflictError: any = new Error("Conflito de versão no canvas.");
        conflictError.status = 409;
        conflictError.payload = {
          code: "CANVAS_REVISION_CONFLICT",
          message: "O quadro foi alterado em outra sessão.",
          currentRevision: found.revision,
        };
        throw conflictError;
      }

      const now = new Date().toISOString();
      const updatedRevision = found.revision + 1;
      const updatedDetail: CanvasDetail = {
        ...found,
        name: input.name !== undefined ? input.name.trim() : found.name,
        description: input.description !== undefined ? input.description : found.description,
        document: input.document !== undefined ? input.document : found.document,
        revision: updatedRevision,
        updatedAt: now,
      };
      map[canvasId] = updatedDetail;
      await this.saveFallbackCanvasMap(projectId, map);
      return {
        id: canvasId,
        revision: updatedRevision,
        updatedAt: now,
      };
    }
  }

  async duplicateProjectCanvas(
    projectId: string,
    canvasId: string,
    input?: CanvasDuplicateInput
  ): Promise<{ id: string; projectId: string; name: string; revision: number; updatedAt: string }> {
    try {
      return await this.request(
        `/projects/${encodeURIComponent(projectId)}/canvases/${encodeURIComponent(canvasId)}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify(input ?? {}),
        },
        true
      );
    } catch (err: any) {
      const map = await this.getFallbackCanvasMap(projectId);
      const original = map[canvasId] || {
        id: canvasId,
        projectId,
        name: "Quadro Principal",
        revision: 1,
        createdByUserId: "current_user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        document: {
          schemaVersion: 1,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        canEdit: true,
      };

      const newId = `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const duplicateDetail: CanvasDetail = {
        ...original,
        id: newId,
        name: input?.name ? input.name.trim() : `${original.name} (Cópia)`,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      map[newId] = duplicateDetail;
      await this.saveFallbackCanvasMap(projectId, map);
      return {
        id: duplicateDetail.id,
        projectId: duplicateDetail.projectId,
        name: duplicateDetail.name,
        revision: duplicateDetail.revision,
        updatedAt: duplicateDetail.updatedAt,
      };
    }
  }

  async archiveProjectCanvas(projectId: string, canvasId: string): Promise<{ ok: boolean }> {
    try {
      return await this.request(
        `/projects/${encodeURIComponent(projectId)}/canvases/${encodeURIComponent(canvasId)}`,
        {
          method: "DELETE",
        }
      );
    } catch (err: any) {
      const map = await this.getFallbackCanvasMap(projectId);
      if (map[canvasId]) {
        map[canvasId] = {
          ...map[canvasId],
          archivedAt: new Date().toISOString(),
        };
        await this.saveFallbackCanvasMap(projectId, map);
      }
      return { ok: true };
    }
  }

  async uploadCanvasAsset(
    projectId: string,
    file: File
  ): Promise<{ assetId: string; url: string; fileName: string; size: number }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request(
      `/projects/${encodeURIComponent(projectId)}/canvas-assets`,
      {
        method: "POST",
        body: formData,
      }
    );
  }

  getCanvasAssetUrl(projectId: string, assetId: string): string {
    return `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/canvas-assets/${encodeURIComponent(assetId)}`;
  }
}

export const ideCrmClient = new IdeCrmClient();
