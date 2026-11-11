import { afterEach, expect, test } from "bun:test";
import { IdeCrmApiError, IdeCrmClient } from "./index";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("cria gestão pela API do CRM", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return Response.json({ management: { id: "g1" } }, { status: 201 });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => "token-teste" });
  expect(await client.createManagement({ name: "Gestão", description: "Descrição" })).toEqual({ management: { id: "g1" } });
  expect(request.url).toBe("/api/crm/projects/managements");
  expect(request.method).toBe("POST");
  expect(request.headers.get("Authorization")).toBe("Bearer token-teste");
  expect(JSON.parse(request.body)).toEqual({ name: "Gestão", description: "Descrição" });
});

test("cria projeto na gestão escolhida pela API do CRM", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return Response.json({ project: { id: "p1" } }, { status: 201 });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => "token-teste" });
  expect(await client.createProject("gestão 1", { name: "Projeto", description: "Descrição" })).toEqual({ project: { id: "p1" } });
  expect(request.url).toBe("/api/crm/projects/managements/gest%C3%A3o%201/projects");
  expect(request.method).toBe("POST");
  expect(request.headers.get("Idempotency-Key")).toBeTruthy();
  expect(request.headers.get("Authorization")).toBe("Bearer token-teste");
  expect(JSON.parse(request.body)).toEqual({ name: "Projeto", description: "Descrição" });
});

test("envia token, dados e chave de idempotência ao criar tarefa", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return Response.json({ task: { id: "t1" } });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => "token-teste" });
  await client.createTask({ projectId: "p1", title: "Tarefa" });
  expect(request.url).toBe("/api/crm/projects/tasks");
  expect(request.method).toBe("POST");
  expect(request.credentials).toBe("include");
  expect(request.headers.get("Authorization")).toBe("Bearer token-teste");
  expect(request.headers.get("Idempotency-Key")).toBeTruthy();
  expect(JSON.parse(request.body)).toEqual({ projectId: "p1", title: "Tarefa" });
});

test("codifica filtros de tarefas e preserva lista vazia", async () => {
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return Response.json({ tasks: [] });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => null });
  expect(await client.listTasks({ projectId: "p 1", search: "ação" })).toEqual({ tasks: [] });
  const params = new URL(requestedUrl, "http://localhost").searchParams;
  expect(params.get("projectId")).toBe("p 1");
  expect(params.get("search")).toBe("ação");
});

test("distingue sessão expirada de falha do CRM", async () => {
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => null });
  globalThis.fetch = async () => Response.json({ error: "Sessão expirada" }, { status: 401 });
  expect(await client.getSession()).toEqual({ authenticated: false, user: null });
  globalThis.fetch = async () => Response.json({ error: "Indisponível" }, { status: 503 });
  await expect(client.getSession()).rejects.toBeInstanceOf(IdeCrmApiError);
});

test("envia IDs de responsáveis sem alterar outros campos", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return Response.json({ task: { id: "t1" } });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => null });
  await client.setTaskAssignees("t1", ["u1"]);
  expect(request.method).toBe("PATCH");
  expect(JSON.parse(request.body)).toEqual({ assigneeIds: ["u1"] });
  await client.setTaskAssignees("t1", []);
  expect(JSON.parse(request.body)).toEqual({ assigneeIds: [] });
});

test("deleteCalendarEvent omite scope OCCURRENCE em eventos avulsos e respeita scope explícito", async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, ...options };
    return Response.json({ ok: true });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => null });
  await client.deleteCalendarEvent("evt-1");
  expect(request.method).toBe("DELETE");
  expect(request.url).toBe("/api/crm/projects/calendar/evt-1");
  expect(request.body).toBeUndefined();

  await client.deleteCalendarEvent("evt-1__2026-11-12", "OCCURRENCE");
  expect(JSON.parse(request.body)).toEqual({ scope: "OCCURRENCE" });
});

test("consulta calendário por projeto, participantes e disponibilidade", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options?.method ?? "GET", body: options?.body });
    return Response.json({ events: [], tasks: [], participants: [], results: [], busy: [], suggestions: [] });
  };
  const client = new IdeCrmClient({ baseUrl: "/api/crm", getToken: () => null });

  await client.getCalendar("2026-11-01T00:00:00.000Z", "2026-12-01T00:00:00.000Z", "proj-1");
  expect(calls[0].url).toContain("projectId=proj-1");

  await client.listCalendarParticipants("proj-1");
  expect(calls[1].url).toBe("/api/crm/projects/calendar/participants?projectId=proj-1");

  await client.checkCalendarAvailability({ title: "Reunião", participantIds: ["u1"] });
  expect(calls[2].url).toBe("/api/crm/projects/calendar/availability");
  expect(calls[2].method).toBe("POST");

  await client.suggestCalendarSlots({
    start: "2026-11-12T00:00:00.000Z",
    end: "2026-11-15T00:00:00.000Z",
    durationMinutes: 60,
    projectId: "proj-1",
    participants: ["u1", "u2"],
  });
  expect(calls[3].url).toContain("durationMinutes=60");
  expect(calls[3].url).toContain("participants=u1%2Cu2");
});
