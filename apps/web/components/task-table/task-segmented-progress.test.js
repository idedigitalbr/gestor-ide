import { describe, expect, test } from "bun:test";
import { computeTaskDescendantsSummary } from "./task-segmented-progress";

function task(id, fields = {}) {
  return { id, code: id, title: id, description: "", status: "PENDENTE", priority: "Normal", createdAt: "2026-01-01", ...fields };
}

describe("progresso da hierarquia", () => {
  test("conta tarefas e subtarefas de todos os níveis", () => {
    const root = task("root", { subtasks: [{ id: "a", title: "A", completed: true }] });
    const child = task("child", { parentTaskId: "root", status: "FAZENDO AGORA", subtasks: [{ id: "b", title: "B", completed: false }] });
    const grandchild = task("grandchild", { parentTaskId: "child", status: "CONCLUÍDO" });
    expect(computeTaskDescendantsSummary(root, [root, child, grandchild])).toMatchObject({ completed: 2, total: 4 });
  });

  test("não inclui a própria tarefa em relações circulares", () => {
    const root = task("root", { parentTaskId: "child" });
    const child = task("child", { parentTaskId: "root" });
    expect(computeTaskDescendantsSummary(root, [root, child])).toMatchObject({ completed: 0, total: 1 });
  });
});
