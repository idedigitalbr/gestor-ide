"use client";

import React, { useState } from "react";
import {
  Search,
  Globe,
  Share2,
  Zap,
  Mail,
  HelpCircle,
  Cog,
  Play,
  Database,
  StickyNote,
  CheckSquare,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  X,
  Layers,
} from "lucide-react";
import type { Task } from "@/types/task";
import type { CanvasNodeType } from "@gestor-ide/core";
import { cn } from "@/lib/utils";

export interface LibraryItem {
  id: string;
  type: CanvasNodeType;
  title: string;
  subtitle?: string;
  data: Record<string, unknown>;
  icon: React.ComponentType<{ className?: string }>;
}

export interface LibraryCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: LibraryItem[];
}

const CATEGORIES: LibraryCategory[] = [
  {
    id: "pages",
    title: "Telas e Páginas",
    icon: Globe,
    items: [
      {
        id: "page-landing",
        type: "page",
        title: "Landing Page",
        subtitle: "Página de captura ou vendas",
        data: { title: "Landing Page", url: "https://exemplo.com/landing" },
        icon: Globe,
      },
      {
        id: "page-checkout",
        type: "page",
        title: "Página de Checkout",
        subtitle: "Etapa de pagamento e conversão",
        data: { title: "Checkout", url: "https://exemplo.com/checkout" },
        icon: Globe,
      },
      {
        id: "page-confirm",
        type: "page",
        title: "Página de Confirmação",
        subtitle: "Obrigado ou boas-vindas",
        data: { title: "Confirmação de Compra" },
        icon: Globe,
      },
      {
        id: "page-blank",
        type: "page",
        title: "Página em Branco",
        subtitle: "Customizável com screenshot",
        data: { title: "Nova Página" },
        icon: Globe,
      },
    ],
  },
  {
    id: "sources",
    title: "Fontes de Tráfego",
    icon: Share2,
    items: [
      {
        id: "src-instagram",
        type: "source",
        title: "Instagram Ads",
        subtitle: "Redes sociais e Stories",
        data: { title: "Instagram Ads", iconKey: "instagram", category: "Social" },
        icon: Share2,
      },
      {
        id: "src-facebook",
        type: "source",
        title: "Facebook Ads",
        subtitle: "Campanha de feed/tráfego",
        data: { title: "Facebook Ads", iconKey: "facebook", category: "Social" },
        icon: Share2,
      },
      {
        id: "src-google",
        type: "source",
        title: "Google Search",
        subtitle: "Busca paga ou orgânica",
        data: { title: "Google Search", iconKey: "google", category: "Busca" },
        icon: Search,
      },
      {
        id: "src-youtube",
        type: "source",
        title: "YouTube Video",
        subtitle: "Canal ou anúncios em vídeo",
        data: { title: "YouTube", iconKey: "youtube", category: "Vídeo" },
        icon: Share2,
      },
      {
        id: "src-email",
        type: "source",
        title: "E-mail de Entrada",
        subtitle: "Base própria ou newsletter",
        data: { title: "E-mail / Base", iconKey: "email", category: "Direto" },
        icon: Mail,
      },
      {
        id: "src-direct",
        type: "source",
        title: "Tráfego Direto",
        subtitle: "Acesso por link ou indicação",
        data: { title: "Acesso Direto", iconKey: "direct", category: "Direto" },
        icon: Globe,
      },
    ],
  },
  {
    id: "actions",
    title: "Ações e Conversões",
    icon: Zap,
    items: [
      {
        id: "act-click",
        type: "action",
        title: "Clique no Botão",
        subtitle: "CTA de avanço",
        data: { title: "Clique no Botão CTA", actionType: "click" },
        icon: Zap,
      },
      {
        id: "act-signup",
        type: "action",
        title: "Preencheu Formulário",
        subtitle: "Captura de lead ou dados",
        data: { title: "Lead Cadastrado", actionType: "signup" },
        icon: Zap,
      },
      {
        id: "act-buy",
        type: "action",
        title: "Compra Concluída",
        subtitle: "Conversão de pagamento",
        data: { title: "Compra Concluída", actionType: "buy" },
        icon: Zap,
      },
      {
        id: "act-download",
        type: "action",
        title: "Download Realizado",
        subtitle: "Material ou anexo",
        data: { title: "Download de Arquivo", actionType: "download" },
        icon: Zap,
      },
    ],
  },
  {
    id: "emails",
    title: "E-mails & Mensagens",
    icon: Mail,
    items: [
      {
        id: "email-welcome",
        type: "email",
        title: "E-mail de Boas-vindas",
        subtitle: "Disparo inicial da sequência",
        data: { title: "E-mail de Boas-vindas", sequenceStep: 1 },
        icon: Mail,
      },
      {
        id: "email-nurture",
        type: "email",
        title: "E-mail de Nutrição",
        subtitle: "Apresentação de conteúdo",
        data: { title: "E-mail de Nutrição #2", sequenceStep: 2 },
        icon: Mail,
      },
      {
        id: "email-cart",
        type: "email",
        title: "Carrinho Abandonado",
        subtitle: "Recuperação de venda",
        data: { title: "Recuperar Carrinho", sequenceStep: 1 },
        icon: Mail,
      },
    ],
  },
  {
    id: "decisions",
    title: "Decisões e Ramificações",
    icon: HelpCircle,
    items: [
      {
        id: "dec-general",
        type: "decision",
        title: "Decisão Sim / Não",
        subtitle: "Ramificação condicional",
        data: { title: "Condição satisfeita?" },
        icon: HelpCircle,
      },
    ],
  },
  {
    id: "process",
    title: "Processos e Fluxos",
    icon: Cog,
    items: [
      {
        id: "proc-step",
        type: "process",
        title: "Etapa de Processo",
        subtitle: "Bloco operacional",
        data: { title: "Executar Etapa", description: "Processamento interno" },
        icon: Cog,
      },
      {
        id: "start-pill",
        type: "startEnd",
        title: "Ponto de Início",
        subtitle: "Início do fluxo",
        data: { title: "Início", kind: "start" },
        icon: Play,
      },
      {
        id: "end-pill",
        type: "startEnd",
        title: "Ponto de Fim",
        subtitle: "Conclusão do fluxo",
        data: { title: "Fim", kind: "end" },
        icon: Play,
      },
      {
        id: "db-system",
        type: "database",
        title: "Banco de Dados / CRM",
        subtitle: "Persistência e dados",
        data: { title: "MySQL / CRM", systemName: "Armazenamento" },
        icon: Database,
      },
      {
        id: "group-swimlane",
        type: "group",
        title: "Raia / Agrupador",
        subtitle: "Área de responsabilidade",
        data: { label: "Nova Raia / Área" },
        icon: Layers,
      },
    ],
  },
  {
    id: "notes",
    title: "Notas e Post-its",
    icon: StickyNote,
    items: [
      {
        id: "note-yellow",
        type: "note",
        title: "Post-it Amarelo",
        subtitle: "Anotação rápida",
        data: { text: "Nota importante...", color: "amber" },
        icon: StickyNote,
      },
      {
        id: "note-blue",
        type: "note",
        title: "Nota Azul",
        subtitle: "Instrução técnica",
        data: { text: "Especificação técnica...", color: "blue" },
        icon: StickyNote,
      },
      {
        id: "note-green",
        type: "note",
        title: "Nota Verde",
        subtitle: "Meta ou checklist",
        data: { text: "Meta de entrega...", color: "emerald" },
        icon: StickyNote,
      },
    ],
  },
];

