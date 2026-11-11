import { expect, test } from "bun:test";
import {
  mapCrmTaskToGestorTask,
  mapGestorTaskToCrmCreateInput,
  mapGestorTaskToCrmUpdateInput,
} from "./index";

const crmTask = {
  id: "task-1", projectId: "project-1", parentTaskId: "parent-1",
  title: "Tarefa", status: "pending", priority: "medium",
  startDate: "2026-11-01T00:00:00.000Z", dueDate: "2026-11-10T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z", tags: ["primeira", "segunda"],
  checklistItems: [{ id: "item-2", taskId: "task-1", parentId: "item-1", title: "Filho", completed: false }],
  assignees: [{ userId: "user-1", user: { id: "user-1", name: "Pessoa", email: "pessoa@example.test" } }],
  project: { id: "project-1", name: "Projeto", code: "IDE" },
};

test("preserva datas, hierarquia e etiquetas do CRM", () => {
  const task = mapCrmTaskToGestorTask(crmTask);
  expect(task.startDate).toBe("2026-11-01");
  expect(task.dueDate).toBe("2026-11-10");
  expect(task.parentTaskId).toBe("parent-1");
  expect(task.assigneeId).toBe("user-1");
  expect(task.subtasks[0].parentId).toBe("item-1");
  expect(task.tags).toEqual(["primeira", "segunda"]);
  expect(mapGestorTaskToCrmUpdateInput(task).tags).toEqual(["primeira", "segunda"]);
});

test("não transforma nome do projeto em etiqueta ao atualizar", () => {
  const task = mapCrmTaskToGestorTask({ ...crmTask, tags: [] });
  expect(task.tag).toBeUndefined();
  expect(mapGestorTaskToCrmUpdateInput(task)).not.toHaveProperty("tags");
});

test("envia datas e múltiplas etiquetas e permite limpar etiquetas", () => {
  const task = mapCrmTaskToGestorTask(crmTask);
  const input = mapGestorTaskToCrmCreateInput(task, "project-1");
  expect(input.startDate).toBe("2026-11-01");
  expect(input.parentTaskId).toBe("parent-1");
  expect(input.assigneeIds).toEqual(["user-1"]);
  expect(input.tags).toEqual(["primeira", "segunda"]);
  expect(mapGestorTaskToCrmUpdateInput({ tags: [] }).tags).toEqual([]);
});
