import { describe, expect, it, beforeEach } from "bun:test";
import { IdeCrmClient } from "./index";
import { crmCache } from "./cache";

describe("Custom Project Views - SDK Client", () => {
  beforeEach(async () => {
    await crmCache.clear();
  });

  it("returns default predefined views when none exist in CRM settings", async () => {
    globalThis.fetch = async () => {
      return Response.json({ settings: {} });
    };

    const client = new IdeCrmClient({
      baseUrl: "https://crm.test/api",
      getToken: () => "token-abc",
    });

    const { views } = await client.listProjectCustomViews("proj-alpha");
    expect(views).toHaveLength(2);
    expect(views[0].name).toBe("Arquivos & Documentos");
    expect(views[1].name).toBe("IA");
  });

  it("can create, update, reorder and delete a custom view", async () => {
    let savedSettings: any = null;

    globalThis.fetch = async (url, opts) => {
      if (opts?.method === "POST" && String(url).includes("/settings")) {
        savedSettings = JSON.parse(opts.body as string);
        return Response.json({ ok: true });
      }
      return Response.json({ settings: savedSettings?.settings || {} });
    };

    const client = new IdeCrmClient({
      baseUrl: "https://crm.test/api",
      getToken: () => "token-abc",
    });

    // 1. Create
    const { view: created } = await client.createProjectCustomView("proj-alpha", {
      name: "Figma App",
      icon: "Palette",
      url: "https://figma.com/design/123",
      openMode: "embed",
    });
    expect(created.name).toBe("Figma App");
    expect(created.openMode).toBe("embed");
    expect(created.url).toBe("https://figma.com/design/123");

    // 2. List
    const { views: listAfterCreate } = await client.listProjectCustomViews("proj-alpha");
    expect(listAfterCreate).toHaveLength(3);
    expect(listAfterCreate.some((v) => v.id === created.id)).toBe(true);

    // 3. Update
    const { view: updated } = await client.updateProjectCustomView("proj-alpha", created.id, {
      name: "Figma Protótipo",
      openMode: "new_tab",
    });
    expect(updated.name).toBe("Figma Protótipo");
    expect(updated.openMode).toBe("new_tab");

    // 4. Delete
    const { ok } = await client.deleteProjectCustomView("proj-alpha", created.id);
    expect(ok).toBe(true);

    const { views: listAfterDelete } = await client.listProjectCustomViews("proj-alpha");
    expect(listAfterDelete).toHaveLength(2);
    expect(listAfterDelete.some((v) => v.id === created.id)).toBe(false);
  });

  it("prevents deleting predefined views", async () => {
    globalThis.fetch = async () => {
      return Response.json({ settings: {} });
    };

    const client = new IdeCrmClient({
      baseUrl: "https://crm.test/api",
      getToken: () => "token-abc",
    });

    const { views } = await client.listProjectCustomViews("proj-beta");
    const gdriveView = views[0];

    expect(client.deleteProjectCustomView("proj-beta", gdriveView.id)).rejects.toThrow(
      "Visualizações predefinidas não podem ser excluídas."
    );
  });
});
