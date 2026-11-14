import type { Task, TaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";

export type TaskDropMode = "before" | "nest" | "root";

/**
 * Verifica se `candidateId` pertence à subárvore descendente de `ancestorId`
 * (percorrendo `parentTaskId` para cima com guarda contra ciclos).
 */
export function isDescendantTask(
  tasks: readonly Task[],
  candidateId: string,
  ancestorId: string
): boolean {
  if (!candidateId || !ancestorId) return false;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set<string>();
  let currentId: string | undefined = candidateId;

  while (currentId) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    const current = byId.get(currentId);
    if (!current?.parentTaskId) return false;
    if (current.parentTaskId === ancestorId) return true;
    currentId = current.parentTaskId;
  }

  return false;
}

/**
 * Garante que reparentar `draggedTaskId` sob `nextParentId` não gera ciclo nem auto-referência.
 */
export function canReparentTask(
  tasks: readonly Task[],
  draggedTaskId: string,
  nextParentId: string | null | undefined
): boolean {
  if (!nextParentId) return true;
  if (nextParentId === draggedTaskId) return false;
  return !isDescendantTask(tasks, nextParentId, draggedTaskId);
}

/**
 * Reordena e/ou move `draggedTaskId` entre níveis hierárquicos ou grupos,
 * retornando a nova lista e os deltas para persistência.
 */
export function applyTaskDragAndDrop(
  tasks: readonly Task[],
  input: {
    draggedTaskId: string;
    targetTaskId: string | null;
    targetStatus?: TaskStatus;
    mode: TaskDropMode;
    customGroup?: string;
  }
): {
  nextTasks: Task[];
  updatedDragged: Task | null;
  changedParent: boolean;
  changedStatus: boolean;
} {
  const dragged = tasks.find((t) => t.id === input.draggedTaskId);
  if (!dragged) {
    return {
      nextTasks: [...tasks],
      updatedDragged: null,
      changedParent: false,
      changedStatus: false,
    };
  }

  const targetTask = input.targetTaskId
    ? tasks.find((t) => t.id === input.targetTaskId)
    : undefined;

  let nextParentId = dragged.parentTaskId;
  let nextCustomGroup = dragged.customGroup;

  if (input.mode === "nest") {
    if (!targetTask || !canReparentTask(tasks, dragged.id, targetTask.id)) {
      return {
        nextTasks: [...tasks],
        updatedDragged: null,
        changedParent: false,
        changedStatus: false,
      };
    }
    nextParentId = targetTask.id;
    nextCustomGroup = undefined;
  } else if (input.mode === "root") {
    nextParentId = undefined;
    if (input.customGroup !== undefined) {
      nextCustomGroup = input.customGroup || undefined;
    }
  } else if (input.mode === "before" && targetTask) {
    const candidateParent = targetTask.parentTaskId;
    if (canReparentTask(tasks, dragged.id, candidateParent)) {
      nextParentId = candidateParent;
    }
    if (!nextParentId) {
      nextCustomGroup = targetTask.customGroup;
    } else {
      nextCustomGroup = undefined;
    }
  }

  const nextStatus = input.targetStatus ?? dragged.status;
  const changedParent = (dragged.parentTaskId ?? null) !== (nextParentId ?? null);
  const changedStatus =
    normalizeTaskStatus(dragged.status) !== normalizeTaskStatus(nextStatus);

  const updatedDragged: Task = {
    ...dragged,
    status: nextStatus,
    parentTaskId: nextParentId,
    customGroup: nextCustomGroup,
    updatedAt: new Date().toISOString(),
  };

  const withoutDragged = tasks.filter((t) => t.id !== dragged.id);
  let nextTasks: Task[];

  if (!input.targetTaskId) {
    nextTasks = [...withoutDragged, updatedDragged];
  } else {
    const targetIndex = withoutDragged.findIndex((t) => t.id === input.targetTaskId);
    if (targetIndex === -1) {
      nextTasks = [...withoutDragged, updatedDragged];
    } else {
      nextTasks = [...withoutDragged];
      const insertAt = input.mode === "nest" ? targetIndex + 1 : targetIndex;
      nextTasks.splice(insertAt, 0, updatedDragged);
    }
  }

  return {
    nextTasks,
    updatedDragged,
    changedParent,
    changedStatus,
  };
}

function hasAncestorInSet(
  byId: ReadonlyMap<string, Task>,
  task: Task,
  candidates: ReadonlySet<string>
): boolean {
  const visited = new Set<string>([task.id]);
  let currentParentId = task.parentTaskId;
  while (currentParentId) {
    if (visited.has(currentParentId)) return false;
    if (candidates.has(currentParentId)) return true;
    visited.add(currentParentId);
    currentParentId = byId.get(currentParentId)?.parentTaskId;
  }
  return false;
}

