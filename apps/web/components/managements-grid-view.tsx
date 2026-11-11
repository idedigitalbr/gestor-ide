"use client";

import React, { useMemo } from "react";
import type { CrmProjectManagement } from "@gestor-ide/core";
import {
  Folder,
  Users,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { MANAGEMENT_VISIBILITY_LABELS, type ListDisplayMode } from "@/lib/list-view-options";

interface ManagementsGridViewProps {
  search: string;
  onSearchChange: (value: string) => void;
  visibilityFilter: string;
  onVisibilityFilterChange: (value: string) => void;
  viewMode: ListDisplayMode;
  managements: CrmProjectManagement[];
  onSelectManagement: (managementId: string) => void;
}

export function ManagementsGridView({
  search,
  onSearchChange,
  visibilityFilter,
  onVisibilityFilterChange,
  viewMode,
  managements,
  onSelectManagement,
}: ManagementsGridViewProps) {


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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredManagements.map((mgmt) => {
            const projectCount = mgmt._count?.projects ?? 0;
            const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
            const initials = mgmt.name.trim().slice(0, 2).toUpperCase() || "GE";
            const visibilityText = MANAGEMENT_VISIBILITY_LABELS[mgmt.visibility || "company"] || "Empresa";
            const bgColor = mgmt.color || "#2563eb";

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
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xs transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Banner Superior com Cor ou Imagem */}
                <div
                  className="relative h-24 w-full p-3 flex items-start justify-between"
                  style={
                    mgmt.coverPath
                      ? {
                          backgroundImage: `url(${mgmt.coverPath})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: `linear-gradient(135deg, ${bgColor}ee 0%, ${bgColor}99 100%)`,
                        }
                  }
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                  {/* Avatars de Membros (canto superior esquerdo) */}
                  <div className="relative z-10 flex items-center">
                    {mgmt.members && mgmt.members.length > 0 ? (
                      <div className="flex -space-x-1.5 items-center">
                        {mgmt.members.slice(0, 3).map((m, idx) => (
                          <div
                            key={m.userId || idx}
                            className="w-6 h-6 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground"
                            title={m.user?.name || "Membro"}
                          >
                            <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                          </div>
                        ))}
                        {memberCount > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-card bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center shadow-2xs">
                            +{memberCount - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-white/20 bg-black/30 backdrop-blur-xs flex items-center justify-center text-white/80">
                        <Users className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Badge de Visibilidade (canto superior direito) */}
                  <span className="relative z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-md bg-black/40 text-white border border-white/20">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{visibilityText}</span>
                  </span>

                  {/* Monograma flutuante na base do banner */}
                  <div className="absolute -bottom-3 left-3 z-10">
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-card flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105"
                      style={{ backgroundColor: bgColor }}
                    >
                      {initials}
                    </div>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-xs md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {mgmt.name}
                      </h3>
                      {mgmt.code && (
                        <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.2 rounded border border-border bg-muted/60 text-muted-foreground">
                          {mgmt.code}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {mgmt.description?.trim() || "Sem descrição disponível."}
                    </p>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3 shrink-0" />
                        <span>
                          {projectCount} {projectCount === 1 ? "projeto" : "projetos"}
                        </span>
                      </span>
                      {memberCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>{memberCount}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Lista Compacta */
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {filteredManagements.map((mgmt) => {
            const projectCount = mgmt._count?.projects ?? 0;
            const memberCount = mgmt._count?.members ?? (mgmt.members?.length || 0);
            const initials = mgmt.name.trim().slice(0, 2).toUpperCase() || "GE";
            const visibilityText = MANAGEMENT_VISIBILITY_LABELS[mgmt.visibility || "company"] || "Empresa";
            const bgColor = mgmt.color || "#2563eb";

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
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {mgmt.name}
                      </span>
                      {mgmt.code && (
                        <span className="text-[9px] font-mono px-1 rounded border border-border bg-muted/60 text-muted-foreground">
                          {mgmt.code}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border">
                        {visibilityText}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                      {mgmt.description || "Sem descrição disponível."}
                    </p>
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
