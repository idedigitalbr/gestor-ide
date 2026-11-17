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
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  X,
  Layers,
  Plus,
  GripVertical,
  Calendar,
  AlertCircle,
  DollarSign,
  UserCheck,
  Video,
  MessageCircle,
} from "lucide-react";
import type { Task } from "@/types/task";
import type { CanvasNodeType } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import { TaskSolidStatusBadge } from "@/components/task-table/task-solid-status-badge";
import { cn } from "@/lib/utils";

export interface LibraryItem {
  id: string;
  type: CanvasNodeType;
  title: string;
  subtitle?: string;
  data: Record<string, unknown>;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: string;
}

export interface LibraryCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: LibraryItem[];
}

const FUNNEL_CATEGORIES: LibraryCategory[] = [
  {
    id: "pages",
    title: "Telas & Páginas (Wireframes)",
    icon: Globe,
    items: [
      {
        id: "page-landing",
        type: "page",
        title: "Landing Page",
        subtitle: "Wireframe de vendas e captura",
        data: { title: "Landing Page", pageType: "landing", visitors: "12.4K visitantes" },
        icon: Globe,
        accentColor: "text-emerald-500",
      },
      {
        id: "page-checkout",
        type: "page",
        title: "Página de Checkout",
        subtitle: "Wireframe com cartão e compra",
        data: { title: "Checkout Seguro", pageType: "checkout", visitors: "4.7K visitas" },
        icon: Globe,
        accentColor: "text-blue-500",
      },
      {
        id: "page-confirm",
        type: "page",
        title: "Confirmação / Obrigado",
        subtitle: "Wireframe de pedido aprovado",
        data: { title: "Página de Confirmação", pageType: "thankyou", visitors: "1.1K convertidos" },
        icon: Globe,
        accentColor: "text-emerald-500",
      },
      {
        id: "page-optin",
        type: "page",
        title: "Página de Captura (Lead)",
        subtitle: "Wireframe com e-book e formulário",
        data: { title: "Captura de Leads", pageType: "optin", visitors: "8.5K leads" },
        icon: Globe,
        accentColor: "text-purple-500",
      },
      {
        id: "page-vsl",
        type: "page",
        title: "Vídeo de Vendas (VSL)",
        subtitle: "Wireframe com player de vídeo",
        data: { title: "Vídeo de Vendas (VSL)", pageType: "vsl", visitors: "6.2K visualizações" },
        icon: Video,
        accentColor: "text-red-500",
      },
    ],
  },
  {
    id: "sources",
    title: "Fontes de Tráfego (Funnelytics)",
    icon: Share2,
    items: [
      {
        id: "src-meta",
        type: "source",
        title: "Meta / Facebook Ads",
        subtitle: "Tráfego pago no feed e stories",
        data: { title: "Meta Ads", iconKey: "facebook", volume: "8.2K cliques" },
        icon: Share2,
        accentColor: "text-[#1877F2]",
      },
      {
        id: "src-instagram",
        type: "source",
        title: "Instagram Ads",
        subtitle: "Reels e carrosséis patrocinados",
        data: { title: "Instagram Ads", iconKey: "instagram", volume: "10.5K cliques" },
        icon: Share2,
        accentColor: "text-[#E1306C]",
      },
      {
        id: "src-google",
        type: "source",
        title: "Google Ads / Busca",
        subtitle: "Rede de pesquisa e performance max",
        data: { title: "Google Ads", iconKey: "google", volume: "6.5K cliques" },
        icon: Search,
        accentColor: "text-blue-500",
      },
      {
        id: "src-email",
        type: "source",
        title: "E-mail Marketing",
        subtitle: "Disparos e automações de nutrição",
        data: { title: "E-mail Marketing", iconKey: "email", volume: "3.6K cliques" },
        icon: Mail,
        accentColor: "text-cyan-500",
      },
      {
        id: "src-youtube",
        type: "source",
        title: "YouTube Ads",
        subtitle: "Vídeos e anúncios in-stream",
        data: { title: "YouTube Ads", iconKey: "youtube", volume: "4.1K visualizações" },
        icon: Video,
        accentColor: "text-red-500",
      },
      {
        id: "src-whatsapp",
        type: "source",
        title: "WhatsApp / Direct",
        subtitle: "Grupos e atendimento direto",
        data: { title: "WhatsApp Direct", iconKey: "whatsapp", volume: "2.8K mensagens" },
        icon: MessageCircle,
        accentColor: "text-emerald-500",
      },
      {
        id: "src-organic",
        type: "source",
        title: "Orgânico / SEO",
        subtitle: "Busca orgânica e tráfego direto",
        data: { title: "Busca Orgânica", iconKey: "organic", volume: "5.4K acessos" },
        icon: Globe,
        accentColor: "text-emerald-600",
      },
    ],
  },
  {
    id: "actions",
    title: "Ações, Metas & Decisões",
    icon: Zap,
    items: [
      {
        id: "act-buy",
        type: "action",
        title: "Compra / Receita",
        subtitle: "Meta de conversão com receita",
        data: { title: "Compra Concluída", actionType: "buy", revenue: "$186K receita" },
        icon: DollarSign,
        accentColor: "text-emerald-500",
      },
      {
        id: "dec-form",
        type: "decision",
        title: "Decisão? (Sim / Não)",
        subtitle: "Bifurcação de comportamento",
        data: { title: "Preencheu formulário?", yesLabel: "Sim", noLabel: "Não" },
        icon: HelpCircle,
        accentColor: "text-purple-500",
      },
      {
        id: "act-form",
        type: "action",
        title: "Envio de Formulário",
        subtitle: "Cadastro ou aplicação concluída",
        data: { title: "Formulário Enviado", actionType: "signup", metric: "2.4K leads" },
        icon: UserCheck,
        accentColor: "text-amber-500",
      },
      {
        id: "email-node-step",
        type: "email",
        title: "Disparo de E-mail",
        subtitle: "Sequência automática de e-mails",
        data: { title: "E-mail de Boas-vindas", subject: "Seu acesso foi liberado!", sequenceStep: 1 },
        icon: Mail,
        accentColor: "text-sky-500",
      },
    ],
  },
  {
    id: "notes",
    title: "Anotações & Estrutura",
    icon: StickyNote,
    items: [
      {
        id: "note-yellow",
        type: "note",
        title: "Post-it Amarelo",
        subtitle: "Anotação rápida de estratégia",
        data: { text: "Nota importante...", color: "amber" },
        icon: StickyNote,
        accentColor: "text-amber-500",
      },
      {
        id: "note-blue",
        type: "note",
        title: "Post-it Azul",
        subtitle: "Instrução técnica ou requisito",
        data: { text: "Instrução técnica...", color: "blue" },
        icon: StickyNote,
        accentColor: "text-blue-500",
      },
      {
        id: "db-system",
        type: "database",
        title: "Banco de Dados / CRM",
        subtitle: "Persistência e dados do usuário",
        data: { title: "MySQL / CRM", systemName: "Armazenamento" },
        icon: Database,
        accentColor: "text-indigo-500",
      },
      {
        id: "group-swimlane",
        type: "group",
        title: "Raia / Agrupador",
        subtitle: "Área visual de responsabilidade",
        data: { label: "Nova Raia / Área" },
        icon: Layers,
        accentColor: "text-slate-500",
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
  const [activeTab, setActiveTab] = useState<"tasks" | "catalog">("tasks");
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

  const filteredCategories = FUNNEL_CATEGORIES.map((cat) => {
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
    const query = search.toLowerCase();
    return t.title.toLowerCase().includes(query) || t.id.toLowerCase().includes(query);
  });

  return (
    <aside className="shrink-0 h-full w-80 border-r border-border/60 bg-card/60 flex flex-col z-10 select-none backdrop-blur-xs transition-all duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5 bg-muted/20">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground tracking-wider uppercase">
            Elementos & Tarefas
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Recolher painel lateral"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* Tabs Switcher: Tarefas CRM vs Elementos Funnelytics */}
      <div className="flex border-b border-border/60 p-1.5 bg-muted/10 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
            activeTab === "tasks"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <CheckSquare className="size-3.5" />
          <span>Tarefas CRM</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
              activeTab === "tasks"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {tasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
            activeTab === "catalog"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Globe className="size-3.5" />
          <span>Funnelytics</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "tasks" ? "Filtrar tarefas do projeto..." : "Buscar blocos, páginas..."}
            className="w-full rounded-lg border border-border/60 bg-background/80 py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* TAB 1: Tarefas CRM Estruturadas (Gantt Tree Style) */}
        {activeTab === "tasks" && (
          <div className="space-y-1.5">
            <div className="px-1 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Arraste uma tarefa para o quadro:</span>
              <span className="font-mono">{filteredTasks.length} itens</span>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <AlertCircle className="size-6 text-muted-foreground/40 mb-1.5" />
                <span>Nenhuma tarefa encontrada.</span>
              </div>
            ) : (
              filteredTasks.map((task, idx) => {
                const normStatus = normalizeTaskStatus(task.status);
                const taskCode = `IDE-${String(idx + 1).padStart(2, "0")}`;

                return (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={(e) =>
                      handleDragStart(e, "task", { taskId: task.id, title: task.title })
                    }
                    className="group relative flex flex-col rounded-lg border border-border/70 bg-card hover:border-primary/60 p-2.5 transition-all shadow-2xs hover:shadow-sm cursor-grab active:cursor-grabbing"
                  >
                    {/* Top Row: Code, Status & Add Button */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="size-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-muted-foreground">
                          {taskCode}
                        </span>
                        <TaskSolidStatusBadge status={task.status} className="text-[10px] py-0 px-1.5 h-4" />
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onAddItem("task", { taskId: task.id, title: task.title })}
                          className="opacity-0 group-hover:opacity-100 flex size-5 items-center justify-center rounded bg-primary text-primary-foreground hover:scale-105 transition-all"
                          title="Inserir no centro do quadro"
                        >
                          <Plus className="size-3" />
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {task.title}
                    </h4>

                    {/* Footer Row: Due Date */}
                    {task.dueDate && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Calendar className="size-2.5" />
                        <span>Entrega: {task.dueDate.slice(0, 10)}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Catálogo de Elementos Funnelytics */}
        {activeTab === "catalog" && (
          <div className="space-y-3">
            {filteredCategories.map((category) => {
              const isCollapsed = Boolean(collapsedCategories[category.id]);
              const CategoryIcon = category.icon;

              return (
                <div key={category.id} className="space-y-1">
                  {/* Category Header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center justify-between px-1.5 py-1 text-left text-xs font-bold text-foreground/80 hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon className="size-3.5 text-primary" />
                      <span>{category.title}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Items List */}
                  {!isCollapsed && (
                    <div className="space-y-1 pl-1">
                      {category.items.map((item) => {
                        const ItemIcon = item.icon;

                        return (
                          <div
                            key={item.id}
                            draggable={canEdit}
                            onDragStart={(e) => handleDragStart(e, item.type, item.data)}
                            className="group flex items-center justify-between rounded-lg border border-border/50 bg-background/60 hover:bg-card hover:border-primary/50 p-2 transition-all cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 transition-colors group-hover:bg-primary/10",
                                  item.accentColor
                                )}
                              >
                                <ItemIcon className="size-3.5" />
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

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => onAddItem(item.type, item.data)}
                                className="opacity-0 group-hover:opacity-100 flex size-5 items-center justify-center rounded bg-primary text-primary-foreground hover:scale-105 transition-all"
                                title="Inserir no quadro"
                              >
                                <Plus className="size-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
