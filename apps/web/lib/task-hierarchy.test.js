import { expect, test } from "bun:test";
import {
  applyBatchTaskDragAndDrop,
  applyTaskDragAndDrop,
  canBatchDropTasks,
  canReparentTask,
  isDescendantTask,
} from "./task-hierarchy";

const baseTasks = [
  {
    id: "root-a",
    code: "IDE-1",
    title: "Pai A",
    description: "",
    status: "PENDENTE",
    priority: "Normal",
    subtasks: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "child-a1",
    parentTaskId: "root-a",
    code: "IDE-2",
    title: "Filho A1",
    description: "",
    status: "PENDENTE",
    priority: "Normal",
    subtasks: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "grandchild-a1",
    parentTaskId: "child-a1",
    code: "IDE-3",
    title: "Neto A1",
    description: "",
    status: "PENDENTE",
    priority: "Normal",
    subtasks: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "root-b",
    code: "IDE-4",
    title: "Pai B",
    description: "",
    status: "FAZENDO AGORA",
    priority: "Alta",
    subtasks: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
];

test("canReparentTask impede ciclos ao tentar mover pai para próprio descendente", () => {
  expect(isDescendantTask(baseTasks, "grandchild-a1", "root-a")).toBe(true);
  expect(canReparentTask(baseTasks, "root-a", "grandchild-a1")).toBe(false);
  expect(canReparentTask(baseTasks, "root-a", "root-a")).toBe(false);
  expect(canReparentTask(baseTasks, "root-a", "root-b")).toBe(true);
  expect(canReparentTask(baseTasks, "child-a1", null)).toBe(true);
});

test("applyTaskDragAndDrop move tarefa para dentro de outro pai e promove de volta para raiz", () => {
  const nested = applyTaskDragAndDrop(baseTasks, {
    draggedTaskId: "root-b",
    targetTaskId: "root-a",
    targetStatus: "PENDENTE",
    mode: "nest",
  });
  expect(nested.changedParent).toBe(true);
  expect(nested.updatedDragged?.parentTaskId).toBe("root-a");

  const promoted = applyTaskDragAndDrop(nested.nextTasks, {
    draggedTaskId: "root-b",
    targetTaskId: null,
    targetStatus: "FAZENDO AGORA",
    mode: "root",
  });
  expect(promoted.changedParent).toBe(true);
  expect(promoted.updatedDragged?.parentTaskId).toBeUndefined();
  expect(promoted.updatedDragged?.status).toBe("FAZENDO AGORA");
});

test("applyBatchTaskDragAndDrop move lote preservando subárvore interna e bloqueando ciclos", () => {
  expect(canBatchDropTasks(baseTasks, ["root-a", "child-a1"], "grandchild-a1", "nest")).toBe(false);
  expect(canBatchDropTasks(baseTasks, ["root-a", "child-a1"], "root-a", "before")).toBe(false);
  expect(canBatchDropTasks(baseTasks, ["root-a", "child-a1"], "root-b", "nest")).toBe(true);

  const batchNested = applyBatchTaskDragAndDrop(baseTasks, {
    draggedTaskIds: ["root-a", "child-a1"],
    targetTaskId: "root-b",
    targetStatus: "FAZENDO AGORA",
    mode: "nest",
  });

  const movedRootA = batchNested.nextTasks.find((t) => t.id === "root-a");
  const movedChildA1 = batchNested.nextTasks.find((t) => t.id === "child-a1");
  expect(movedRootA?.parentTaskId).toBe("root-b");
  expect(movedChildA1?.parentTaskId).toBe("root-a");
  expect(movedRootA?.status).toBe("FAZENDO AGORA");
  expect(movedChildA1?.status).toBe("FAZENDO AGORA");
  expect(batchNested.changedParentIds.has("root-a")).toBe(true);
  expect(batchNested.changedParentIds.has("child-a1")).toBe(false);

  const batchRoot = applyBatchTaskDragAndDrop(batchNested.nextTasks, {
    draggedTaskIds: ["root-a", "child-a1"],
    targetTaskId: null,
    targetStatus: "PENDENTE",
    mode: "root",
    customGroup: "Sprint 2",
  });
  expect(batchRoot.nextTasks.find((t) => t.id === "root-a")?.parentTaskId).toBeUndefined();
  expect(batchRoot.nextTasks.find((t) => t.id === "root-a")?.customGroup).toBe("Sprint 2");
  expect(batchRoot.nextTasks.find((t) => t.id === "child-a1")?.parentTaskId).toBe("root-a");
});
