import type { Task } from "../types/task";

export const INITIAL_TASKS: Task[] = [
  {
    id: "task-101",
    code: "IDE-101",
    title: "Estruturar casca visual de Tabela + Kanban no IDE Gestor",
    description:
      "Criar layout responsivo com alternância entre visualizações e sincronização com a API do IDE CRM.",
    status: "Concluído",
    priority: "Alta",
    dueDate: "2026-10-16",
    tag: "frontend",
    estimate: "2d",
    subtasks: [
      { id: "st-1", title: "Definir paleta matte charcoal no globals.css", completed: true },
      { id: "st-2", title: "Configurar shadcn/ui e componentes Radix", completed: true },
      { id: "st-3", title: "Integrar SDK tipado com a API do IDE CRM", completed: true },
    ],
    comments: [
      {
        id: "c-1",
        author: "Will",
        content: "Direção visual refinada aprovada. Manter integração centralizada com o IDE CRM.",
        createdAt: "2026-10-15T16:00:00.000Z",
      },
    ],
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-10-15T18:00:00.000Z",
  },
  {
    id: "task-102",
    code: "IDE-102",
    title: "Implementar edição em linha na Tabela de Tarefas",
    description:
      "Permitir alteração rápida de título e seletor intuitivo de status diretamente nas linhas com persistência na API.",
    status: "Em Andamento",
    priority: "Alta",
    dueDate: "2026-10-17",
    tag: "tabela",
    estimate: "1d",
    subtasks: [
      { id: "st-4", title: "Ativar edição de título com clique e teclado", completed: true },
      { id: "st-5", title: "Dropdown de status via Radix Menu", completed: true },
      { id: "st-6", title: "Adição inline rápida por grupo", completed: true },
    ],
    comments: [
      {
        id: "c-2",
        author: "Equipe IDE",
        content: "A tabela mantém sincronização bidirecional com o Kanban e com o banco do IDE CRM.",
        createdAt: "2026-10-15T17:30:00.000Z",
      },
    ],
    createdAt: "2026-10-15T11:30:00.000Z",
    updatedAt: "2026-10-15T18:20:00.000Z",
  },
  {
    id: "task-103",
    code: "IDE-103",
    title: "Habilitar transições táteis e drag-and-drop no Kanban",
    description:
      "Adicionar arrastar/soltar entre colunas e botões direcionais acessíveis para mobile.",
    status: "Em Andamento",
    priority: "Média",
    dueDate: "2026-10-18",
    tag: "kanban",
    estimate: "3d",
    subtasks: [
      { id: "st-7", title: "Eventos dragstart e drop nativos", completed: true },
      { id: "st-8", title: "Botões de navegação tátil esquerda/direita", completed: true },
      { id: "st-9", title: "Trilhos verticais colapsáveis", completed: false },
    ],
    createdAt: "2026-10-15T12:00:00.000Z",
    updatedAt: "2026-10-15T18:30:00.000Z",
  },
  {
    id: "task-104",
    code: "IDE-104",
    title: "Integrar módulos de Clientes, CRM Comercial e Financeiro",
    description:
      "Conectar o IDE Gestor aos endpoints existentes do IDE CRM sem duplicar banco de dados ou autenticação.",
    status: "A Fazer",
    priority: "Urgente",
    dueDate: "2026-10-19",
    tag: "integração",
    estimate: "2d",
    subtasks: [
      { id: "st-10", title: "Sincronizar projetos e tarefas via @gestor-ide/sdk", completed: true },
      { id: "st-11", title: "Unificar visão de clientes, leads e financeiro", completed: false },
    ],
    createdAt: "2026-10-15T13:15:00.000Z",
    updatedAt: "2026-10-15T18:40:00.000Z",
  },
  {
    id: "task-105",
    code: "IDE-105",
    title: "Verificar acessibilidade, 24 temas e navegação por teclado",
    description:
      "Garantir foco legível, teclas de atalho (Esc, Enter) e compatibilidade com todo o catálogo de temas.",
    status: "A Fazer",
    priority: "Baixa",
    dueDate: "2026-10-20",
    tag: "a11y",
    estimate: "4h",
    subtasks: [
      { id: "st-12", title: "Navegação por Tab em cartões e botões", completed: true },
      { id: "st-13", title: "Anel de foco visível com ring semântico", completed: true },
      { id: "st-14", title: "Confirmação contra exclusão acidental", completed: true },
    ],
    createdAt: "2026-10-15T14:00:00.000Z",
    updatedAt: "2026-10-15T18:45:00.000Z",
  },
];

export function formatDateDeterministic(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];
    const day = parseInt(parts[2] ?? "1", 10);
    const month = months[parseInt(parts[1] ?? "1", 10) - 1];
    return `${day} ${month}`;
  }
  return dateStr;
}
