import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  enqueueOutboxItem,
  getOutboxQueue,
  clearOutboxQueue,
  getOutboxSyncStatus,
  processOfflineOutbox,
  subscribeIdSwap,
} from "./offline-outbox";
import { ideCrmClient } from "@gestor-ide/sdk";

describe("Offline Outbox Queue (TanStack Query + IndexedDB)", () => {
  beforeEach(async () => {
    await clearOutboxQueue();
  });

  it("enfileira itens no Outbox com metadados corretos", async () => {
    const item = await enqueueOutboxItem(
      {
        type: "CREATE_TASK",
        tempTaskId: "task-temp-1",
        payload: { title: "Tarefa Offline Criada no Avião", projectId: "proj-1" },
      },
      { autoProcess: false }
    );

    expect(item.id).toMatch(/^outbox_/);
    expect(item.type).toBe("CREATE_TASK");
    expect(item.tempTaskId).toBe("task-temp-1");
    expect(item.attempts).toBe(0);

    const queue = await getOutboxQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].tempTaskId).toBe("task-temp-1");
  });

  it("retorna o status de sincronização correto", async () => {
    await enqueueOutboxItem(
      {
        type: "UPDATE_TASK",
        taskId: "task-1",
        payload: { status: "COMPLETED" },
      },
      { autoProcess: false }
    );

    const status = getOutboxSyncStatus();
    expect(status.pendingCount).toBe(1);
    expect(status.isSyncing).toBe(false);
  });

  it("processa mutações da fila em ordem FIFO e invoca o SDK", async () => {
    let calledTask = false;
    const originalCreate = ideCrmClient.createTask;
    ideCrmClient.createTask = mock(async () => {
      calledTask = true;
      return {
        task: {
          id: "crm-real-task-123",
          title: "Tarefa Offline",
          code: "TSK-001",
          status: "TODO",
          projectId: "proj-1",
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }) as unknown as typeof ideCrmClient.createTask;

    await enqueueOutboxItem(
      {
        type: "CREATE_TASK",
        tempTaskId: "task-temp-abc",
        payload: { title: "Tarefa Offline", projectId: "proj-1" },
      },
      { autoProcess: false }
    );

    const result = await processOfflineOutbox();
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(calledTask).toBe(true);

    const remainingQueue = await getOutboxQueue();
    expect(remainingQueue.length).toBe(0);

    // Restaurar
    ideCrmClient.createTask = originalCreate;
  });

  it("remapeia tempTaskId para realId via IdSwap para itens subsequentes", async () => {
    let swappedTemp = "";
    let swappedReal = "";
    const unsub = subscribeIdSwap((temp, real) => {
      swappedTemp = temp;
      swappedReal = real;
    });

    let updatedTaskIdPassed = "";
    const originalCreate = ideCrmClient.createTask;
    const originalUpdate = ideCrmClient.updateTask;

    ideCrmClient.createTask = mock(async () => {
      return {
        task: {
          id: "crm-def-456",
          title: "Tarefa Pai",
          code: "TSK-002",
          status: "TODO",
          projectId: "proj-1",
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }) as unknown as typeof ideCrmClient.createTask;

    ideCrmClient.updateTask = mock(async (id) => {
      updatedTaskIdPassed = id;
      return { ok: true } as unknown as { task: unknown };
    }) as unknown as typeof ideCrmClient.updateTask;

    // 1. Cria tarefa offline com ID temporário
    await enqueueOutboxItem(
      {
        type: "CREATE_TASK",
        tempTaskId: "temp-999",
        payload: { title: "Tarefa Pai", projectId: "proj-1" },
      },
      { autoProcess: false }
    );

    // 2. Modifica a mesma tarefa offline ainda referenciando o ID temporário
    await enqueueOutboxItem(
      {
        type: "UPDATE_TASK",
        taskId: "temp-999",
        payload: { status: "IN_PROGRESS" },
      },
      { autoProcess: false }
    );

    const result = await processOfflineOutbox();
    expect(result.processed).toBe(2);
    expect(swappedTemp).toBe("temp-999");
    expect(swappedReal).toBe("crm-def-456");
    expect(updatedTaskIdPassed).toBe("crm-def-456");

    unsub();
    ideCrmClient.createTask = originalCreate;
    ideCrmClient.updateTask = originalUpdate;
  });
});
