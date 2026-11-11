import { expect, test } from "bun:test";
import { parseIsoOrDateString, toIsoDateString } from "./notion-date";

test("aceita datas reais nos formatos brasileiro e ISO", () => {
  expect(toIsoDateString(parseIsoOrDateString("29/02/2024"))).toBe("2024-02-29");
  expect(toIsoDateString(parseIsoOrDateString("2026-11-10T12:00:00Z"))).toBe("2026-11-10");
});

test("rejeita datas inexistentes sem avançar para outro mês", () => {
  expect(parseIsoOrDateString("31/02/2026")).toBeNull();
  expect(parseIsoOrDateString("2025-02-29")).toBeNull();
  expect(parseIsoOrDateString("2026-13-01")).toBeNull();
});
