import type { Task } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import { normalizeItemType, type ProjectTaskItemType } from "@/lib/task-item-type";
import { computeTaskDescendantsSummary } from "@/components/task-table/task-segmented-progress";
import type {
  GanttScale,
  GanttDisplayFilter,
  GanttRowItem,
  GanttTimeColumn,
  GanttTimeHeaderGroup,
  GanttBarPosition,
  TaskDependency,
} from "./task-gantt-types";

export const MS_PER_DAY = 86_400_000;

const PT_MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const PT_MONTHS_LONG = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PT_WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Converte string ISO YYYY-MM-DD em Date local às 12:00 (evita bugs de DST e fuso).
 */
export function parseIsoDate(val?: string | null): Date | null {
  if (!val || typeof val !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(val.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Converte Date para string ISO YYYY-MM-DD.
 */
export function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Retorna diferença em dias entre duas datas (inclusive ou delta).
 */
export function daysDiff(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Adiciona dias a uma data sem alterar a original.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Início da semana (Segunda-feira).
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Fim da semana (Domingo).
 */
export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  return addDays(start, 6);
}

/**
 * Número da semana ISO no ano (ex: Sem 47).
 */
export function getIsoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * MS_PER_DAY));
}

/**
 * Formata intervalo de datas para exibição em pt-BR (ex: "20/nov - 12/dez" ou "20 nov").
 */
export function formatDateRange(
  startDate?: string | null,
  dueDate?: string | null
): string {
  if (!startDate && !dueDate) return "-";
  const start = parseIsoDate(startDate);
  const due = parseIsoDate(dueDate);

  if (start && due) {
    const sStr = `${start.getDate()}/${PT_MONTHS_SHORT[start.getMonth()]}`;
    const dStr = `${due.getDate()}/${PT_MONTHS_SHORT[due.getMonth()]}`;
    return sStr === dStr ? sStr : `${sStr} – ${dStr}`;
  }
  if (start) {
    return `${start.getDate()}/${PT_MONTHS_SHORT[start.getMonth()]}`;
  }
  if (due) {
    return `${due.getDate()}/${PT_MONTHS_SHORT[due.getMonth()]}`;
  }
  return "-";
}

/**
 * Determina se a data é fim de semana (sábado ou domingo).
 */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Compara se duas datas correspondem ao mesmo dia civil.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ---------------------------------------------------------------------------
// Cálculo de Progresso
// ---------------------------------------------------------------------------

export function calculateTaskProgress(task: Task, allTasks: Task[]): number {
  const childTasks = allTasks.filter((t) => t.parentTaskId === task.id);
  const subtasks = task.subtasks ?? [];

  // Se tem filhos ou subtarefas, calcula resumo agregado
  if (childTasks.length > 0 || subtasks.length > 0) {
    const summary = computeTaskDescendantsSummary(task, allTasks);
    if (summary && summary.total > 0) {
      return Math.min(100, Math.max(0, Math.round((summary.completed / summary.total) * 100)));
    }
  }

  // Folha sem subtasks
  const status = normalizeTaskStatus(task.status);
  if (status === "CONCLUÍDO") return 100;
  if (status === "FAZENDO AGORA") return 50;
  return 0;
}

// ---------------------------------------------------------------------------
// Inferência de Período para Itens Pais / Agregadores
// ---------------------------------------------------------------------------

