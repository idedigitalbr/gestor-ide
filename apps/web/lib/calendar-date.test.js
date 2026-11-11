import { expect, test } from "bun:test";
import {
  computeCalendarQueryRange,
  doesSpanIncludeDay,
  getEventDateSpanKeys,
  getTaskDateSpanKeys,
  listDateKeys,
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

test("computeCalendarQueryRange mantém janela mensal dentro do limite de 62 dias", () => {
  const monthRange = computeCalendarQueryRange(new Date(2026, 10, 11), "month");
  const diffDays = (monthRange.end.getTime() - monthRange.start.getTime()) / 86_400_000;
  expect(monthRange.daysCount).toBe(42);
  expect(diffDays).toBeLessThanOrEqual(62);
  expect(listDateKeys(monthRange.gridStartKey, monthRange.daysCount)).toHaveLength(42);

  const weekRange = computeCalendarQueryRange(new Date(2026, 10, 11), "week");
  expect(weekRange.daysCount).toBe(7);
});

test("spans de eventos all-day e tarefas cobrem exatamente os dias corretos", () => {
  const eventSpan = getEventDateSpanKeys({
    id: "evt-1",
    title: "Sprint",
    description: null,
    type: "DELIVERY",
    status: "CONFIRMED",
    priority: "HIGH",
    projectId: null,
    isAllDay: true,
    startsAt: null,
    endsAt: null,
    allDayStartDate: "2026-11-12T12:00:00.000Z",
    allDayEndDate: "2026-11-15T12:00:00.000Z",
    timeZone: "America/Sao_Paulo",
    meetingMode: null,
    location: null,
    meetingUrl: null,
    notes: null,
    reminderMinutes: null,
    participants: [],
  });
  expect(eventSpan).toEqual({ startKey: "2026-11-12", inclusiveEndKey: "2026-11-14" });
  expect(doesSpanIncludeDay(eventSpan, "2026-11-14")).toBe(true);
  expect(doesSpanIncludeDay(eventSpan, "2026-11-15")).toBe(false);

  const taskSpan = getTaskDateSpanKeys({
    startDate: "2026-11-18T00:00:00.000Z",
    dueDate: "2026-11-20T00:00:00.000Z",
  });
  expect(taskSpan).toEqual({ startKey: "2026-11-18", inclusiveEndKey: "2026-11-20" });
  expect(doesSpanIncludeDay(taskSpan, "2026-11-19")).toBe(true);
});
