import { afterEach, expect, test } from "bun:test";
import { POST } from "./[...path]/route";

const originalFetch = globalThis.fetch;
const originalCrmBaseUrl = process.env.IDE_CRM_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCrmBaseUrl === undefined) delete process.env.IDE_CRM_BASE_URL;
  else process.env.IDE_CRM_BASE_URL = originalCrmBaseUrl;
});

test("encaminha mutações autenticadas e preserva a resposta do CRM", async () => {
  process.env.IDE_CRM_BASE_URL = "https://crm.example.test";
  let forwarded;
  globalThis.fetch = async (url, options) => {
    forwarded = { url, ...options };
    return Response.json({ task: { id: "t1" } }, { status: 201 });
  };
  const request = new Request("http://localhost/api/crm/projects/tasks?x=1", {
    method: "POST",
    headers: { authorization: "Bearer token-teste", "content-type": "application/json", "idempotency-key": "chave-teste" },
    body: JSON.stringify({ title: "Tarefa" }),
  });
  const response = await POST(request, { params: Promise.resolve({ path: ["projects", "tasks"] }) });
  expect(forwarded.url).toBe("https://crm.example.test/api/projects/tasks?x=1");
  expect(forwarded.headers.get("authorization")).toBe("Bearer token-teste");
  expect(forwarded.headers.get("idempotency-key")).toBe("chave-teste");
  expect(JSON.parse(new TextDecoder().decode(forwarded.body))).toEqual({ title: "Tarefa" });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ task: { id: "t1" } });
});

test("preserva bytes de uploads multipart", async () => {
  let forwarded;
  globalThis.fetch = async (_url, options) => { forwarded = options; return Response.json({ ok: true }); };
  const bytes = new Uint8Array([0, 255, 128, 10, 13, 42]);
  const request = new Request("http://localhost/api/crm/account/avatar", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" }, body: bytes });
  await POST(request, { params: Promise.resolve({ path: ["account", "avatar"] }) });
  expect(Array.from(new Uint8Array(forwarded.body))).toEqual(Array.from(bytes));
  expect(forwarded.headers.get("content-type")).toBe("multipart/form-data; boundary=test");
});

test("retorna 502 quando o CRM não está acessível", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  const request = new Request("http://localhost/api/crm/projects/tasks", {
    method: "POST", headers: { authorization: "Bearer token-teste" },
  });
  const response = await POST(request, { params: Promise.resolve({ path: ["projects", "tasks"] }) });
  expect(response.status).toBe(502);
});
