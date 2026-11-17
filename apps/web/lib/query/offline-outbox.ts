import { get, set } from "idb-keyval";
import { ideCrmClient } from "@gestor-ide/sdk";
import type { CrmProjectTask } from "@gestor-ide/core";

export const OUTBOX_STORAGE_KEY = "ide_gestor_offline_outbox_v1";

export type OutboxActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "DELETE_TASK"
  | "SET_ASSIGNEES"
  | "CREATE_CHECKLIST"
  | "UPDATE_CHECKLIST"
  | "DELETE_CHECKLIST"
  | "CREATE_COMMENT";

export interface OutboxItem {
  id: string;
  type: OutboxActionType;
  tempTaskId?: string;
  taskId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
}

export interface OutboxSyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
}

type OutboxListener = (status: OutboxSyncStatus) => void;
type IdSwapListener = (tempId: string, realId: string, realTask: CrmProjectTask) => void;

let isSyncing = false;
let lastSyncedAt: string | null = null;
const listeners = new Set<OutboxListener>();
const idSwapListeners = new Set<IdSwapListener>();

export function subscribeOutboxStatus(listener: OutboxListener): () => void {
  listeners.add(listener);
  listener(getOutboxSyncStatus());
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeIdSwap(listener: IdSwapListener): () => void {
  idSwapListeners.add(listener);
  return () => {
    idSwapListeners.delete(listener);
  };
}

let cachedPendingCount = 0;

function notifyListeners() {
  const status = getOutboxSyncStatus();
  for (const listener of listeners) {
    try {
      listener(status);
    } catch {}
  }
}

export function getOutboxSyncStatus(): OutboxSyncStatus {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
  return {
    pendingCount: cachedPendingCount,
    isSyncing,
    isOnline,
    lastSyncedAt,
  };
}

const memoryStore = new Map<string, unknown>();

async function getStoredValue<T>(key: string): Promise<T | undefined> {
  if (typeof indexedDB !== "undefined") {
    try {
      return await get<T>(key);
    } catch {
      return memoryStore.get(key) as T | undefined;
    }
  }
  return memoryStore.get(key) as T | undefined;
}

async function setStoredValue<T>(key: string, value: T): Promise<void> {
  if (typeof indexedDB !== "undefined") {
    try {
      await set(key, value);
      return;
    } catch {
      memoryStore.set(key, value);
      return;
    }
  }
  memoryStore.set(key, value);
}

/**
 * Lê todos os itens da fila persistida no IndexedDB (ou store em memória).
 */
export async function getOutboxQueue(): Promise<OutboxItem[]> {
  try {
    const queue = await getStoredValue<OutboxItem[]>(OUTBOX_STORAGE_KEY);
    const result = Array.isArray(queue) ? queue : [];
    cachedPendingCount = result.length;
    return result;
  } catch {
    return [];
  }
}

/**
 * Salva a fila inteira no IndexedDB (ou store em memória).
 */
async function saveOutboxQueue(queue: OutboxItem[]): Promise<void> {
  try {
    await setStoredValue(OUTBOX_STORAGE_KEY, queue);
    cachedPendingCount = queue.length;
    notifyListeners();
  } catch {}
}

/**
 * Enfileira uma mutação offline para ser sincronizada quando houver conexão.
 */
export async function enqueueOutboxItem(
  item: Omit<OutboxItem, "id" | "createdAt" | "attempts">,
  options?: { autoProcess?: boolean }
): Promise<OutboxItem> {
  const queue = await getOutboxQueue();
  const newItem: OutboxItem = {
    ...item,
    id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  queue.push(newItem);
  await saveOutboxQueue(queue);

  // Se já estivermos online e autoProcess ativo, tenta processar imediatamente em segundo plano
  if (options?.autoProcess !== false) {
    if (typeof navigator === "undefined" || navigator.onLine) {
      void processOfflineOutbox();
    }
  }

  return newItem;
}

/**
 * Remove um item do outbox após envio com sucesso.
 */
export async function removeOutboxItem(id: string): Promise<void> {
  const queue = await getOutboxQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await saveOutboxQueue(filtered);
}

/**
 * Limpa toda a fila de outbox (usado em testes ou logout completo).
 */
export async function clearOutboxQueue(): Promise<void> {
  isSyncing = false;
  await saveOutboxQueue([]);
}

/**
 * Processador principal da Fila Offline.
 * Executa as mutações em FIFO com remapeamento de IDs temporários e retry resiliente.
 */
export async function processOfflineOutbox(): Promise<{
  processed: number;
  remaining: number;
}> {
  if (isSyncing) {
    return { processed: 0, remaining: cachedPendingCount };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { processed: 0, remaining: cachedPendingCount };
  }

  isSyncing = true;
  notifyListeners();

  const tempIdMap = new Map<string, string>();
  let processedCount = 0;

  try {
    const queue = await getOutboxQueue();
    if (queue.length === 0) {
      isSyncing = false;
      notifyListeners();
      return { processed: 0, remaining: 0 };
    }

    const unhandledQueue: OutboxItem[] = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];

      // Remapear taskId se já tiver sido substituído por uma criação prévia na mesma fila
      let targetTaskId = item.taskId;
      if (targetTaskId && tempIdMap.has(targetTaskId)) {
        targetTaskId = tempIdMap.get(targetTaskId)!;
      }
      if (item.tempTaskId && tempIdMap.has(item.tempTaskId)) {
        targetTaskId = tempIdMap.get(item.tempTaskId)!;
      }

      try {
        item.attempts += 1;
        item.lastAttemptAt = new Date().toISOString();
        const payload = item.payload || {};

        switch (item.type) {
          case "CREATE_TASK": {
            const createInput = payload as Parameters<typeof ideCrmClient.createTask>[0];
            const res = await ideCrmClient.createTask(createInput);
            if (res?.task?.id) {
              const realId = res.task.id;
              if (item.tempTaskId) {
                tempIdMap.set(item.tempTaskId, realId);
                // Notificar quem estiver escutando (TaskApp) para remapear em memória/localStorage
                for (const swapListener of idSwapListeners) {
                  try {
                    swapListener(item.tempTaskId, realId, res.task);
                  } catch {}
                }
              }
            }
            break;
          }

          case "UPDATE_TASK": {
            if (!targetTaskId) break;
            const updateInput = payload as Record<string, unknown>;
            await ideCrmClient.updateTask(targetTaskId, updateInput);
            break;
          }

          case "DELETE_TASK": {
            if (!targetTaskId) break;
            await ideCrmClient.deleteTask(targetTaskId);
            break;
          }

          case "SET_ASSIGNEES": {
            if (!targetTaskId) break;
            const assigneeIds = (payload.assigneeIds as string[]) || [];
            await ideCrmClient.setTaskAssignees(targetTaskId, assigneeIds);
            break;
          }

          case "CREATE_CHECKLIST": {
            if (!targetTaskId) break;
            const title = (payload.title as string) || "";
            await ideCrmClient.createChecklistItem(targetTaskId, title);
            break;
          }

          case "UPDATE_CHECKLIST": {
            if (!targetTaskId) break;
            const itemId = (payload.itemId as string) || "";
            const updates = (payload.updates as { completed?: boolean; title?: string }) || {};
            await ideCrmClient.updateChecklistItem(targetTaskId, itemId, updates);
            break;
          }

          case "DELETE_CHECKLIST": {
            if (!targetTaskId) break;
            const itemId = (payload.itemId as string) || "";
            await ideCrmClient.deleteChecklistItem(targetTaskId, itemId);
            break;
          }

          case "CREATE_COMMENT": {
            if (!targetTaskId) break;
            const content = (payload.content as string) || "";
            await ideCrmClient.createTaskComment(targetTaskId, content);
            break;
          }
        }

        processedCount += 1;
      } catch (err: unknown) {
        // Se for falha de rede/offline, interrompe o loop e mantém os itens restantes na fila
        const errorMsg = String(err);
        const isNetworkFailure =
          typeof navigator !== "undefined" && navigator.onLine === false
            ? true
            : errorMsg.includes("Failed to fetch") ||
              errorMsg.includes("NetworkError") ||
              errorMsg.includes("abort") ||
              errorMsg.includes("timeout") ||
              errorMsg.includes("502") ||
              errorMsg.includes("503") ||
              errorMsg.includes("504");

        if (isNetworkFailure) {
          item.error = "Aguardando conexão com a internet";
          // Preserva o item atual e todos os subsequentes
          unhandledQueue.push(item, ...queue.slice(i + 1));
          break;
        } else {
          // Erro irrecuperável do cliente (ex: 400 ou 404 tarefa já deletada)
          // Se tentou mais de 5 vezes, remove para não travar a fila
          if (item.attempts >= 5) {
            continue;
          }
          item.error = errorMsg;
          unhandledQueue.push(item);
        }
      }
    }

    await saveOutboxQueue(unhandledQueue);
    if (processedCount > 0) {
      lastSyncedAt = new Date().toISOString();
    }
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { processed: processedCount, remaining: cachedPendingCount };
}

// Inicializar listener de reconexão do navegador / WebView
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void processOfflineOutbox();
  });
}
