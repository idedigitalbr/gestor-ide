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
