import { expect, test } from "bun:test";
import { getAllowedGroupTypes, hasTaskDetails, isBelowPageOrModule, inferTaskItemType } from "./task-item-type";

test("tipos de grupo são liberados conforme o nível pai", () => {
  expect(getAllowedGroupTypes(null)).toEqual(["STAGE"]);
  expect(getAllowedGroupTypes("STAGE")).toEqual(["PAGE", "MODULE"]);
  expect(getAllowedGroupTypes("PAGE")).toEqual(["SECTION", "ITEM"]);
  expect(getAllowedGroupTypes("MODULE")).toEqual(["SECTION", "ITEM"]);
  expect(getAllowedGroupTypes("SECTION")).toEqual([]);
  expect(getAllowedGroupTypes("ITEM")).toEqual([]);
});

test("apenas descendentes de página ou módulo são subitens", () => {
  const tasks = [
    { id: "stage", itemType: "STAGE" },
    { id: "page", itemType: "PAGE", parentTaskId: "stage" },
    { id: "child", parentTaskId: "page" },
    { id: "module", itemType: "MODULE", parentTaskId: "stage" },
  ];
  expect(isBelowPageOrModule("stage", tasks)).toBe(false);
  expect(isBelowPageOrModule("page", tasks)).toBe(true);
  expect(isBelowPageOrModule("child", tasks)).toBe(true);
  expect(isBelowPageOrModule("module", tasks)).toBe(true);
  expect(isBelowPageOrModule("missing", tasks)).toBe(false);
  expect(isBelowPageOrModule("a", [{ id: "a", parentTaskId: "a" }])).toBe(false);
});

test("título e conclusão mantêm checklist; detalhes tornam subtarefa", () => {
  expect(hasTaskDetails({ status: "PENDENTE", priority: "Normal", description: "<p><br></p>" })).toBe(false);
  expect(hasTaskDetails({ status: "CONCLUÍDO", priority: "Normal" })).toBe(false);
  expect(hasTaskDetails({ dueDate: "2026-11-20" })).toBe(true);
  expect(hasTaskDetails({ assigneeId: "member" })).toBe(true);
  expect(hasTaskDetails({ description: "Conteúdo" })).toBe(true);
  expect(hasTaskDetails({ priority: "Alta" })).toBe(true);
});

test("inferTaskItemType infere o tipo corretamente por título ou hierarquia", () => {
  expect(inferTaskItemType({ title: "ETAPA 05 — GO-LIVE, ENTREGA E LANÇAMENTO" })).toBe("STAGE");
  expect(inferTaskItemType({ title: "Fase 1: Concepção" })).toBe("STAGE");
  expect(inferTaskItemType({ title: "M01 - Criação de reserva" })).toBe("MODULE");
  expect(inferTaskItemType({ title: "Módulo Financeiro" })).toBe("MODULE");
  expect(inferTaskItemType({ title: "2.1 — PG 01 — HOME" })).toBe("PAGE");
  expect(inferTaskItemType({ title: "Página de Detalhes" })).toBe("PAGE");
  expect(inferTaskItemType({ title: "Marco de Entrega V1" })).toBe("MILESTONE");
  expect(inferTaskItemType({ title: "Seção de Recursos" })).toBe("SECTION");
  expect(inferTaskItemType({ title: "5.1 — Homologação" })).toBe("TASK");
  expect(inferTaskItemType({ id: "root-stage", title: "Geral", parentTaskId: null }, [{ id: "c1", parentTaskId: "root-stage" }])).toBe("STAGE");
  expect(inferTaskItemType({ itemType: "PAGE", title: "ETAPA 01" })).toBe("PAGE"); // respeita itemType explícito
});

