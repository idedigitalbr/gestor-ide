export const PROJECT_TASK_ITEM_TYPES = [
  "TASK",
  "STAGE",
  "PAGE",
  "MODULE",
  "SECTION",
  "ITEM",
  "MILESTONE",
] as const;

export type ProjectTaskItemType = (typeof PROJECT_TASK_ITEM_TYPES)[number];

export function getAllowedGroupTypes(parentType: ProjectTaskItemType | null): ProjectTaskItemType[] {
  if (parentType === null) return ["STAGE"];
  if (parentType === "STAGE") return ["PAGE", "MODULE"];
  if (parentType === "PAGE" || parentType === "MODULE") return ["SECTION", "ITEM"];
  return [];
}

export interface TaskItemTypeDefinition {
  type: ProjectTaskItemType;
  label: string;
  subtitle: string;
  description: string;
  iconName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const TASK_ITEM_TYPE_DEFINITIONS: Record<ProjectTaskItemType, TaskItemTypeDefinition> = {
  TASK: {
    type: "TASK",
    label: "Tarefa",
    subtitle: "Item padrão",
    description: "Item de trabalho padrão do projeto",
    iconName: "FileText",
    color: "#84878f",
    badgeBg: "bg-slate-500/10 dark:bg-slate-500/20",
    badgeText: "text-slate-400",
  },
  STAGE: {
    type: "STAGE",
    label: "Etapa",
    subtitle: "Fase do projeto",
    description: "Fase ou marco maior do projeto",
    iconName: "Layers",
    color: "#8b5cf6",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-400",
  },
  PAGE: {
    type: "PAGE",
    label: "Página",
    subtitle: "Página ou tela",
    description: "Página, tela ou visualização",
    iconName: "FileText",
    color: "#3b82f6",
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-400",
  },
  MODULE: {
    type: "MODULE",
    label: "Módulo",
    subtitle: "Conjunto de funcionalidades",
    description: "Módulo ou subsistema do projeto",
    iconName: "LayoutGrid",
    color: "#06b6d4",
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    badgeText: "text-cyan-400",
  },
  SECTION: {
    type: "SECTION",
    label: "Seção",
    subtitle: "Parte de uma página ou módulo",
    description: "Seção ou agrupador funcional",
    iconName: "PanelTop",
    color: "#f59e0b",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-400",
  },
  ITEM: {
    type: "ITEM",
    label: "Item",
    subtitle: "Parte de um módulo",
    description: "Item ou componente de um módulo",
    iconName: "ListChecks",
    color: "#10b981",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-400",
  },
  MILESTONE: {
    type: "MILESTONE",
    label: "Marco",
    subtitle: "Entrega ou acontecimento importante",
    description: "Marco de entrega ou acontecimento relevante",
    iconName: "Diamond",
    color: "#ec4899",
    badgeBg: "bg-pink-500/10 dark:bg-pink-500/20",
    badgeText: "text-pink-400",
  },
};

export const TASK_ITEM_TYPES_LIST = Object.values(TASK_ITEM_TYPE_DEFINITIONS);

export function isValidItemType(type: unknown): type is ProjectTaskItemType {
  return typeof type === "string" && PROJECT_TASK_ITEM_TYPES.includes(type.toUpperCase() as ProjectTaskItemType);
}

export function normalizeItemType(type?: unknown): ProjectTaskItemType {
  if (typeof type === "string") {
    const upper = type.trim().toUpperCase();
    if (upper in TASK_ITEM_TYPE_DEFINITIONS) {
      return upper as ProjectTaskItemType;
    }
  }
  return "TASK";
}

export function getItemTypeDefinition(type?: unknown): TaskItemTypeDefinition {
  const normalized = normalizeItemType(type);
  return TASK_ITEM_TYPE_DEFINITIONS[normalized];
}

/**
 * Verifica se a tarefa tem conteúdo preenchido (descrição / notas).
 * Ignora tags HTML vazias geradas por editores rich text (ex: <p><br></p> ou <p></p>).
 */
export function isTaskContentFilled(description?: string | null): boolean {
  if (!description) return false;
  const stripped = description.replace(/<[^>]*>/g, "").trim();
  return stripped.length > 0;
}
