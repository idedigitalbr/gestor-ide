export type ListDisplayMode = "cards" | "list";

export const MANAGEMENT_VISIBILITY_LABELS: Record<string, string> = {
  all: "Todas as visibilidades",
  company: "Empresa",
  unit: "Unidade",
  team: "Equipe",
  private: "Privado",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  all: "Todos os status",
  active: "Ativo",
  planning: "Planejamento",
  in_progress: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
};
