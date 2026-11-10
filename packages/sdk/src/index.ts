// @gestor-ide/sdk — Cliente HTTP tipado da API Central do IDE CRM
import type {
  CrmCompany,
  CrmContact,
  CrmFinancialEntry,
  CrmFinancialSummary,
  CrmLead,
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

  // --------------------------------------------------------------------------
  // Módulo: Projetos & Tarefas
  // --------------------------------------------------------------------------

  async listManagements(): Promise<{ managements: CrmProjectManagement[] }> {
    return this.request("/projects/managements?limit=100");
  }

  async listProjects(search?: string): Promise<{ projects: CrmProject[] }> {
    const query = search ? `?limit=100&search=${encodeURIComponent(search)}` : "?limit=100";
    return this.request(`/projects/items${query}`);
  }

  async listTasks(params?: {
    projectId?: string;
    status?: string;
    search?: string;
  }): Promise<{ tasks: CrmProjectTask[] }> {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", "100");
    searchParams.set("include", "hierarchy,checklists,summary");
    if (params?.projectId) searchParams.set("projectId", params.projectId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    return this.request(`/projects/tasks?${searchParams.toString()}`);
  }

  async createTask(input: {
    projectId: string;
    title: string;
    description?: string | null;
    status?: string;
    priority?: "low" | "medium" | "high" | "urgent";
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

  // --------------------------------------------------------------------------
  // Módulo: Clientes & Empresas
  // --------------------------------------------------------------------------

  async listContacts(search?: string): Promise<{ contacts: CrmContact[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await this.request<{ contacts?: CrmContact[]; items?: CrmContact[] }>(
      `/contacts${query}`
    );
    return { contacts: res.contacts ?? res.items ?? [] };
  }

  async listCompanies(search?: string): Promise<{ companies: CrmCompany[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await this.request<{ companies?: CrmCompany[]; items?: CrmCompany[] }>(
      `/companies${query}`
    );
    return { companies: res.companies ?? res.items ?? [] };
  }

  // --------------------------------------------------------------------------
  // Módulo: CRM Comercial (Leads & Oportunidades)
  // --------------------------------------------------------------------------

  async listLeads(): Promise<{ leads: CrmLead[] }> {
    const res = await this.request<{ leads?: CrmLead[]; items?: CrmLead[] }>("/leads");
    return { leads: res.leads ?? res.items ?? [] };
  }

  async getCrmDashboardSummary(): Promise<{
    totalContacts: number;
    totalLeads: number;
    quenteLeads: number;
    mornoLeads: number;
    frioLeads: number;
    newLeads30d: number;
  }> {
    return this.request("/dashboard/summary");
  }

  // --------------------------------------------------------------------------
  // Módulo: Financeiro
  // --------------------------------------------------------------------------

  async getFinanceSummary(): Promise<CrmFinancialSummary> {
    const res = await this.request<
      CrmFinancialSummary & {
        summary?: {
          pendingReceivables?: number;
          pendingPayables?: number;
          receivedThisMonth?: number;
          paidThisMonth?: number;
          netThisMonth?: number;
          overdueTotal?: number;
        };
      }
    >("/finance/summary");

    if (res.summary) {
      return {
        totalReceivable: res.summary.pendingReceivables ?? 0,
        totalPayable: res.summary.pendingPayables ?? 0,
        paidReceivable: res.summary.receivedThisMonth ?? 0,
        paidPayable: res.summary.paidThisMonth ?? 0,
        balance: res.summary.netThisMonth ?? 0,
        overdueCount: res.summary.overdueTotal ? 1 : 0,
      };
    }

    return res;
  }

  async listFinanceEntries(): Promise<{ entries: CrmFinancialEntry[] }> {
    const res = await this.request<{
      entries?: CrmFinancialEntry[];
      items?: CrmFinancialEntry[];
    }>("/finance/entries");
    return { entries: res.entries ?? res.items ?? [] };
  }
}

export const ideCrmClient = new IdeCrmClient();
