import { QueryClient } from "@tanstack/react-query";

/**
 * Convenção padronizada de chaves de query (queryKeys) para o ecossistema IDE Gestor.
 */
export const queryKeys = {
  customViews: (projectId: string | null | undefined) =>
    ["projects", projectId ?? "all", "custom-views"] as const,
  managements: () => ["managements"] as const,
  management: (managementId: string | null | undefined) =>
    ["managements", managementId ?? ""] as const,
  managementMembers: (managementId: string | null | undefined) =>
    ["managements", managementId ?? "", "members"] as const,
  projects: (managementId?: string | null) =>
    ["projects", { managementId: managementId ?? null }] as const,
  project: (projectId: string | null | undefined) =>
    ["projects", projectId ?? ""] as const,
  projectMembers: (projectId?: string | null) =>
    ["projects", projectId ?? "all", "members"] as const,
  tasks: (filters?: Record<string, unknown>) =>
    ["tasks", filters ?? {}] as const,
  task: (taskId: string | null | undefined) =>
    ["tasks", taskId ?? ""] as const,
  taskComments: (taskId: string | null | undefined) =>
    ["tasks", taskId ?? "", "comments"] as const,
  taskChecklist: (taskId: string | null | undefined) =>
    ["tasks", taskId ?? "", "checklist"] as const,
  session: () => ["crm-session"] as const,
  settings: () => ["crm-settings"] as const,
  dashboard: () => ["dashboard", "projects"] as const,
  notifications: () => ["notifications"] as const,
  calendar: (range?: Record<string, unknown>) =>
    ["calendar", range ?? {}] as const,
};

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados permanecem frescos por 5 minutos antes de buscar em background
        staleTime: 1000 * 60 * 5,
        // Tempo de retenção em cache (Garbage Collection / Persistência): 24 horas
        gcTime: 1000 * 60 * 60 * 24,
        // Evita revalidações desnecessárias ao trocar de janela
        refetchOnWindowFocus: false,
        // 1 tentativa de retry com backoff antes de falhar
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // No servidor (SSR), sempre criar uma instância isolada por requisição
    return makeQueryClient();
  }
  // No cliente (navegador/desktop), reaproveitar a instância única
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
