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
import { cn } from "@/lib/utils";
import { KanbanGhostCard, useKanbanEdgeHover } from "@/components/kanban-ghost-card";

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

  const {
    isGhostVisible,
    slideDirection,
    showGhost,
    hideGhost,
    keepGhost,
  } = useKanbanEdgeHover({ leaveDelay: 220 });

  function handleMouseMoveGrid(e: React.MouseEvent<HTMLDivElement>) {
    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Detecta aproximação nas bordas laterais (primeira coluna <= 48px, última coluna >= rect.width - 48px)
    if (x <= 48) {
      showGhost("left");
    } else if (rect.width - x <= 48) {
      showGhost("right");
    }
  }
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
          onMouseMove={handleMouseMoveGrid}
          onMouseLeave={hideGhost}
          className="relative"
        >
          {/* Trigger de hover na borda lateral esquerda (primeira coluna) */}
          <div
            className="absolute -left-3 top-0 bottom-0 w-8 z-20 cursor-pointer"
            onMouseEnter={() => showGhost("left")}
            onMouseLeave={hideGhost}
            aria-hidden="true"
          />

          {/* Trigger de hover na borda lateral direita (última coluna) */}
          <div
            className="absolute -right-3 top-0 bottom-0 w-8 z-20 cursor-pointer"
            onMouseEnter={() => showGhost("right")}
            onMouseLeave={hideGhost}
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredManagements.map((mgmt) => {
              const projectCount = mgmt._count?.projects ?? 0;
              const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);

              return (
                <EntityCard
                  key={mgmt.id}
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
              );
            })}

            {/* Card Fantasma para criação rápida de nova Gestão */}
            {canWrite && onCreateManagement && (
              <div
                onMouseEnter={keepGhost}
                onMouseLeave={hideGhost}
                className={cn(
                  "transition-all duration-300 ease-out",
                  isGhostVisible
                    ? "opacity-100 scale-100 translate-x-0"
                    : cn(
                        "opacity-0 scale-95 pointer-events-none",
                        slideDirection === "left" ? "-translate-x-5" : "translate-x-5"
                      )
                )}
              >
                <KanbanGhostCard
                  label="Novo"
                  sublabel="Criar nova gestão"
                  variant="entity"
                  slideDirection={slideDirection}
                  onClick={onCreateManagement}
                  isVisible={isGhostVisible}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lista Compacta */
        <div className="divide-y divide-border rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
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
