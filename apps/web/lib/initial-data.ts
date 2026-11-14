import type { Task } from "../types/task";
import type { CrmProjectManagement, CrmProject } from "@gestor-ide/core";
import { formatNotionDate } from "./notion-date";

// Dados reais vêm sempre da API central do IDE CRM. Mock data desativada.
export const INITIAL_MANAGEMENTS: CrmProjectManagement[] = [];
export const INITIAL_PROJECTS: CrmProject[] = [];
export const INITIAL_TASKS: Task[] = [];

export function formatDateDeterministic(dateStr?: string): string {
  if (!dateStr) return "";
  const formatted = formatNotionDate(dateStr);
  return formatted || dateStr;
}
