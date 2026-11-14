"use client";

import React, { useMemo } from "react";
import type { CrmProjectManagement } from "@gestor-ide/core";
import {
  Folder,
  Users,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/entity-card";
import { stripManagementPrefix, type ListDisplayMode } from "@/lib/list-view-options";
import {
  KanbanGhostCard,
  useFlipGrid,
  CardInsertSeparator,
  useDwellGhost,
} from "@/components/kanban-ghost-card";
import { Plus } from "lucide-react";

interface ManagementsGridViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  visibilityFilter: string;
  onVisibilityFilterChange: (value: string) => void;
  viewMode: ListDisplayMode;
  managements: CrmProjectManagement[];
  onSelectManagement: (managementId: string) => void;
  canWrite?: boolean;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onCreateManagement?: () => void;
  onUpdateManagement?: (
    managementId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      coverPath?: string | null;
      visibility?: string;
      status?: string;
    }
  ) => Promise<void>;
  onDeleteManagement?: (managementId: string) => Promise<void>;
  onLeaveManagement?: (managementId: string) => Promise<void>;
  onOpenMembers?: (management: CrmProjectManagement) => void;
}

export function ManagementsGridView({
  search,
  onSearchChange,
  visibilityFilter,
  onVisibilityFilterChange,
  viewMode,
  managements,
  onSelectManagement,
  canWrite = true,
  canManageMembers = true,
  currentUserId,
  onCreateManagement,
  onUpdateManagement,
  onDeleteManagement,
  onLeaveManagement,
  onOpenMembers,
}: ManagementsGridViewProps) {
  const gridContainerRef = React.useRef<HTMLDivElement>(null);

  // Hook com dwell time (2s) para expandir o skeleton grande entre cards ao pousar o mouse,
  // abertura imediata ao clicar no +, e auto-close de 4s com pausa no hover e barra regressiva
  const {
    expandedIndex,
    startDwell,
    cancelDwell,
    openImmediate,
    pauseAutoClose,
    resumeAutoClose,
    closeExpanded,
    isPaused,
    autoCloseTimeMs,
  } = useDwellGhost({ dwellTimeMs: 2000, autoCloseTimeMs: 4000 });

  // Animação FLIP suave para empurrar os cards existentes
  useFlipGrid(gridContainerRef, expandedIndex, 360);
  const filteredManagements = useMemo(() => {
    let list = managements;
    if (visibilityFilter !== "all") {
      list = list.filter((m) => (m.visibility || "company") === visibilityFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.code ?? "").toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [managements, visibilityFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Grid or List of Cards */}
      {filteredManagements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Nenhuma gestão encontrada
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Nenhum resultado corresponde à sua pesquisa. Tente ajustar os termos ou filtros.
          </p>
          {(search || visibilityFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onVisibilityFilterChange("all");
              }}
              className="text-xs"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div
          ref={gridContainerRef}
          className="relative"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Se o skeleton grande foi expandido na posição 0 (antes do primeiro card) */}
            {expandedIndex === 0 && canWrite && onCreateManagement && (
              <div
                data-flip-id="__ghost_0__"
                onMouseEnter={pauseAutoClose}
                onMouseLeave={resumeAutoClose}
                className="animate-in fade-in zoom-in-95 slide-in-from-left-6 duration-300"
              >
                <KanbanGhostCard
                  label="Novo"
                  sublabel="Criar no início"
                  variant="entity"
                  slideDirection="left"
                  autoCloseMs={autoCloseTimeMs}
                  isPaused={isPaused}
                  onClick={() => {
                    closeExpanded();
                    onCreateManagement();
                  }}
                  isVisible={true}
                  onMouseEnter={pauseAutoClose}
                  onMouseLeave={resumeAutoClose}
                />
              </div>
            )}

            {filteredManagements.map((mgmt, index) => {
              const projectCount = mgmt._count?.projects ?? 0;
              const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
              const isFirst = index === 0;

              return (
                <React.Fragment key={mgmt.id}>
                  <div
                    data-flip-id={mgmt.id}
                    className="relative group/card"
                  >
                    {/* Botãozinho + e linha vertical no lado esquerdo do primeiro card (posição 0) */}
                    {isFirst && canWrite && onCreateManagement && (
                      <CardInsertSeparator
                        side="left"
                        title="Criar gestão antes deste card"
                        onHoverStart={() => startDwell(0)}
                        onHoverEnd={cancelDwell}
                        onClick={() => openImmediate(0)}
                      />
                    )}

                    {/* Botãozinho + e linha vertical no lado direito de cada card (posição index + 1) */}
                    {canWrite && onCreateManagement && (
                      <CardInsertSeparator
                        side="right"
                        title="Criar gestão entre os cards"
                        onHoverStart={() => startDwell(index + 1)}
                        onHoverEnd={cancelDwell}
                        onClick={() => openImmediate(index + 1)}
                      />
                    )}

                    <EntityCard
                      type="management"
                      id={mgmt.id}
                      name={mgmt.name}
                      description={mgmt.description}
                      code={mgmt.code}
                      color={mgmt.color}
                      coverPath={mgmt.coverPath}
                      status={mgmt.status}
                      visibility={mgmt.visibility}
                      createdAt={mgmt.createdAt}
                      projectCount={projectCount}
                      memberCount={memberCount}
                      members={mgmt.members}
                      onSelect={() => onSelectManagement(mgmt.id)}
                      canWrite={canWrite}
                      canManageMembers={canManageMembers}
                      currentUserId={currentUserId}
                      onUpdate={
                        onUpdateManagement
                          ? (updates) => onUpdateManagement(mgmt.id, updates)
                          : undefined
                      }
                      onDelete={
                        onDeleteManagement
                          ? () => onDeleteManagement(mgmt.id)
                          : undefined
                      }
                      onLeave={
                        onLeaveManagement
                          ? () => onLeaveManagement(mgmt.id)
                          : undefined
                      }
                      onManageMembers={onOpenMembers ? () => onOpenMembers(mgmt) : undefined}
                    />
                  </div>

                  {/* Se o skeleton grande foi expandido nesta posição intermediária (empurrando os cards) */}
                  {expandedIndex === index + 1 && canWrite && onCreateManagement && (
                    <div
                      data-flip-id={`__ghost_${index + 1}__`}
                      onMouseEnter={pauseAutoClose}
                      onMouseLeave={resumeAutoClose}
                      className="animate-in fade-in zoom-in-95 slide-in-from-right-6 duration-300"
                    >
                      <KanbanGhostCard
                        label="Novo"
                        sublabel="Criar nova gestão"
                        variant="entity"
                        slideDirection="right"
                        autoCloseMs={autoCloseTimeMs}
                        isPaused={isPaused}
                        onClick={() => {
                          closeExpanded();
                          onCreateManagement();
                        }}
                        isVisible={true}
                        onMouseEnter={pauseAutoClose}
                        onMouseLeave={resumeAutoClose}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Slot fantasma sutil para hover no final quando nenhum skeleton está aberto */}
            {expandedIndex === null && canWrite && onCreateManagement && (
              <div
                onClick={onCreateManagement}
                onMouseEnter={() => startDwell(filteredManagements.length)}
                onMouseLeave={cancelDwell}
                className="min-h-[190px] h-full rounded-xl border border-dashed border-border/30 hover:border-border/60 hover:bg-card/30 transition-all duration-200 flex items-center justify-center cursor-pointer group/ghostslot opacity-40 hover:opacity-100 select-none"
              >
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/60 group-hover/ghostslot:text-foreground transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center group-hover/ghostslot:bg-primary group-hover/ghostslot:text-primary-foreground group-hover/ghostslot:border-primary transition-all duration-200 group-hover/ghostslot:scale-105 shadow-2xs">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-semibold">Novo</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lista Compacta */
        <div className="divide-y divide-border rounded-xl border border-border/80 bg-card shadow-md overflow-hidden">
          {filteredManagements.map((mgmt) => {
            const projectCount = mgmt._count?.projects ?? 0;
            const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
            const displayName = stripManagementPrefix(mgmt.name);
            const initials = mgmt.name.trim().slice(0, 2).toUpperCase() || "GE";
            const bgColor = mgmt.color || "var(--primary)";

            return (
              <div
                key={mgmt.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectManagement(mgmt.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectManagement(mgmt.id);
                  }
                }}
                className="group flex items-center justify-between p-3 sm:p-4 hover:bg-muted/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: bgColor }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                        Gestão
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </span>
                    </div>
                    {mgmt.description?.trim() && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                        {mgmt.description.trim()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-3">
                  <span className="flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5" />
                    <span>{projectCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{memberCount}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
