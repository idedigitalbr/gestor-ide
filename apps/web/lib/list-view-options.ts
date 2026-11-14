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

/**
 * Remove de forma inteligente o prefixo redundante "Gestão" do nome
 * (ex: "Gestão StudUPlay" -> "StudUPlay") quando a tag [Gestão] já antecede o título.
 */
export function stripManagementPrefix(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  const stripped = trimmed
    .replace(/^gest[aã]o(?:\s+(?:de|da|do|dos|das)\s+|\s*[-:–—/]\s*|\s+)/i, "")
    .trim();
  if (!stripped) return trimmed;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Remove de forma inteligente o prefixo redundante "Projeto" do nome
 * (ex: "Projeto StudUPlay" -> "StudUPlay") quando a tag [Projeto] já antecede o título.
 */
export function stripProjectPrefix(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  const stripped = trimmed
    .replace(/^projeto(?:\s+(?:de|da|do|dos|das)\s+|\s*[-:–—/]\s*|\s+)/i, "")
    .trim();
  if (!stripped) return trimmed;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

