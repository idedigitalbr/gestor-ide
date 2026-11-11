import { expect, test } from "bun:test";
import { getAllowedGroupTypes } from "./task-item-type";

test("tipos de grupo são liberados conforme o nível pai", () => {
  expect(getAllowedGroupTypes(null)).toEqual(["STAGE"]);
  expect(getAllowedGroupTypes("STAGE")).toEqual(["PAGE", "MODULE"]);
  expect(getAllowedGroupTypes("PAGE")).toEqual(["SECTION", "ITEM"]);
  expect(getAllowedGroupTypes("MODULE")).toEqual(["SECTION", "ITEM"]);
  expect(getAllowedGroupTypes("SECTION")).toEqual([]);
  expect(getAllowedGroupTypes("ITEM")).toEqual([]);
});
