import type { Task } from "@/types/task";
import type { ProjectTaskItemType } from "@/lib/task-item-type";

export type GanttScale = "day" | "week" | "month";

export type GanttGroupBy = "hierarchy" | "status" | "assignee" | "none";

export type GanttDisplayFilter = "all" | "tasks-only" | "dated-only" | "undated-only";

export interface TaskDependency {
  id: string;
  fromTaskId: string; // Predecessor (Término)
  toTaskId: string;   // Successor (Início)
  type?: "FS";        // Finish-to-Start
}

export interface GanttRowItem {
  id: string;
  task: Task;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  itemType: ProjectTaskItemType;

  // Real or derived dates (ISO YYYY-MM-DD or null)
  startDate: string | null;
  dueDate: string | null;
  isDerivedDates: boolean; // true se o período foi inferido a partir dos descendentes

  // Progresso 0 a 100
  progressPercent: number;

  // Subtarefas / Checklists
  totalSubtasks: number;
  completedSubtasks: number;
}

export interface GanttTimeColumn {
  key: string;
  label: string;
  subLabel?: string;
  date: Date;
  isToday?: boolean;
  isWeekend?: boolean;
  width: number;
}

export interface GanttTimeHeaderGroup {
  key: string;
  label: string;
  width: number;
}

export interface GanttBarPosition {
  left: number;
  width: number;
  isMilestone: boolean;
  isUndated: boolean;
  isSingleDate: boolean;
}
