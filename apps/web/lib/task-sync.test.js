import { expect, test } from "bun:test";
import { reconcileRemoteTasks } from "./task-sync";
import { canPerformProjectAction } from "./crm-permissions";

function makeTask(id, overrides = {}) {
  return {
    id,
    code: `IDE-${id}`,
    title: `Tarefa ${id}`,
    description: "",
    status: "PENDENTE",
    priority: "Normal",
    createdAt: "2026-11-10T10:00:00.000Z",
    updatedAt: "2026-11-10T10:00:00.000Z",
    ...overrides,
  };
}

test("reconcileRemoteTasks preserva tarefa em edição com alterações não salvas e sinaliza conflito", () => {
  const local = [
    makeTask("1", { title: "Editado localmente", updatedAt: "2026-11-10T10:00:00.000Z" }),
    makeTask("2", { title: "Antigo" }),
  ];
  const remote = [
    makeTask("1", { title: "Alterado no servidor", updatedAt: "2026-11-10T12:00:00.000Z" }),
    makeTask("2", { title: "Atualizado no servidor" }),
  ];

  const result = reconcileRemoteTasks(local, remote, {
    editingTaskId: "1",
    isModalDirty: true,
  });

  expect(result.hasEditingConflict).toBe(true);
  expect(result.tasks.find((t) => t.id === "1")?.title).toBe("Editado localmente");
  expect(result.tasks.find((t) => t.id === "2")?.title).toBe("Atualizado no servidor");
});

test("reconcileRemoteTasks preserva tarefas otimistas e com mutação em andamento", () => {
  const local = [
    makeTask("task-temp-1", { title: "Criando agora" }),
    makeTask("5", { status: "FAZENDO AGORA" }),
  ];
  const remote = [makeTask("5", { status: "PENDENTE" })];

  const result = reconcileRemoteTasks(local, remote, {
    pendingTaskIds: new Set(["5"]),
  });

  expect(result.tasks.map((t) => t.id)).toEqual(["task-temp-1", "5"]);
  expect(result.tasks.find((t) => t.id === "5")?.status).toBe("FAZENDO AGORA");
});

test("canPerformProjectAction respeita RBAC quando há claims explícitos e libera fallback de token sem claims", () => {
  expect(canPerformProjectAction(null, false, "projects.write")).toBe(true);
  expect(canPerformProjectAction(null, true, "projects.write")).toBe(false);

  const tokenUserWithoutClaims = {
    id: "u1",
    name: "Token",
    email: "t@example.test",
    avatarUrl: null,
    role: "",
    roles: [],
    permissions: [],
    modules: { crm: false, projects: false, finance: false },
  };
  expect(canPerformProjectAction(tokenUserWithoutClaims, true, "projects.write")).toBe(true);

  const viewerUser = {
    ...tokenUserWithoutClaims,
    role: "viewer",
    roles: ["viewer"],
    permissions: ["projects.read"],
  };
  expect(canPerformProjectAction(viewerUser, true, "projects.read")).toBe(true);
  expect(canPerformProjectAction(viewerUser, true, "projects.write")).toBe(false);
  expect(canPerformProjectAction(viewerUser, true, "projects.manage")).toBe(false);
});
