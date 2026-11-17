"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type {
  CrmProject,
  CrmProjectManagement,
} from "@gestor-ide/core";
import type { ViewMode } from "@/types/task";
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  FolderKanban,
  GanttChart,
  Home,
  Kanban,
  LayoutDashboard,
  Layers,
  PanelLeftClose,
  Plus,
  Search,
  ShieldCheck,
  Table as TableIcon,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { stripManagementPrefix, stripProjectPrefix } from "@/lib/list-view-options";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
  managements: CrmProjectManagement[];
  selectedManagementId: string | null;
  onSelectManagement: (managementId: string | null) => void;
  projects: CrmProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  isConnectedCrm: boolean;
  onOpenCrmModal: () => void;
  onHome?: () => void;
  canWrite?: boolean;
  onCreateProject?: () => void;
  onCreateManagement?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  onToggle,
  managements,
  selectedManagementId,
  onSelectManagement,
  projects,
  selectedProjectId,
  onSelectProject,
  viewMode,
  onViewModeChange,
  isConnectedCrm,
  onOpenCrmModal,
  onHome,
  canWrite = false,
  onCreateProject,
  onCreateManagement,
}: SidebarProps) {
  const [searchProject, setSearchProject] = useState("");

  const activeManagement =
    managements.find((m) => m.id === selectedManagementId) ?? null;

  // Filtra projetos que pertencem à gestão selecionada (ou todos se for "Todas as Gestões")
  const visibleProjects = useMemo(() => {
    let list = projects;
    if (selectedManagementId) {
      list = list.filter((p) => p.projectManagementId === selectedManagementId);
    }
    if (searchProject.trim()) {
      const q = searchProject.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, selectedManagementId, searchProject]);

  const sidebarContent = (
    <div className="w-[240px] h-full flex flex-col justify-between py-2.5 select-none text-xs">
      <div className="flex flex-col gap-2 overflow-hidden flex-1 px-2 min-h-0">
        {/* Topo: Seletor de Gestão (IDE CRM) + Botão de Recolher Sidebar */}
        <div className="flex items-center justify-between gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between flex-1 min-w-0 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-muted/40 group text-left border border-transparent hover:border-border"
                title="Alternar Gestão do CRM"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-xs font-bold shrink-0 text-primary-foreground shadow-2xs"
                    style={{
                      backgroundColor:
                        activeManagement?.color || "var(--primary)",
                    }}
                  >
                    {activeManagement
                      ? activeManagement.name.charAt(0).toUpperCase()
                      : "G"}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="font-semibold text-xs leading-tight text-foreground truncate">
                      IDE Gestor
                    </div>
                    <div className="text-[10px] leading-tight text-muted-foreground truncate">
                      {activeManagement ? stripManagementPrefix(activeManagement.name) : "Todas as Gestões"}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-60 bg-popover border-border text-popover-foreground max-h-80 overflow-y-auto z-50 shadow-xl"
            >
              <DropdownMenuLabel className="text-[11px] font-medium flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span>Gestões (IDE CRM)</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => onSelectManagement(null)}
                className={cn(
                  "text-xs cursor-pointer flex items-center justify-between",
                  selectedManagementId === null &&
                    "bg-secondary text-secondary-foreground font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Todas as Gestões</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 h-4 border-border text-muted-foreground"
                >
                  {projects.length}
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {managements.map((mgmt) => (
                <DropdownMenuItem
                  key={mgmt.id}
                  onClick={() => onSelectManagement(mgmt.id)}
                  className={cn(
                    "text-xs cursor-pointer flex items-center justify-between",
                    selectedManagementId === mgmt.id &&
                      "bg-secondary text-secondary-foreground font-medium"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: mgmt.color || "#6d28d9" }}
                    />
                    <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                      Gestão
                    </span>
                    <span className="truncate">{stripManagementPrefix(mgmt.name)}</span>
                  </div>
                  {typeof mgmt._count?.projects === "number" && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 border-border text-muted-foreground shrink-0 ml-1"
                    >
                      {mgmt._count.projects}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}

              {canWrite && onCreateManagement && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={onCreateManagement}
                    className="text-xs cursor-pointer flex items-center gap-2 text-primary focus:text-primary font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Gestão...</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onToggle || onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer shrink-0"
            title="Recolher barra lateral (Ctrl+B)"
            aria-label="Recolher barra lateral"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navegação Global / Atalhos Rápidos */}
        <nav className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onSelectManagement(null);
              onSelectProject(null);
              onHome?.();
            }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer border text-left",
              selectedManagementId === null && selectedProjectId === null
                ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
            )}
          >
            <Home
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                selectedManagementId === null && selectedProjectId === null
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            />
            <span className="truncate font-medium">Início</span>
          </button>

          <Link
            href="/projects/dashboard"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer border border-transparent"
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">Dashboard</span>
          </Link>

          <Link
            href="/projects/calendar"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer border border-transparent"
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">Calendário Geral</span>
          </Link>
        </nav>

        {/* Visões do Projeto (quando um projeto específico estiver aberto) */}
        {selectedProjectId && onViewModeChange && (
          <>
            <Separator className="bg-sidebar-border" />
            <div>
              <div className="px-2 pt-0.5 pb-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Visões do Projeto
              </div>
              <nav className="flex flex-col gap-0.5 mt-0.5">
                {[
                  { mode: "kanban" as ViewMode, label: "Quadro Kanban", icon: Kanban },
                  { mode: "table" as ViewMode, label: "Tabela", icon: TableIcon },
                  { mode: "calendar" as ViewMode, label: "Calendário", icon: CalendarDays },
                  { mode: "gantt" as ViewMode, label: "Gantt", icon: GanttChart },
                ].map(({ mode, label, icon: Icon }) => {
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onViewModeChange(mode)}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border text-left",
                        isActive
                          ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span>{label}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </>
        )}

        <Separator className="bg-sidebar-border" />

        {/* Seção Principal: PROJETOS DA GESTÃO ATIVA */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-2 pt-0.5 pb-1.5 flex items-center justify-between">
            <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground truncate">
              {activeManagement ? "Projetos da Gestão" : "Todos os Projetos"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 h-4 border-border text-muted-foreground bg-muted/20"
              >
                {visibleProjects.length}
              </Badge>
              {canWrite && onCreateProject && (
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  title="Criar novo projeto"
                  aria-label="Criar novo projeto"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Busca rápida se houver mais de 4 projetos */}
          {projects.length > 4 && (
            <div className="px-1 pb-1.5">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchProject}
                  onChange={(e) => setSearchProject(e.target.value)}
                  placeholder="Filtrar projetos..."
                  className="h-6 pl-6 pr-2 text-[11px] bg-muted/40 border-border rounded-md"
                />
              </div>
            </div>
          )}

          {/* Lista Rolável de Projetos */}
          <div className="flex-1 overflow-y-auto px-1 flex flex-col gap-0.5 min-h-0">
            {/* Opção: Todos os Projetos da Gestão */}
            <button
              type="button"
              onClick={() => onSelectProject(null)}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border text-left",
                selectedProjectId === null
                  ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderKanban
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    selectedProjectId === null
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span className="truncate">
                  {activeManagement ? "Visão Geral dos Projetos" : "Todos os Projetos"}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 h-4 border-border text-muted-foreground shrink-0"
              >
                {visibleProjects.length}
              </Badge>
            </button>

            {/* Itens de Projetos */}
            {visibleProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer border text-left group",
                    isSelected
                      ? "bg-secondary text-secondary-foreground font-medium border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
                  )}
                  title={project.name}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color || "var(--primary)" }}
                    />
                    <span className="shrink-0 text-[9px] font-mono font-medium px-1 py-0.2 rounded border border-border bg-muted/60 text-muted-foreground">
                      Projeto
                    </span>
                    <span className="truncate">{stripProjectPrefix(project.name)}</span>
                  </div>
                  {typeof project._count?.tasks === "number" &&
                    project._count.tasks > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4 border-border text-muted-foreground shrink-0 ml-1"
                      >
                        {project._count.tasks}
                      </Badge>
                    )}
                </button>
              );
            })}

            {visibleProjects.length === 0 && (
              <div className="px-3 py-6 text-center text-muted-foreground text-[11px]">
                Nenhum projeto encontrado nesta gestão.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé da Sidebar: Status IDE CRM + Atalho Ctrl+B + Seletor de Temas */}
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

        <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground/70">
          <span>Atalho rápido</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 font-mono text-[9.5px]">Ctrl+B</kbd>
        </div>

        {/* Único ponto de abertura do seletor de temas: canto inferior esquerdo da sidebar */}
        <ThemeSelector />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar (Padrão: Fechada / w-0) */}
      <aside
        className={cn(
          "planw-theme-sidebar h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex flex-col transition-all duration-300 ease-in-out relative shrink-0 z-20 overflow-hidden",
          isOpen
            ? "w-[240px] opacity-100"
            : "w-0 p-0 border-r-0 opacity-0 pointer-events-none"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (quando aberto no celular/tablet) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          onClick={onClose}
        >
          <div
            className="w-[260px] max-w-[80vw] h-full bg-sidebar shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md z-30"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