interface CanvasLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (type: CanvasNodeType, data: Record<string, unknown>) => void;
  tasks: Task[];
  canEdit: boolean;
}

export function CanvasLibrary({
  isOpen,
  onClose,
  onAddItem,
  tasks = [],
  canEdit,
}: CanvasLibraryProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"catalog" | "tasks">("catalog");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleDragStart = (
    e: React.DragEvent,
    type: CanvasNodeType,
    data: Record<string, unknown>
  ) => {
    if (!canEdit) return;
    e.dataTransfer.setData("application/gestor-canvas-node", JSON.stringify({ type, data }));
    e.dataTransfer.effectAllowed = "move";
  };

  const filteredCategories = CATEGORIES.map((cat) => {
    if (!search.trim()) return cat;
    const query = search.toLowerCase();
    const items = cat.items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  const filteredTasks = tasks.filter((t) => {
    if (!search.trim()) return true;
    return t.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="absolute left-3 top-16 bottom-3 z-20 flex w-72 flex-col rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl transition-all select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 p-3.5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Biblioteca de Elementos
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Fechar biblioteca"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 p-1 bg-muted/20">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
            activeTab === "catalog"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Elementos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
            activeTab === "tasks"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>Tarefas CRM</span>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-bold">
            {tasks.length}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "catalog"
                ? "Buscar blocos, páginas..."
                : "Buscar tarefas do projeto..."
            }
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3 custom-scrollbar">
        {activeTab === "catalog" ? (
          filteredCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhum bloco encontrado
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isCollapsed = collapsedCategories[cat.id];
              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="flex w-full items-center justify-between rounded px-1.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <cat.icon className="size-3 text-primary" />
                      <span>{cat.title}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-1 pl-1">
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          draggable={canEdit}
                          onDragStart={(e) => handleDragStart(e, item.type, item.data)}
                          onClick={() => canEdit && onAddItem(item.type, item.data)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border border-border/60 bg-card p-2 text-left transition-all",
                            canEdit
                              ? "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm"
                              : "opacity-60 cursor-not-allowed"
                          )}
                          title={canEdit ? "Clique ou arraste para o canvas" : undefined}
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <item.icon className="size-3.5" />
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Tasks from CRM */
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground px-1 mb-2">
              Arraste tarefas para o quadro para acompanhar status e prazos reais.
            </p>
            {filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma tarefa encontrada no projeto
              </div>
            ) : (
              filteredTasks.map((t) => (
                <div
                  key={t.id}
                  draggable={canEdit}
                  onDragStart={(e) =>
                    handleDragStart(e, "task", { taskId: t.id })
                  }
                  onClick={() => canEdit && onAddItem("task", { taskId: t.id })}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border border-border/60 bg-card p-2.5 text-left transition-all",
                    canEdit
                      ? "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm"
                      : "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="size-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {t.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t.status}</span>
                    {t.dueDate && <span>Prazo: {t.dueDate.slice(0, 10)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-2 text-center text-[10px] text-muted-foreground bg-muted/10 rounded-b-2xl">
        {canEdit ? "✦ Arraste ou clique para adicionar" : "Modo somente leitura"}
      </div>
    </div>
  );
}