export function getDerivedTaskDates(
  task: Task,
  allTasks: Task[]
): { startDate: string | null; dueDate: string | null; isDerived: boolean } {
  // Se a própria tarefa tem datas definidas, use-as
  const ownStart = task.startDate?.slice(0, 10) ?? null;
  const ownDue = task.dueDate?.slice(0, 10) ?? null;

  if (ownStart || ownDue) {
    return {
      startDate: ownStart ?? ownDue,
      dueDate: ownDue ?? ownStart,
      isDerived: false,
    };
  }

  // Se não tem datas próprias, busca min/max dos descendentes
  const visited = new Set<string>();
  let minTime = Infinity;
  let maxTime = -Infinity;

  function collectDates(parentId: string) {
    if (visited.has(parentId)) return;
    visited.add(parentId);

    const children = allTasks.filter((t) => t.parentTaskId === parentId);
    for (const ch of children) {
      const s = parseIsoDate(ch.startDate);
      const d = parseIsoDate(ch.dueDate);

      if (s) {
        minTime = Math.min(minTime, s.getTime());
        maxTime = Math.max(maxTime, s.getTime());
      }
      if (d) {
        minTime = Math.min(minTime, d.getTime());
        maxTime = Math.max(maxTime, d.getTime());
      }
      collectDates(ch.id);
    }
  }

  collectDates(task.id);

  if (minTime !== Infinity && maxTime !== -Infinity) {
    return {
      startDate: formatIsoDate(new Date(minTime)),
      dueDate: formatIsoDate(new Date(maxTime)),
      isDerived: true,
    };
  }

  return {
    startDate: null,
    dueDate: null,
    isDerived: false,
  };
}

// ---------------------------------------------------------------------------
// Achatamento da Árvore Hierárquica
// ---------------------------------------------------------------------------

