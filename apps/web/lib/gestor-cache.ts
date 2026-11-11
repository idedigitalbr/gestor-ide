// Sistema de Cache Instantâneo (SWR / In-Memory + LocalStorage) para o Gestor IDE
// Garante renderização em 0ms no F5 e na navegação entre projetos/gestões sem skeleton bloqueante.

import type {
  CrmProject,
  CrmProjectManagement,
  CrmUserProfile,
} from "@gestor-ide/core";
import type { Task } from "@/types/task";

const PREFIX = "gestor_cache_";
const KEY_MANAGEMENTS = `${PREFIX}managements`;
const KEY_PROJECTS = `${PREFIX}projects`;
const KEY_SESSION = `${PREFIX}session`;
const KEY_TASKS_PREFIX = `${PREFIX}tasks_`;
const LOCAL_UI_PREFIX = "gestor_local_ui_";

type LocalTaskPresentation = { itemType?: string; customGroup?: string };

function getLocalUiKey(kind: string, id: string): string {
  const userId = getCachedSession()?.id ?? "anon";
  return `${LOCAL_UI_PREFIX}${encodeURIComponent(userId)}_${kind}_${encodeURIComponent(id)}`;
}

export function getLocalTaskPresentation(taskId: string): LocalTaskPresentation {
  try {
    const value = JSON.parse(safeGetItem(getLocalUiKey("task", taskId)) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}

export function setLocalTaskPresentation(taskId: string, presentation: LocalTaskPresentation): void {
  safeSetItem(getLocalUiKey("task", taskId), JSON.stringify(presentation));
}

export function removeLocalTaskPresentation(taskId: string): void {
  safeRemoveItem(getLocalUiKey("task", taskId));
}

export function getLocalFreeGroups(projectId: string): string[] {
  try {
    const value = JSON.parse(safeGetItem(getLocalUiKey("groups", projectId)) ?? "[]");
    return Array.isArray(value) ? value.filter((name): name is string => typeof name === "string") : [];
  } catch { return []; }
}

export function setLocalFreeGroups(projectId: string, names: string[]): void {
  safeSetItem(getLocalUiKey("groups", projectId), JSON.stringify(names));
}

// In-Memory cache para velocidade de nanossegundos durante a sessão
const memoryTasks = new Map<string, Task[]>();
let memoryManagements: CrmProjectManagement[] | null = null;
let memoryProjects: CrmProject[] | null = null;
let memorySession: CrmUserProfile | null = null;

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Se o quota exceder, podemos limpar chaves antigas de tarefas
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_TASKS_PREFIX) && k !== key) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.slice(0, 5).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, value);
    } catch {
      // Ignora falha silenciosamente caso localStorage esteja desativado
    }
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

function getTaskKey(projectId: string | null): string {
  return `${KEY_TASKS_PREFIX}${projectId ?? "all"}`;
}

// ---------------------------------------------------------------------------
// GESTÕES
// ---------------------------------------------------------------------------
export function getCachedManagements(): CrmProjectManagement[] | null {
  if (memoryManagements) {
    return memoryManagements;
  }
  const raw = safeGetItem(KEY_MANAGEMENTS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CrmProjectManagement[];
    if (Array.isArray(parsed)) {
      memoryManagements = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

export function setCachedManagements(managements: CrmProjectManagement[]): void {
  memoryManagements = managements;
  safeSetItem(KEY_MANAGEMENTS, JSON.stringify(managements));
}

// ---------------------------------------------------------------------------
// PROJETOS
// ---------------------------------------------------------------------------
export function getCachedProjects(): CrmProject[] | null {
  if (memoryProjects) {
    return memoryProjects;
  }
  const raw = safeGetItem(KEY_PROJECTS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CrmProject[];
    if (Array.isArray(parsed)) {
      memoryProjects = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

export function setCachedProjects(projects: CrmProject[]): void {
  memoryProjects = projects;
  safeSetItem(KEY_PROJECTS, JSON.stringify(projects));
}

// ---------------------------------------------------------------------------
// SESSÃO DO USUÁRIO
// ---------------------------------------------------------------------------
export function getCachedSession(): CrmUserProfile | null {
  if (memorySession) return memorySession;
  const raw = safeGetItem(KEY_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CrmUserProfile;
    if (parsed && typeof parsed === "object") {
      memorySession = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

export function setCachedSession(session: CrmUserProfile | null): void {
  memorySession = session;
  if (session) {
    safeSetItem(KEY_SESSION, JSON.stringify(session));
  } else {
    safeRemoveItem(KEY_SESSION);
  }
}

// ---------------------------------------------------------------------------
// TAREFAS POR PROJETO (0ms switch)
// ---------------------------------------------------------------------------
export function getCachedTasks(projectId: string | null): Task[] | null {
  const key = getTaskKey(projectId);
  if (memoryTasks.has(key)) {
    return memoryTasks.get(key) ?? null;
  }
  const raw = safeGetItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Task[];
    if (Array.isArray(parsed)) {
      memoryTasks.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

export function setCachedTasks(projectId: string | null, tasks: Task[]): void {
  const key = getTaskKey(projectId);
  memoryTasks.set(key, tasks);
  safeSetItem(key, JSON.stringify(tasks));
}

export function updateCachedTask(task: Task): void {
  // Atualiza na memória e no storage para todas as chaves onde ela possa existir
  for (const [key, list] of memoryTasks.entries()) {
    const index = list.findIndex((t) => t.id === task.id);
    if (index !== -1) {
      const updated = [...list];
      updated[index] = task;
      memoryTasks.set(key, updated);
      safeSetItem(key, JSON.stringify(updated));
    }
  }

  // Se tiver projectId, garante que a chave específica do projeto também contenha a tarefa atualizada
  if (task.projectId) {
    const existing = getCachedTasks(task.projectId);
    if (existing) {
      const index = existing.findIndex((t) => t.id === task.id);
      if (index !== -1) {
        existing[index] = task;
        setCachedTasks(task.projectId, existing);
      }
    }
  }
}

export function addCachedTask(task: Task): void {
  if (task.projectId) {
    const existing = getCachedTasks(task.projectId) ?? [];
    if (!existing.some((t) => t.id === task.id)) {
      setCachedTasks(task.projectId, [task, ...existing]);
    }
  }
  const allExisting = getCachedTasks(null);
  if (allExisting && !allExisting.some((t) => t.id === task.id)) {
    setCachedTasks(null, [task, ...allExisting]);
  }
}

export function removeCachedTask(taskId: string): void {
  for (const [key, list] of memoryTasks.entries()) {
    const filtered = list.filter((t) => t.id !== taskId);
    if (filtered.length !== list.length) {
      memoryTasks.set(key, filtered);
      safeSetItem(key, JSON.stringify(filtered));
    }
  }
}

export function clearGestorCache(): void {
  memoryTasks.clear();
  memoryManagements = null;
  memoryProjects = null;
  memorySession = null;
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
