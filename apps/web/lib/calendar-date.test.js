import { expect, test } from "bun:test";
import {
  shiftIsoDateKey,
  toExclusiveAllDayEndDate,
  toInclusiveAllDayEndDate,
} from "./calendar-date";

test("shiftIsoDateKey atravessa virada de mês, ano e ano bissexto sem erro de fuso", () => {
  expect(shiftIsoDateKey("2026-11-30", 1)).toBe("2026-12-01");
  expect(shiftIsoDateKey("2026-12-31", 1)).toBe("2027-01-01");
  expect(shiftIsoDateKey("2024-02-29", 1)).toBe("2024-03-01");
  expect(shiftIsoDateKey("2027-01-01T00:00:00.000Z", -1)).toBe("2026-12-31");
  expect(shiftIsoDateKey("2026-02-30", 1)).toBeNull();
});

test("toExclusiveAllDayEndDate converte evento de 1 dia ou vários dias para fim exclusivo (> início)", () => {
  expect(toExclusiveAllDayEndDate("2026-11-12", "2026-11-12")).toBe("2026-11-13");
  expect(toExclusiveAllDayEndDate("2026-11-12", "2026-11-14")).toBe("2026-11-15");
  expect(() => toExclusiveAllDayEndDate("2026-11-12", "2026-11-11")).toThrow(
    "Informe uma data final igual ou posterior à inicial."
  );
});

test("toInclusiveAllDayEndDate preserva round-trip ao editar evento vindo do IDE CRM", () => {
  expect(toInclusiveAllDayEndDate("2026-11-12", "2026-11-13")).toBe("2026-11-12");
  expect(toInclusiveAllDayEndDate("2026-11-12", "2026-11-15T00:00:00.000Z")).toBe(
    "2026-11-14"
  );
  expect(toInclusiveAllDayEndDate("2026-11-12", "2026-11-12")).toBe("2026-11-12");
  expect(toInclusiveAllDayEndDate("2026-11-12", null)).toBe("2026-11-12");
});