export function flattenTaskHierarchy(
  tasks: Task[],
  expandedTasks: Record<string, boolean>,
  displayFilter: GanttDisplayFilter = "all"
): GanttRowItem[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const childrenMap = new Map<string, Task[]>();

  for (const t of tasks) {
    const pId = t.parentTaskId;
    if (pId && byId.has(pId)) {
      if (!childrenMap.has(pId)) childrenMap.set(pId, []);
      childrenMap.get(pId)!.push(t);
    }
  }

  // Raízes: tarefas sem parentTaskId ou cujo pai não existe na lista
  const rootTasks = tasks.filter((t) => !t.parentTaskId || !byId.has(t.parentTaskId));

  const result: GanttRowItem[] = [];

  function traverse(task: Task, depth: number) {
    const children = childrenMap.get(task.id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks[task.id] !== false; // padrão expandido

    const itemType: ProjectTaskItemType = normalizeItemType(task.itemType);
    const { startDate, dueDate, isDerived } = getDerivedTaskDates(task, tasks);
    const progressPercent = calculateTaskProgress(task, tasks);

    const subtasks = task.subtasks ?? [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter((st) => st.completed).length;

    // Filtros de exibição
    let include = true;
    if (displayFilter === "tasks-only" && (itemType === "ITEM" || totalSubtasks > 0 && depth > 2)) {
      include = false;
    } else if (displayFilter === "dated-only" && !startDate && !dueDate) {
      include = false;
    } else if (displayFilter === "undated-only" && (startDate || dueDate)) {
      include = false;
    }

    if (include) {
      result.push({
        id: task.id,
        task,
        depth,
        hasChildren,
        isExpanded,
        itemType,
        startDate,
        dueDate,
        isDerivedDates: isDerived,
        progressPercent,
        totalSubtasks,
        completedSubtasks,
      });
    }

    // Se expandido, percorre os filhos recursivamente
    if (isExpanded && hasChildren) {
      for (const child of children) {
        traverse(child, depth + 1);
      }
    }
  }

  for (const root of rootTasks) {
    traverse(root, 0);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cálculo da Janela Temporal e Colunas da Timeline
// ---------------------------------------------------------------------------

export interface TimelineWindow {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  columns: GanttTimeColumn[];
  headerGroups: GanttTimeHeaderGroup[];
  dayWidth: number;
  totalWidth: number;
}

export function computeTimelineWindow(
  items: GanttRowItem[],
  scale: GanttScale,
  zoom: number // fator de 0.7 a 1.5 (100% = 1.0)
): TimelineWindow {
  const today = parseIsoDate(new Date().toISOString().slice(0, 10)) ?? new Date();

  // Coleta datas válidas de todas as linhas visíveis
  const timestamps: number[] = [today.getTime()];
  for (const item of items) {
    if (item.startDate) {
      const d = parseIsoDate(item.startDate);
      if (d) timestamps.push(d.getTime());
    }
    if (item.dueDate) {
      const d = parseIsoDate(item.dueDate);
      if (d) timestamps.push(d.getTime());
    }
  }

  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);

  let windowStart = parseIsoDate(formatIsoDate(new Date(minTs)))!;
  let windowEnd = parseIsoDate(formatIsoDate(new Date(maxTs)))!;

  // Adiciona margens antes e depois
  if (scale === "day") {
    windowStart = addDays(windowStart, -7);
    windowEnd = addDays(windowEnd, 14);
  } else if (scale === "week") {
    windowStart = addDays(windowStart, -14);
    windowEnd = addDays(windowEnd, 28);
  } else {
    // Mês
    windowStart = addDays(windowStart, -30);
    windowEnd = addDays(windowEnd, 60);
  }

  // Ajusta windowStart para início de semana (Segunda) e windowEnd para Domingo
  windowStart = startOfWeek(windowStart);
  windowEnd = endOfWeek(windowEnd);

  const totalDays = Math.max(14, daysDiff(windowStart, windowEnd) + 1);

  // Determinar dayWidth baseado na escala e zoom
  let baseDayWidth = 36;
  if (scale === "week") {
    baseDayWidth = 22; // ~154px por semana
  } else if (scale === "month") {
    baseDayWidth = 6;  // ~180px por mês
  }
  const dayWidth = Math.max(3, Math.round(baseDayWidth * zoom));

  const columns: GanttTimeColumn[] = [];
  const headerGroups: GanttTimeHeaderGroup[] = [];

  if (scale === "day") {
    let currentMonthKey = "";
    let currentMonthGroup: GanttTimeHeaderGroup | null = null;

    for (let i = 0; i < totalDays; i++) {
      const date = addDays(windowStart, i);
      const isCurToday = isSameDay(date, today);
      const isCurWeekend = isWeekend(date);

      columns.push({
        key: formatIsoDate(date),
        label: String(date.getDate()),
        subLabel: PT_WEEKDAYS_SHORT[date.getDay()],
        date,
        isToday: isCurToday,
        isWeekend: isCurWeekend,
        width: dayWidth,
      });

      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthKey !== currentMonthKey) {
        currentMonthKey = monthKey;
        currentMonthGroup = {
          key: monthKey,
          label: `${PT_MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`,
          width: dayWidth,
        };
        headerGroups.push(currentMonthGroup);
      } else if (currentMonthGroup) {
        currentMonthGroup.width += dayWidth;
      }
    }
  } else if (scale === "week") {
    // Cada coluna representa 1 semana (7 dias)
    const weekCount = Math.ceil(totalDays / 7);
    const weekColWidth = dayWidth * 7;
    let currentMonthKey = "";
    let currentMonthGroup: GanttTimeHeaderGroup | null = null;

    for (let w = 0; w < weekCount; w++) {
      const weekStartDate = addDays(windowStart, w * 7);
      const weekEndDate = addDays(weekStartDate, 6);
      const weekNumber = getIsoWeekNumber(weekStartDate);

      const sLabel = `${weekStartDate.getDate()} ${PT_MONTHS_SHORT[weekStartDate.getMonth()]}`;
      const eLabel = `${weekEndDate.getDate()} ${PT_MONTHS_SHORT[weekEndDate.getMonth()]}`;

      // A semana é "Hoje" se today estiver entre weekStartDate e weekEndDate
      const isWeekToday =
        today.getTime() >= weekStartDate.getTime() &&
        today.getTime() <= weekEndDate.getTime() + MS_PER_DAY;

      columns.push({
        key: `week-${formatIsoDate(weekStartDate)}`,
        label: `Sem ${weekNumber}`,
        subLabel: `${sLabel} – ${eLabel}`,
        date: weekStartDate,
        isToday: isWeekToday,
        width: weekColWidth,
      });

      // Agrupador superior de mês (baseado no meio da semana para evitar divisões estranhas)
      const midWeek = addDays(weekStartDate, 3);
      const monthKey = `${midWeek.getFullYear()}-${midWeek.getMonth()}`;
      if (monthKey !== currentMonthKey) {
        currentMonthKey = monthKey;
        currentMonthGroup = {
          key: monthKey,
          label: `${PT_MONTHS_LONG[midWeek.getMonth()]} ${midWeek.getFullYear()}`,
          width: weekColWidth,
        };
        headerGroups.push(currentMonthGroup);
      } else if (currentMonthGroup) {
        currentMonthGroup.width += weekColWidth;
      }
    }
  } else {
    // Escala Mês
    const monthsMap = new Map<string, { start: Date; days: number; label: string; year: number }>();
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(windowStart, i);
      const mKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthsMap.has(mKey)) {
        monthsMap.set(mKey, {
          start: date,
          days: 1,
          label: `${PT_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`,
          year: date.getFullYear(),
        });
      } else {
        monthsMap.get(mKey)!.days++;
      }
    }

    let currentYear = -1;
    let currentYearGroup: GanttTimeHeaderGroup | null = null;

    for (const [mKey, info] of monthsMap.entries()) {
      const colWidth = info.days * dayWidth;
      columns.push({
        key: mKey,
        label: info.label,
        date: info.start,
        width: colWidth,
      });

      if (info.year !== currentYear) {
        currentYear = info.year;
        currentYearGroup = {
          key: `year-${currentYear}`,
          label: String(currentYear),
          width: colWidth,
        };
        headerGroups.push(currentYearGroup);
      } else if (currentYearGroup) {
        currentYearGroup.width += colWidth;
      }
    }
  }

  const totalWidth = totalDays * dayWidth;

  return {
    startDate: windowStart,
    endDate: windowEnd,
    totalDays,
    columns,
    headerGroups,
    dayWidth,
    totalWidth,
  };
}

