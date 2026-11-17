import { describe, expect, test } from "bun:test";
import type { Task } from "@/types/task";
import {
  parseIsoDate,
  formatIsoDate,
  daysDiff,
  startOfWeek,
  endOfWeek,
  getIsoWeekNumber,
  formatDateRange,
  calculateTaskProgress,
  getDerivedTaskDates,
  flattenTaskHierarchy,
  computeTimelineWindow,
  getBarPosition,
  getTodayPixel,
  wouldCreateDependencyCycle,
} from "./task-gantt-utils";

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    code: `IDE-${id}`,
    title: `Task ${id}`,
    description: "",
    status: "PENDENTE",
    priority: "Normal",
    createdAt: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("task-gantt-utils", () => {
  describe("datas e formatações", () => {
    test("parseIsoDate e formatIsoDate preservam round-trip sem deslocamento de fuso", () => {
      const d = parseIsoDate("2026-11-20");
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(10); // 0-based: nov = 10
      expect(d!.getDate()).toBe(20);
      expect(formatIsoDate(d!)).toBe("2026-11-20");
    });

    test("daysDiff calcula diferença exata em dias", () => {
      const d1 = parseIsoDate("2026-11-20")!;
      const d2 = parseIsoDate("2026-11-24")!;
      expect(daysDiff(d1, d2)).toBe(4);
    });

    test("startOfWeek e endOfWeek ajustam para segunda e domingo", () => {
      // 2026-11-20 é uma sexta-feira
      const d = parseIsoDate("2026-11-20")!;
      const start = startOfWeek(d);
      expect(formatIsoDate(start)).toBe("2026-11-16"); // Segunda-feira
      const end = endOfWeek(d);
      expect(formatIsoDate(end)).toBe("2026-11-22"); // Domingo
    });

    test("getIsoWeekNumber retorna semana correta", () => {
      const d = parseIsoDate("2026-11-20")!;
      expect(getIsoWeekNumber(d)).toBe(47);
    });

    test("formatDateRange formata intervalo pt-BR amigável", () => {
      expect(formatDateRange("2026-11-20", "2026-12-12")).toBe("20/nov – 12/dez");
      expect(formatDateRange("2026-11-20", "2026-11-20")).toBe("20/nov");
      expect(formatDateRange("2026-11-20", null)).toBe("20/nov");
      expect(formatDateRange(null, "2026-12-12")).toBe("12/dez");
      expect(formatDateRange(null, null)).toBe("-");
    });
  });

  describe("progresso e datas derivadas", () => {
    test("calcula progresso de folhas e agrega pais corretamente", () => {
      const leafPending = makeTask("l1", { status: "PENDENTE" });
      expect(calculateTaskProgress(leafPending, [leafPending])).toBe(0);

      const leafDone = makeTask("l2", { status: "CONCLUÍDO" });
      expect(calculateTaskProgress(leafDone, [leafDone])).toBe(100);

      const leafDoing = makeTask("l3", { status: "FAZENDO AGORA" });
      expect(calculateTaskProgress(leafDoing, [leafDoing])).toBe(50);

      const parent = makeTask("p1", { itemType: "STAGE" });
      const child1 = makeTask("c1", { parentTaskId: "p1", status: "CONCLUÍDO" });
      const child2 = makeTask("c2", { parentTaskId: "p1", status: "PENDENTE" });
      const all = [parent, child1, child2];
      expect(calculateTaskProgress(parent, all)).toBe(50);
    });

    test("deriva intervalo min-max de descendentes quando pai não tem datas", () => {
      const parent = makeTask("p1", { itemType: "STAGE" });
      const child1 = makeTask("c1", {
        parentTaskId: "p1",
        startDate: "2026-11-20",
        dueDate: "2026-11-24",
      });
      const child2 = makeTask("c2", {
        parentTaskId: "p1",
        startDate: "2026-11-26",
        dueDate: "2026-12-12",
      });

      const derived = getDerivedTaskDates(parent, [parent, child1, child2]);
      expect(derived.isDerived).toBe(true);
      expect(derived.startDate).toBe("2026-11-20");
      expect(derived.dueDate).toBe("2026-12-12");
    });

    test("prioriza datas próprias do pai se já estiverem definidas", () => {
      const parent = makeTask("p1", {
        itemType: "STAGE",
        startDate: "2026-11-01",
        dueDate: "2026-11-15",
      });
      const child = makeTask("c1", {
        parentTaskId: "p1",
        startDate: "2026-11-20",
        dueDate: "2026-12-12",
      });

      const derived = getDerivedTaskDates(parent, [parent, child]);
      expect(derived.isDerived).toBe(false);
      expect(derived.startDate).toBe("2026-11-01");
      expect(derived.dueDate).toBe("2026-11-15");
    });
  });

  describe("achatamento da árvore (flattenTaskHierarchy)", () => {
    test("recolher pai oculta todos os seus descendentes", () => {
      const stage = makeTask("stage", { itemType: "STAGE" });
      const moduleTask = makeTask("module", { parentTaskId: "stage", itemType: "MODULE" });
      const task1 = makeTask("t1", { parentTaskId: "module" });
      const all = [stage, moduleTask, task1];

      // Ambos expandidos
      const expandedRows = flattenTaskHierarchy(all, { stage: true, module: true });
      expect(expandedRows.map((r) => r.id)).toEqual(["stage", "module", "t1"]);

      // Módulo recolhido
      const collapsedModule = flattenTaskHierarchy(all, { stage: true, module: false });
      expect(collapsedModule.map((r) => r.id)).toEqual(["stage", "module"]);

      // Etapa recolhida
      const collapsedStage = flattenTaskHierarchy(all, { stage: false, module: true });
      expect(collapsedStage.map((r) => r.id)).toEqual(["stage"]);
    });
  });

  describe("janela temporal e barras", () => {
    test("computeTimelineWindow gera colunas e agrupadores de semana", () => {
      const items = flattenTaskHierarchy(
        [
          makeTask("t1", { startDate: "2026-11-20", dueDate: "2026-12-12" }),
        ],
        {}
      );

      const window = computeTimelineWindow(items, "week", 1.0);
      expect(window.columns.length).toBeGreaterThan(0);
      expect(window.dayWidth).toBeGreaterThan(0);
      expect(window.totalWidth).toBeGreaterThan(0);
      expect(window.headerGroups.length).toBeGreaterThan(0);
    });

    test("getBarPosition posiciona barra corretamente", () => {
      const windowStart = parseIsoDate("2026-11-16")!; // Segunda
      const dayWidth = 20;

      const pos = getBarPosition("2026-11-20", "2026-11-24", windowStart, dayWidth);
      expect(pos.isUndated).toBe(false);
      expect(pos.isMilestone).toBe(false);
      expect(pos.left).toBe(4 * 20); // 4 dias da segunda (sexta-feira)
      expect(pos.width).toBe(5 * 20); // 20 a 24 inclusive = 5 dias
    });

    test("getTodayPixel calcula ponto da linha Hoje", () => {
      const windowStart = parseIsoDate("2026-11-16")!;
      const pixel = getTodayPixel(windowStart, 20);
      expect(pixel).toBeGreaterThanOrEqual(0);
    });
  });

  describe("ciclos de dependências", () => {
    test("impede autorreferência", () => {
      expect(wouldCreateDependencyCycle([], "t1", "t1")).toBe(true);
    });

    test("permite dependência sem ciclo", () => {
      const deps = [{ id: "d1", fromTaskId: "t1", toTaskId: "t2" }];
      expect(wouldCreateDependencyCycle(deps, "t2", "t3")).toBe(false);
    });

    test("detecta ciclo direto A -> B -> A", () => {
      const deps = [{ id: "d1", fromTaskId: "t1", toTaskId: "t2" }];
      expect(wouldCreateDependencyCycle(deps, "t2", "t1")).toBe(true);
    });

    test("detecta ciclo indireto A -> B -> C -> A", () => {
      const deps = [
        { id: "d1", fromTaskId: "t1", toTaskId: "t2" },
        { id: "d2", fromTaskId: "t2", toTaskId: "t3" },
      ];
      expect(wouldCreateDependencyCycle(deps, "t3", "t1")).toBe(true);
      expect(wouldCreateDependencyCycle(deps, "t3", "t4")).toBe(false);
    });
  });
});
