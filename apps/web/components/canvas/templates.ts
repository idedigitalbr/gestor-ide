import type { CanvasDocument } from "@gestor-ide/core";

export interface CanvasTemplateOption {
  key: string;
  name: string;
  description: string;
  category: string;
  createDocument: () => CanvasDocument;
}

export const CANVAS_TEMPLATES: CanvasTemplateOption[] = [
  {
    key: "empty",
    name: "Quadro em Branco",
    description: "Espaço livre infinito para desenhar qualquer jornada ou processo do zero.",
    category: "Geral",
    createDocument: () => ({
      schemaVersion: 1,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  },
  {
    key: "funnel-basic",
    name: "Jornada de Vendas (Funnelytics)",
    description: "Fluxo completo de tráfego, landing page, validação de formulário, e-mail e confirmação.",
    category: "Marketing & Vendas",
    createDocument: () => ({
      schemaVersion: 1,
      nodes: [
        {
          id: "src-instagram",
          type: "source",
          position: { x: 40, y: 160 },
          data: {
            title: "Instagram Ads",
            iconKey: "instagram",
            category: "Tráfego Pago",
            volume: "10.5K cliques",
          },
        },
        {
          id: "page-landing",
          type: "page",
          position: { x: 260, y: 100 },
          data: {
            title: "Página de Vendas",
            url: "https://gestor.suporteide.digital/oferta",
            pageType: "landing",
            visitors: "12.4K visitantes",
          },
        },
        {
          id: "dec-form",
          type: "decision",
          position: { x: 540, y: 140 },
          data: {
            title: "Preencheu formulário?",
            yesLabel: "Sim",
            noLabel: "Não",
          },
        },
        {
          id: "email-welcome",
          type: "email",
          position: { x: 860, y: 40 },
          data: {
            title: "E-mail de Boas-vindas",
            subject: "Seu acesso foi liberado!",
            sequenceStep: 1,
          },
        },
        {
          id: "page-checkout",
          type: "page",
          position: { x: 1160, y: 40 },
          data: {
            title: "Checkout Seguro",
            url: "https://gestor.suporteide.digital/checkout",
            pageType: "checkout",
            visitors: "4.7K visitas",
          },
        },
        {
          id: "act-purchase",
          type: "action",
          position: { x: 1440, y: 60 },
          data: {
            title: "Compra Concluída",
            actionType: "buy",
            revenue: "$186K receita",
          },
        },
        {
          id: "note-remarketing",
          type: "note",
          position: { x: 860, y: 280 },
          data: {
            text: "Remarketing: disparar sequência de recuperação em 2 horas caso não compre.",
            color: "amber",
          },
        },
      ],
      edges: [
        {
          id: "e1",
          source: "src-instagram",
          sourceHandle: "source-right",
          target: "page-landing",
          targetHandle: "target-left",
          type: "bezier",
        },
        {
          id: "e2",
          source: "page-landing",
          sourceHandle: "source-right",
          target: "dec-form",
          targetHandle: "target-left",
          type: "bezier",
        },
        {
          id: "e3",
          source: "dec-form",
          sourceHandle: "yes",
          target: "email-welcome",
          targetHandle: "target-left",
          label: "Sim",
          type: "bezier",
        },
        {
          id: "e4",
          source: "email-welcome",
          sourceHandle: "source-right",
          target: "page-checkout",
          targetHandle: "target-left",
          type: "bezier",
        },
        {
          id: "e5",
          source: "page-checkout",
          sourceHandle: "source-right",
          target: "act-purchase",
          targetHandle: "target-left",
          type: "bezier",
        },
        {
          id: "e6",
          source: "dec-form",
          sourceHandle: "no",
          target: "note-remarketing",
          targetHandle: "target-left",
          label: "Não",
          type: "bezier",
        },
      ],
      viewport: { x: 50, y: 50, zoom: 0.9 },
    }),
  },
  {
    key: "system-flow",
    name: "Fluxo de Sistema & Autenticação",
    description: "Modelagem técnica de tela de login, validação de credenciais, banco MySQL e dashboard.",
    category: "Engenharia",
    createDocument: () => ({
      schemaVersion: 1,
      nodes: [
        {
          id: "start-user",
          type: "startEnd",
          position: { x: 40, y: 160 },
          data: { title: "Usuário", kind: "start" },
        },
        {
          id: "page-login",
          type: "page",
          position: { x: 240, y: 120 },
          data: { title: "Tela de Login", url: "https://gestor.suporteide.digital/login" },
        },
        {
          id: "dec-auth",
          type: "decision",
          position: { x: 520, y: 140 },
          data: { title: "Credenciais válidas?" },
        },
        {
          id: "db-crm",
          type: "database",
          position: { x: 800, y: 50 },
          data: { title: "MySQL / IDE CRM", systemName: "Prisma Bounded Context" },
        },
        {
          id: "page-dashboard",
          type: "page",
          position: { x: 1060, y: 50 },
          data: { title: "Painel Gestor", url: "https://gestor.suporteide.digital/projects" },
        },
        {
          id: "action-error",
          type: "action",
          position: { x: 800, y: 260 },
          data: { title: "Exibir Erro 401", actionType: "toast_error" },
        },
      ],
      edges: [
        { id: "e1", source: "start-user", target: "page-login", type: "bezier" },
        { id: "e2", source: "page-login", target: "dec-auth", type: "bezier" },
        { id: "e3", source: "dec-auth", target: "db-crm", label: "Sim", type: "bezier" },
        { id: "e4", source: "db-crm", target: "page-dashboard", type: "bezier" },
        { id: "e5", source: "dec-auth", target: "action-error", label: "Não", type: "bezier" },
        { id: "e6", source: "action-error", target: "page-login", type: "bezier" },
      ],
      viewport: { x: 40, y: 40, zoom: 0.9 },
    }),
  },
  {
    key: "task-map",
    name: "Mapa de Tarefas do Projeto",
    description: "Conecte etapas estratégicas diretamente às tarefas operacionais do IDE CRM.",
    category: "Gestão",
    createDocument: () => ({
      schemaVersion: 1,
      nodes: [
        {
          id: "note-intro",
          type: "note",
          position: { x: 60, y: 80 },
          data: {
            text: "Dica: Arraste tarefas da aba 'Tarefas CRM' à esquerda para conectar prazos e responsáveis a este fluxo.",
            color: "blue",
          },
        },
        {
          id: "proc-planejamento",
          type: "process",
          position: { x: 60, y: 220 },
          data: { title: "1. Planejamento do Escopo", description: "Definição de objetivos e entregáveis" },
        },
        {
          id: "proc-execucao",
          type: "process",
          position: { x: 380, y: 220 },
          data: { title: "2. Execução Operacional", description: "Desenvolvimento e revisão" },
        },
        {
          id: "proc-conclusao",
          type: "process",
          position: { x: 700, y: 220 },
          data: { title: "3. Entrega & Homologação", description: "Validação com o cliente" },
        },
        {
          id: "task-exemplo",
          type: "task",
          position: { x: 380, y: 380 },
          data: {
            taskId: "task-demo-1",
            titleSnapshot: "Implementar e Homologar Módulo",
            statusSnapshot: "EM_ANDAMENTO",
          },
        },
      ],
      edges: [
        { id: "e1", source: "proc-planejamento", target: "proc-execucao", type: "bezier" },
        { id: "e2", source: "proc-execucao", target: "proc-conclusao", type: "bezier" },
        { id: "e3", source: "proc-execucao", target: "task-exemplo", type: "bezier", label: "Responsável" },
      ],
      viewport: { x: 50, y: 50, zoom: 0.95 },
    }),
  },
];
