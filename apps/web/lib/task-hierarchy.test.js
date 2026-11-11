import { expect, test } from "bun:test";
import {
  applyTaskDragAndDrop,
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
