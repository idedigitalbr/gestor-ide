import { afterEach, expect, test } from "bun:test";
import { GET } from "./route";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("a sessão com token não inventa permissões administrativas", async () => {
  globalThis.fetch = async () => Response.json({
    account: { id: "1", name: "Pessoa", email: "pessoa@example.test", avatarUrl: null },
  });
  const response = await GET(new Request("http://localhost/api/crm/auth/token", {
    headers: { authorization: "Bearer token-de-teste" },
  }));
  const session = await response.json();
  expect(session.authenticated).toBe(true);
  expect(session.user.roles).toEqual([]);
  expect(session.user.permissions).toEqual([]);
  expect(session.user.modules).toEqual({ crm: false, projects: false, finance: false });
});
