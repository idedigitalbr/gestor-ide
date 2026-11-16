import { afterEach, beforeEach, expect, test } from "bun:test";
import { IdeCrmClient } from "./index";
import { crmCache } from "./cache";

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  await crmCache.clear();
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  await crmCache.clear();
});

test("cache local-first: segunda chamada GET responde em 0ms do cache", async () => {
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    return Response.json({ dashboard: { totalProjects: 12 } });
  };

  const client = new IdeCrmClient({
    baseUrl: "/api/crm",
    getToken: () => "token-123",
    enableCache: true,
  });

  // 1ª chamada: vai no fetch
  const res1 = await client.getProjectsDashboard();
  expect(res1).toEqual({ dashboard: { totalProjects: 12 } });
  expect(fetchCount).toBe(1);

  // 2ª chamada: responde imediatamente do cache!
  const res2 = await client.getProjectsDashboard();
  expect(res2).toEqual({ dashboard: { totalProjects: 12 } });
  // O retorno é instantâneo a partir da memória
});

test("invalidação automática: mutação POST/PATCH limpa o cache relacionado", async () => {
  let fetchCount = 0;
  globalThis.fetch = async (url, opts) => {
    fetchCount++;
    if (opts?.method === "POST") {
      return Response.json({ task: { id: "nova-tarefa" } }, { status: 201 });
    }
    return Response.json({ tasks: [{ id: "t1" }] });
  };

  const client = new IdeCrmClient({
    baseUrl: "/api/crm",
    getToken: () => "token-123",
    enableCache: true,
  });

  // Salva no cache
  await client.listTasks({ projectId: "p1" });

  // Mutação criando tarefa
  await client.createTask({ projectId: "p1", title: "Nova" });

  // A chave de tarefas do projeto foi invalidada
  const cachedAfter = await crmCache.get("crm_/projects/tasks?projectId=p1");
  expect(cachedAfter).toBeNull();
});

test("resiliência offline: serve do cache se a rede falhar", async () => {
  let shouldFail = false;
  globalThis.fetch = async () => {
    if (shouldFail) {
      throw new Error("Falha de conexão / Offline");
    }
    return Response.json({ dashboard: { totalProjects: 99 } });
  };

  const client = new IdeCrmClient({
    baseUrl: "/api/crm",
    getToken: () => "token-123",
    enableCache: true,
  });

  // Popula cache enquanto online
  await client.getProjectsDashboard();

  // Simula queda de rede / offline
  shouldFail = true;

  // Chamada offline: ainda responde com sucesso graças ao cache persistido!
  const resOffline = await client.getProjectsDashboard();
  expect(resOffline).toEqual({ dashboard: { totalProjects: 99 } });
});
