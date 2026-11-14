"use client";

import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import type { CrmProject, CrmProjectManagement } from "@gestor-ide/core";
import { Check, ChevronDown, Folder, Layers3, Pin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { stripManagementPrefix, stripProjectPrefix } from "@/lib/list-view-options";

interface HeaderWorkspaceSelectorProps {
  managements: CrmProjectManagement[];
  selectableManagements?: CrmProjectManagement[];
  selectedManagementId: string | null;
  onSelectManagement?: (managementId: string | null) => void;
  projects: CrmProject[];
  selectedProjectId: string | null;
  onSelectProject?: (projectId: string | null) => void;
  currentManagementName?: string;
  currentProjectName?: string;
  selectableProjects?: CrmProject[];
}

export function HeaderWorkspaceSelector({
  managements = [],
  selectableManagements = managements,
  selectedManagementId,
  onSelectManagement,
  projects = [],
  selectedProjectId,
  onSelectProject,
  currentManagementName,
  currentProjectName,
  selectableProjects = projects,
}: HeaderWorkspaceSelectorProps) {
  const [managementOpen, setManagementOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [managementQuery, setManagementQuery] = useState("");
  const [projectQuery, setProjectQuery] = useState("");

  // Estado de fixação (Pin) para agir como breadcrumb
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("gestor_workspace_selector_pinned") === "true";
    } catch {
      return false;
    }
  });

  const togglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gestor_workspace_selector_pinned", String(next));
      } catch {}
      return next;
    });
    setManagementOpen(false);
    setProjectOpen(false);
  }, []);

  const handleManagementButtonClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPinned && hasManagementSelected) {
        if (selectedProjectId) {
          e.preventDefault();
          e.stopPropagation();
          // Volta do projeto para a visão da gestão (projetos da gestão)
          onSelectProject?.(null);
        } else {
          e.preventDefault();
          e.stopPropagation();
          // Se já está na gestão, não faz nada: o botão Início no topo é quem volta para todas as gestões
        }
      }
    },
    [isPinned, hasManagementSelected, selectedProjectId, onSelectProject]
  );

  const handleProjectButtonClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPinned) {
        e.preventDefault();
        e.stopPropagation();
        // Em modo breadcrumb, já está no projeto folha
      }
    },
    [isPinned]
  );

  // Gestões filtradas
  const filteredManagements = useMemo(() => {
    const q = managementQuery.trim().toLowerCase();
    const visible = selectableManagements;
    if (!q) return visible;
    return visible.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.code && m.code.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [selectableManagements, managementQuery]);

  // Projetos da gestão atual
  const managementProjects = useMemo(() => {
    if (!selectedManagementId) return [];
    return selectableProjects.filter((p) => p.projectManagementId === selectedManagementId);
  }, [selectableProjects, selectedManagementId]);

  // Projetos filtrados pela busca
  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    const visible = managementProjects;
    if (!q) return visible;
    return visible.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [managementProjects, projectQuery]);

  const handleSelectManagement = useCallback(
    (mgmtId: string | null) => {
      setManagementOpen(false);
      setManagementQuery("");
      onSelectManagement?.(mgmtId);
      onSelectProject?.(null);
    },
    [onSelectManagement, onSelectProject]
  );

  const handleSelectProject = useCallback(
    (projId: string | null) => {
      setProjectOpen(false);
      setProjectQuery("");
      onSelectProject?.(projId);
    },
    [onSelectProject]
  );

  const activeManagement =
    managements.find((m) => m.id === selectedManagementId) ?? null;
  const activeProject =
    projects.find((p) => p.id === selectedProjectId) ?? null;

  const rawManagementLabel =
    activeManagement?.name || currentManagementName;
  const managementLabel = rawManagementLabel
    ? stripManagementPrefix(rawManagementLabel)
    : `Todas as Gestões (${managements.length})`;

  const rawProjectLabel =
    activeProject?.name || currentProjectName;
  const projectLabel = rawProjectLabel
    ? stripProjectPrefix(rawProjectLabel)
    : "Todos os Projetos";
  const hasManagementSelected = Boolean(selectedManagementId);

  return (
    <>
      {/* Backdrop escurecido cobrindo a tela toda para dar foco nas opções */}
      {(managementOpen || projectOpen) &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-[2px] z-40 transition-opacity duration-200 animate-in fade-in cursor-default"
            onClick={() => {
              setManagementOpen(false);
              setProjectOpen(false);
            }}
            aria-hidden="true"
          />,
          document.body
        )}

      <div
        role="navigation"
        aria-label="Seletor de Gestão e Projeto"
        className="group/selector flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-border/70 bg-muted/30 p-0.5 relative z-50 transition-all"
      >
        {/* 1. SELETOR DE GESTÃO (ANEXO 2) */}
        <Popover
          open={isPinned && hasManagementSelected ? false : managementOpen}
          onOpenChange={(open) => {
            if (isPinned && hasManagementSelected) {
              setManagementOpen(false);
              return;
            }
            setManagementOpen(open);
            if (open) setProjectOpen(false);
          }}
        >
        <div className={cn("relative min-w-0 shrink", managementOpen && "z-50")}>
          <PopoverTrigger asChild>
          <button
            type="button"
            onClick={handleManagementButtonClick}
            className={cn(
              "group flex h-7 min-w-0 max-w-[160px] sm:max-w-[200px] items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isPinned && hasManagementSelected
                ? selectedProjectId
                  ? "cursor-pointer hover:bg-muted/60 hover:text-primary"
                  : "cursor-default text-foreground/90"
                : "cursor-pointer hover:bg-muted/70 hover:text-foreground",
              (!isPinned || !hasManagementSelected) && managementOpen && "bg-muted text-foreground ring-1 ring-primary/40 shadow-sm"
            )}
            aria-expanded={(!isPinned || !hasManagementSelected) && managementOpen}
            aria-haspopup={isPinned && hasManagementSelected ? undefined : "dialog"}
            aria-label={`Gestão: ${managementLabel}`}
            title={
              isPinned && hasManagementSelected
                ? selectedProjectId
                  ? `Voltar para gestão ${managementLabel}`
                  : `Gestão: ${managementLabel}`
                : `Gestão: ${managementLabel}`
            }
          >
            {rawManagementLabel && (
              <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                Gestão
              </span>
            )}
            <span
              className={cn(
                "truncate",
                isPinned && hasManagementSelected && selectedProjectId && "group-hover:underline"
              )}
            >
              {managementLabel}
            </span>
            {(!isPinned || !hasManagementSelected) && (
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
                  managementOpen && "rotate-180 text-foreground"
                )}
              />
            )}
          </button>
          </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={8}
              collisionPadding={8}
              aria-label="Escolher gestão"
              className="flex w-80 flex-col overflow-hidden rounded-xl p-0 shadow-2xl"
            >
            {/* Input de busca (buscarzinho) */}
            <div className="border-b border-border p-2">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={managementQuery}
                  onChange={(e) => setManagementQuery(e.target.value)}
                  placeholder="Buscar gestão..."
                  aria-label="Buscar gestão"
                  className="h-7 w-full rounded-md border border-input bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
                {managementQuery ? (
                  <button
                    type="button"
                    onClick={() => setManagementQuery("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            </div>


            <div className="min-h-0 overflow-y-auto p-1 space-y-0.5">
              {/* Opção Todas as Gestões */}
              <button
                type="button"
                onClick={() => handleSelectManagement(null)}
                className={cn(
                  "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted cursor-pointer",
                  !selectedManagementId && "bg-primary/15 text-primary font-semibold"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex w-6 h-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Layers3 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">Todas as Gestões</p>
                    <p className="text-[10px] text-muted-foreground">Visão geral de todos os ambientes</p>
                  </div>
                </div>
                {!selectedManagementId && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
              </button>

              <div className="my-1 border-t border-border/80" />

              {/* Lista filtrada de Gestões */}
              {filteredManagements.length > 0 ? (
                filteredManagements.map((mgmt) => {
                  const isSelected = selectedManagementId === mgmt.id;
                  const initials = mgmt.name.slice(0, 2).toUpperCase();
                  const count =
                    (mgmt as { projectsCount?: number }).projectsCount ??
                    projects.filter((p) => p.projectManagementId === mgmt.id).length;

                  return (
                    <button
                      key={mgmt.id}
                      type="button"
                      onClick={() => handleSelectManagement(mgmt.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted cursor-pointer",
                        isSelected && "bg-muted/80 font-semibold text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex w-6 h-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: mgmt.color || "var(--primary)" }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                              Gestão
                            </span>
                            <p className="truncate font-medium text-foreground">{stripManagementPrefix(mgmt.name)}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {count} {count === 1 ? "projeto" : "projetos"}
                            {mgmt.code ? ` • ${mgmt.code}` : ""}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma gestão encontrada.
                </div>
              )}
            </div>
          </PopoverContent>
      </div>
      </Popover>

      {hasManagementSelected && (
        <>
          <span className="text-muted-foreground/40 text-xs font-semibold select-none px-0.5">/</span>

          {/* 2. SELETOR DE PROJETO (ANEXO 2 - só habilitado após setar a gestão) */}
          <Popover
            open={isPinned ? false : projectOpen}
            onOpenChange={(open) => {
              if (isPinned) {
                setProjectOpen(false);
                return;
              }
              setProjectOpen(open);
              if (open) setManagementOpen(false);
            }}
          >
          <div className={cn("relative min-w-0 shrink", projectOpen && "z-50")}>
            <PopoverTrigger asChild><button
              type="button"
              onClick={handleProjectButtonClick}
            className={cn(
              "group flex h-7 min-w-0 max-w-[140px] sm:max-w-[180px] items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isPinned
                ? "cursor-default text-foreground"
                : "cursor-pointer hover:bg-muted/70 hover:text-foreground",
              !isPinned && projectOpen && "bg-muted text-foreground ring-1 ring-primary/40 shadow-sm"
            )}
            aria-expanded={!isPinned && projectOpen}
            aria-haspopup={isPinned ? undefined : "dialog"}
            aria-label={`Projeto: ${projectLabel}`}
            title={`Projeto: ${projectLabel}`}
          >
            {rawProjectLabel && (
              <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                Projeto
              </span>
            )}
            <span className="truncate">{projectLabel}</span>
            {!isPinned && (
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
                  projectOpen && "rotate-180 text-foreground"
                )}
              />
            )}
          </button></PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label="Escolher projeto"
            className="flex w-80 flex-col overflow-hidden rounded-xl p-0 shadow-2xl"
          >
            {/* Input de busca de projetos */}
            <div className="border-b border-border p-2">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  autoFocus
                  value={projectQuery}
                  onChange={(e) => setProjectQuery(e.target.value)}
                  placeholder="Buscar projeto..."
                  aria-label="Buscar projeto"
                  className="h-7 w-full rounded-md border border-input bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
                {projectQuery ? (
                  <button
                    type="button"
                    onClick={() => setProjectQuery("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            </div>


            <div className="min-h-0 overflow-y-auto p-1 space-y-0.5">
              {/* Opção Todos os Projetos */}
              <button
                type="button"
                onClick={() => handleSelectProject(null)}
                className={cn(
                  "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted cursor-pointer",
                  !selectedProjectId && "bg-primary/15 text-primary font-semibold"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex w-6 h-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Folder className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">Todos os Projetos</p>
                    <p className="text-[10px] text-muted-foreground">Visão geral desta gestão</p>
                  </div>
                </div>
                {!selectedProjectId && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
              </button>

              <div className="my-1 border-t border-border/80" />

              {/* Lista filtrada de Projetos da Gestão */}
              {filteredProjects.length > 0 ? (
                filteredProjects.map((proj) => {
                  const isSelected = selectedProjectId === proj.id;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => handleSelectProject(proj.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted cursor-pointer",
                        isSelected && "bg-muted/80 font-semibold text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex w-6 h-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: proj.color || "var(--primary)" }}
                        >
                          <Folder className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                              Projeto
                            </span>
                            <p className="truncate font-medium text-foreground">{stripProjectPrefix(proj.name)}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {(proj as { tasksCount?: number }).tasksCount ?? 0}{" "}
                            {(proj as { tasksCount?: number }).tasksCount === 1 ? "tarefa" : "tarefas"}
                            {proj.code ? ` • ${proj.code}` : ""}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {managementProjects.length === 0
                    ? "Nenhum projeto nesta gestão."
                    : "Nenhum projeto encontrado."}
                </div>
              )}
            </div>
          </PopoverContent>
      </div>
      </Popover>
        </>
      )}

      {/* Botão de Fixar / Desafixar (Tarracha / Pin para modo Breadcrumb) */}
      <button
        type="button"
        onClick={togglePin}
        className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ml-0.5",
          isPinned
            ? "text-primary bg-primary/10 hover:bg-primary/20 opacity-100"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 opacity-0 group-hover/selector:opacity-100 focus-visible:opacity-100"
        )}
        title={
          isPinned
            ? "Fixado como breadcrumb (clique para alternar para modo seletor)"
            : "Fixar como breadcrumb"
        }
        aria-label={isPinned ? "Desafixar do modo breadcrumb" : "Fixar como breadcrumb"}
        aria-pressed={isPinned}
      >
        <Pin
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            isPinned ? "rotate-45 fill-primary text-primary" : "-rotate-45"
          )}
        />
      </button>
    </div>
    </>
  );
}
