import { describe, expect, it } from "bun:test";
import { CANVAS_TEMPLATES } from "./templates";
import { CANVAS_NODE_TYPES } from "./nodes";
import type { CanvasNodeType, CanvasDocument } from "@gestor-ide/core";

describe("IDE Gestor Canvas v2 - Frontend Integration & Templates", () => {
  it("should provide the 4 official canvas templates with valid schemas", () => {
    expect(CANVAS_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    const keys = CANVAS_TEMPLATES.map((t) => t.key);
    expect(keys).toContain("empty");
    expect(keys).toContain("funnel-basic");
    expect(keys).toContain("system-flow");
    expect(keys).toContain("task-map");

    for (const tpl of CANVAS_TEMPLATES) {
      expect(tpl.key).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.category).toBeTruthy();

      const doc = tpl.createDocument();
      expect(doc.schemaVersion).toBe(1);
      expect(Array.isArray(doc.nodes)).toBe(true);
      expect(Array.isArray(doc.edges)).toBe(true);
      expect(doc.viewport).toBeDefined();
      expect(typeof doc.viewport.zoom).toBe("number");
    }
  });

  it("should register all 11 specialized node types", () => {
    const registeredTypes: CanvasNodeType[] = [
      "page",
      "source",
      "action",
      "email",
      "decision",
      "process",
      "startEnd",
      "note",
      "database",
      "group",
      "task",
    ];

    for (const type of registeredTypes) {
      expect(CANVAS_NODE_TYPES[type]).toBeDefined();
    }
  });

  it("funnel-basic template should contain valid journey nodes and connections", () => {
    const funnel = CANVAS_TEMPLATES.find((t) => t.key === "funnel-basic");
    expect(funnel).toBeDefined();

    const doc = funnel!.createDocument();
    expect(doc.nodes.length).toBeGreaterThanOrEqual(5);
    expect(doc.edges.length).toBeGreaterThanOrEqual(4);

    const nodeTypes = doc.nodes.map((n) => n.type);
    expect(nodeTypes).toContain("source");
    expect(nodeTypes).toContain("page");
    expect(nodeTypes).toContain("decision");
    expect(nodeTypes).toContain("email");
    expect(nodeTypes).toContain("action");

    // All edge targets and sources must exist in nodes
    const nodeIds = new Set(doc.nodes.map((n) => n.id));
    for (const edge of doc.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("task-map template should contain task nodes configured for CRM tasks", () => {
    const taskMap = CANVAS_TEMPLATES.find((t) => t.key === "task-map");
    expect(taskMap).toBeDefined();

    const doc = taskMap!.createDocument();
    const taskNodes = doc.nodes.filter((n) => n.type === "task");
    expect(taskNodes.length).toBeGreaterThan(0);

    for (const node of taskNodes) {
      expect(node.data).toBeDefined();
      expect(typeof (node.data as any).taskId).toBe("string");
    }
  });

  it("should handle document serialization round-trip without data loss", () => {
    const template = CANVAS_TEMPLATES.find((t) => t.key === "system-flow")!;
    const originalDoc = template.createDocument();

    const serialized = JSON.stringify(originalDoc);
    const parsed: CanvasDocument = JSON.parse(serialized);

    expect(parsed.schemaVersion).toBe(originalDoc.schemaVersion);
    expect(parsed.nodes.length).toBe(originalDoc.nodes.length);
    expect(parsed.edges.length).toBe(originalDoc.edges.length);

    for (let i = 0; i < parsed.nodes.length; i++) {
      expect(parsed.nodes[i].id).toBe(originalDoc.nodes[i].id);
      expect(parsed.nodes[i].type).toBe(originalDoc.nodes[i].type);
      expect(parsed.nodes[i].position).toEqual(originalDoc.nodes[i].position);
    }
  });
});
