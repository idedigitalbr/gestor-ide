import { expect, test } from "bun:test";
import { getAllowedGroupTypes, hasTaskDetails, isBelowPageOrModule } from "./task-item-type";

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