/**
 * Valida se um lote de tarefas pode ser movido/reparentado para `targetTaskId`
 * sem gerar ciclos ou auto-referências.
 */
export function canBatchDropTasks(
  tasks: readonly Task[],
  draggedTaskIds: readonly string[],
  targetTaskId: string | null,
  mode: TaskDropMode
): boolean {
  const draggedSet = new Set(draggedTaskIds);
  if (draggedSet.size === 0) return false;
  if (targetTaskId && draggedSet.has(targetTaskId)) return false;
  if (mode === "root") return true;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const targetTask = targetTaskId ? byId.get(targetTaskId) : undefined;
  if (!targetTask) return false;

  const nextParentCandidate =
    mode === "nest" ? targetTask.id : targetTask.parentTaskId;

  for (const id of draggedSet) {
    const task = byId.get(id);
    if (!task) continue;
    if (hasAncestorInSet(byId, task, draggedSet)) continue;
    if (!canReparentTask(tasks, id, nextParentCandidate)) return false;
  }
  return true;
}

/**
 * Move múltiplas tarefas selecionadas entre níveis hierárquicos ou grupos em lote,
 * preservando subárvores internas quando pai e descendente são selecionados juntos.
 */
export function applyBatchTaskDragAndDrop(
  tasks: readonly Task[],
  input: {
    draggedTaskIds: readonly string[];
    targetTaskId: string | null;
    targetStatus?: TaskStatus;
    mode: TaskDropMode;
    customGroup?: string;
  }
): {
  nextTasks: Task[];
  updatedTasks: Task[];
  changedParentIds: Set<string>;
  changedStatusIds: Set<string>;
} {
  const uniqueIds = new Set(input.draggedTaskIds);
  const orderedDragged = tasks.filter((t) => uniqueIds.has(t.id));
  const emptyResult = {
    nextTasks: [...tasks],
    updatedTasks: [],
    changedParentIds: new Set<string>(),
    changedStatusIds: new Set<string>(),
  };

  if (orderedDragged.length === 0) return emptyResult;
  if (input.targetTaskId && uniqueIds.has(input.targetTaskId)) return emptyResult;
  if (!canBatchDropTasks(tasks, Array.from(uniqueIds), input.targetTaskId, input.mode)) {
    return emptyResult;
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const targetTask = input.targetTaskId ? byId.get(input.targetTaskId) : undefined;
  const nowIso = new Date().toISOString();

  const updatedTasks: Task[] = [];
  const changedParentIds = new Set<string>();
  const changedStatusIds = new Set<string>();

  for (const dragged of orderedDragged) {
    const keepsInternalParent = hasAncestorInSet(byId, dragged, uniqueIds);
    let nextParentId = dragged.parentTaskId;
    let nextCustomGroup = dragged.customGroup;

    if (!keepsInternalParent) {
      if (input.mode === "nest" && targetTask) {
        nextParentId = targetTask.id;
        nextCustomGroup = undefined;
      } else if (input.mode === "root") {
        nextParentId = undefined;
        if (input.customGroup !== undefined) {
          nextCustomGroup = input.customGroup || undefined;
        }
      } else if (input.mode === "before" && targetTask) {
        nextParentId = targetTask.parentTaskId;
        nextCustomGroup = nextParentId ? undefined : targetTask.customGroup;
      }
    }

    const nextStatus = input.targetStatus ?? dragged.status;
    const changedParent = (dragged.parentTaskId ?? null) !== (nextParentId ?? null);
    const changedStatus =
      normalizeTaskStatus(dragged.status) !== normalizeTaskStatus(nextStatus);

    if (changedParent) changedParentIds.add(dragged.id);
    if (changedStatus) changedStatusIds.add(dragged.id);

    updatedTasks.push({
      ...dragged,
      status: nextStatus,
      parentTaskId: nextParentId,
      customGroup: nextCustomGroup,
      updatedAt: nowIso,
    });
  }

  const withoutDragged = tasks.filter((t) => !uniqueIds.has(t.id));
  let nextTasks: Task[];

  if (!input.targetTaskId) {
    nextTasks = [...withoutDragged, ...updatedTasks];
  } else {
    const targetIndex = withoutDragged.findIndex((t) => t.id === input.targetTaskId);
    if (targetIndex === -1) {
      nextTasks = [...withoutDragged, ...updatedTasks];
    } else {
      nextTasks = [...withoutDragged];
      const insertAt = input.mode === "nest" ? targetIndex + 1 : targetIndex;
      nextTasks.splice(insertAt, 0, ...updatedTasks);
    }
  }

  return {
    nextTasks,
    updatedTasks,
    changedParentIds,
    changedStatusIds,
  };
}
