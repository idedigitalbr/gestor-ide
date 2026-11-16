import { describe, expect, it } from "bun:test";
import {
  listViewsForProject,
  saveViewsForProject,
  deleteViewForProject,
} from "./project-views-store";

describe("Project Views Store (SQLite / Persistence)", () => {
  it("initializes project with default predefined views", () => {
    const testProjId = `test_proj_${Date.now()}`;
    const views = listViewsForProject(testProjId);

    expect(views.length).toBeGreaterThanOrEqual(2);
    expect(views.some((v) => v.name === "Arquivos & Documentos")).toBe(true);
    expect(views.some((v) => v.name === "IA")).toBe(true);
  });

  it("saves custom views and persists order and changes", () => {
    const testProjId = `test_proj_crud_${Date.now()}`;
    const initial = listViewsForProject(testProjId);

    const custom = {
      id: `custom_view_${Date.now()}`,
      projectId: testProjId,
      name: "Dashboard Metabase",
      icon: "BarChart2",
      url: "https://metabase.example.com",
      openMode: "embed" as const,
      order: 2,
      type: "custom" as const,
    };

    saveViewsForProject(testProjId, [...initial, custom]);

    const retrieved = listViewsForProject(testProjId);
    expect(retrieved.length).toBe(initial.length + 1);
    expect(retrieved.some((v) => v.name === "Dashboard Metabase")).toBe(true);
  });

  it("prevents deleting predefined views", () => {
    const testProjId = `test_proj_del_${Date.now()}`;
    const views = listViewsForProject(testProjId);
    const gdrive = views.find((v) => v.name === "Arquivos & Documentos");
    expect(gdrive).toBeDefined();

    expect(() => deleteViewForProject(testProjId, gdrive!.id)).toThrow(
      "Visualizações predefinidas não podem ser excluídas."
    );
  });
});
