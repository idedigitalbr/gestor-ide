"use client";

import React from "react";
import type {
  AppModuleSection,
  CrmProject,
  ViewMode,
} from "@gestor-ide/core";
import {
  Kanban,
  Table as TableIcon,
  Building2,
  TrendingUp,
  Wallet,
  Users,
  ChevronDown,
  X,
  ShieldCheck,
  FolderKanban,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  activeModule: AppModuleSection;
  onModuleChange: (module: AppModuleSection) => void;
  projects: CrmProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  isConnectedCrm: boolean;
  onOpenCrmModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentView,
  onViewChange,
  activeModule,
  onModuleChange,
  projects,
  selectedProjectId,
  onSelectProject,
  isConnectedCrm,
  onOpenCrmModal,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const content = (
    <aside className="planw-theme-sidebar w-[200px] shrink-0 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col justify-between py-3 select-none text-xs transition-colors duration-200 relative">
      <div className="flex flex-col gap-2.5 overflow-y-auto px-2">
        {/* Workspace Brand / Seletor de Projeto Integrado ao IDE CRM */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-muted/40 group text-left"
              title="Alternar projeto do IDE CRM"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md border border-border bg-card text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  G
                </div>
                <div className="truncate">
                  <div className="font-semibold text-xs leading-tight text-foreground truncate">
                    IDE Gestor
                  </div>
                  <div className="text-[10px] leading-tight text-muted-foreground truncate">
                    {activeProject
                      ? activeProject.name
                      : isConnectedCrm
                        ? "Todos os Projetos"
                        : "Ecossistema IDE"}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-52 bg-popover border-border text-popover-foreground"
          >
            <DropdownMenuLabel className="text-[11px] font-medium flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <span>Projetos (IDE CRM)</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => {
                onSelectProject(null);
                onModuleChange("tasks");
              }}
              className={cn(
                "text-xs cursor-pointer",
                selectedProjectId === null &&
                  "bg-secondary text-secondary-foreground font-medium"
              )}
            >
              Todos os Projetos
            </DropdownMenuItem>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => {
                  onSelectProject(project.id);
                  onModuleChange("tasks");
                }}
                className={cn(
                  "text-xs cursor-pointer truncate",
                  selectedProjectId === project.id &&
                    "bg-secondary text-secondary-foreground font-medium"
                )}
              >
                <span className="truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={onOpenCrmModal}
              className="text-xs cursor-pointer flex items-center gap-1.5 text-primary"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isConnectedCrm ? "Conta IDE CRM Conectada" : "Conectar ao IDE CRM"}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="bg-sidebar-border" />

        {/* Visões de Projetos & Tarefas */}
        <div>
          <div className="px-2 pt-1 pb-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Projetos & Tarefas
          </div>
          <nav className="flex flex-col gap-0.5 mt-0.5">
            <button
              type="button"
              onClick={() => {
                onModuleChange("tasks");
                onViewChange("kanban");
                onCloseMobile();
              }}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border",
                activeModule === "tasks" && currentView === "kanban"
                  ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <Kanban
                  className={cn(
                    "w-3.5 h-3.5",
                    activeModule === "tasks" && currentView === "kanban"
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span>Quadro Kanban</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onModuleChange("tasks");
                onViewChange("table");
                onCloseMobile();
              }}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border",
                activeModule === "tasks" && currentView === "table"
                  ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <TableIcon
                  className={cn(
                    "w-3.5 h-3.5",
                    activeModule === "tasks" && currentView === "table"
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span>Tabela</span>
              </div>
            </button>
          </nav>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Módulos Integrados da Plataforma */}
        <div>
          <div className="px-2 pt-1 pb-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Gestão Empresarial
          </div>
          <nav className="flex flex-col gap-0.5 mt-0.5">
            {(
              [
                { id: "clients", label: "Clientes & Empresas", icon: Building2 },
                { id: "crm", label: "CRM Comercial", icon: TrendingUp },
                { id: "finance", label: "Financeiro", icon: Wallet },
                { id: "members", label: "Membros", icon: Users },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const isActive = activeModule === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onModuleChange(id);
                    onCloseMobile();
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border",
                    isActive
                      ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 h-4 font-normal border-border text-muted-foreground bg-muted/20 shrink-0"
                  >
                    CRM
                  </Badge>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Rodapé da Sidebar: Status de Integração IDE CRM + Seletor de Temas */}
      <div className="flex flex-col gap-1.5 border-t border-sidebar-border px-2 pt-2">
        <button
          type="button"
          onClick={onOpenCrmModal}
          className="flex items-center justify-between w-full px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer border border-transparent"
          title="Configurar integração com a API do IDE CRM"
        >
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                isConnectedCrm ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="truncate">
              {isConnectedCrm ? "IDE CRM Ativo" : "Conectar IDE CRM"}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 border-border text-muted-foreground"
          >
            {isConnectedCrm ? "Sync" : "API"}
          </Badge>
        </button>

        {/* Único ponto de abertura do seletor de temas: canto inferior esquerdo da sidebar */}
        <ThemeSelector />
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <div className="hidden md:block">{content}</div>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          onClick={onCloseMobile}
        >
          <div
            className="w-[200px] h-full shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                type="button"
                onClick={onCloseMobile}
                className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
