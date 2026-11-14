import type { Task } from "@gestor-ide/core";

export interface ReconcileTasksOptions {
  editingTaskId?: string | null;
  isModalDirty?: boolean;
  pendingTaskIds?: ReadonlySet<string>;
}

export interface ReconcileTasksResult {
  tasks: Task[];
  hasEditingConflict: boolean;
}

/**
 * Reconcilia tarefas remotas vindas do IDE CRM com o estado local:
 * - Preserva tarefas otimistas ainda não confirmadas (`task-*`).
 * - Não sobrescreve a tarefa atualmente aberta no modal quando há edições não salvas
 *   nem tarefas com mutações otimistas em andamento.
 * - Sinaliza conflito caso a tarefa em edição tenha mudado no servidor remoto.
 */
export function reconcileRemoteTasks(
  localTasks: readonly Task[],
  remoteTasks: readonly Task[],
  options: ReconcileTasksOptions = {}
): ReconcileTasksResult {
  const editingId = options.isModalDirty ? options.editingTaskId ?? null : null;
  const pendingIds = options.pendingTaskIds ?? new Set<string>();

  const localById = new Map(localTasks.map((task) => [task.id, task]));
  const remoteIds = new Set(remoteTasks.map((task) => task.id));

  let hasEditingConflict = false;

  const mergedRemote = remoteTasks.map((remoteTask) => {
    const localTask = localById.get(remoteTask.id);
    if (!localTask) return remoteTask;

    if (editingId && remoteTask.id === editingId) {
      if (
        remoteTask.updatedAt &&
        localTask.updatedAt &&
        remoteTask.updatedAt !== localTask.updatedAt
      ) {
        hasEditingConflict = true;
      }
      return localTask;
    }

    if (pendingIds.has(remoteTask.id)) {
      return localTask;
    }

    return remoteTask;
  });

  // Mantém tarefas temporárias criadas localmente enquanto o POST ainda está em andamento.
  const optimisticLocal = localTasks.filter(
    (task) => task.id.startsWith("task-") && !remoteIds.has(task.id)
  );

  return {
    tasks: [...optimisticLocal, ...mergedRemote],
    hasEditingConflict,
  };
}