/**
 * Calcula posição em pixels de uma barra a partir das datas e da janela temporal.
 */
export function getBarPosition(
  startDateStr: string | null,
  dueDateStr: string | null,
  windowStart: Date,
  dayWidth: number
): GanttBarPosition {
  if (!startDateStr && !dueDateStr) {
    return {
      left: 0,
      width: 0,
      isMilestone: false,
      isUndated: true,
      isSingleDate: false,
    };
  }

  const s = parseIsoDate(startDateStr);
  const d = parseIsoDate(dueDateStr);

  if (s && d) {
    const minD = s.getTime() <= d.getTime() ? s : d;
    const maxD = s.getTime() <= d.getTime() ? d : s;
    const startDayIndex = daysDiff(windowStart, minD);
    const durationDays = Math.max(1, daysDiff(minD, maxD) + 1);

    return {
      left: Math.max(0, startDayIndex * dayWidth),
      width: Math.max(16, durationDays * dayWidth),
      isMilestone: false,
      isUndated: false,
      isSingleDate: false,
    };
  }

  // Apenas uma data definida
  const singleDate = (s ?? d)!;
  const dayIndex = daysDiff(windowStart, singleDate);

  return {
    left: Math.max(0, dayIndex * dayWidth),
    width: Math.max(20, dayWidth),
    isMilestone: true,
    isUndated: false,
    isSingleDate: true,
  };
}

/**
 * Calcula posição X da linha vertical "Hoje".
 */
export function getTodayPixel(windowStart: Date, dayWidth: number): number {
  const today = parseIsoDate(new Date().toISOString().slice(0, 10)) ?? new Date();
  const dayIndex = daysDiff(windowStart, today);
  // Posiciona no meio do dia
  return Math.round(dayIndex * dayWidth + dayWidth / 2);
}

// ---------------------------------------------------------------------------
// Validações de Ciclos de Dependências (Finish-to-Start)
// ---------------------------------------------------------------------------

export function wouldCreateDependencyCycle(
  dependencies: TaskDependency[],
  fromTaskId: string,
  toTaskId: string
): boolean {
  if (!fromTaskId || !toTaskId) return false;
  if (fromTaskId === toTaskId) return true; // Autorreferência

  // Constrói grafo de sucessores: de predecessor -> lista de sucessores
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!graph.has(dep.fromTaskId)) graph.set(dep.fromTaskId, []);
    graph.get(dep.fromTaskId)!.push(dep.toTaskId);
  }

  // Verifica se já existe um caminho partindo de `toTaskId` que chega em `fromTaskId`
  const visited = new Set<string>();
  const queue = [toTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === fromTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const nextTasks = graph.get(current) ?? [];
    for (const next of nextTasks) {
      queue.push(next);
    }
  }

  return false;
}
