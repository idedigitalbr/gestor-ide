"use client";

import React, { useState, useId } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Flag,
  Layers,
  Package,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import type { TaskGroupBy, GroupOrder } from "@/types/task";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface GroupOptionItem {
  id: TaskGroupBy;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  detail?: string;
}

export const GROUP_OPTIONS: GroupOptionItem[] = [
  { id: "status", label: "Status", icon: CircleDot },
  { id: "assignee", label: "Responsável", icon: User },
  { id: "priority", label: "Prioridade", icon: Flag, detail: "4 exibido >" },
  { id: "tag", label: "Etiquetas", icon: Tag, detail: "Nenhum >" },
  { id: "dueDate", label: "Data de vencimento", icon: Calendar },
  { id: "taskType", label: "Tipo de tarefa", icon: Package },
];

export function getGroupByLabel(groupBy: TaskGroupBy): string {
  if (groupBy === "none") return "Nenhum";
  const found = GROUP_OPTIONS.find((opt) => opt.id === groupBy);
  return found?.label ?? "Nenhum";
}

export interface TaskGroupingMenuProps {
  groupBy: TaskGroupBy;
  groupOrder: GroupOrder;
  onGroupByChange: (groupBy: TaskGroupBy) => void;
  onGroupOrderChange: (order: GroupOrder) => void;
  className?: string;
}

export function TaskGroupingMenu({
  groupBy,
  groupOrder,
  onGroupByChange,
  onGroupOrderChange,
  className,
}: TaskGroupingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerId = useId();

  const activeOption = GROUP_OPTIONS.find((opt) => opt.id === groupBy);
  const ActiveIcon = activeOption?.icon ?? Layers;

  const handleSelectOption = (optionId: TaskGroupBy) => {
    if (groupBy === optionId) {
      onGroupByChange("none");
    } else {
      onGroupByChange(optionId);
    }
  };

  const toggleOrder = () => {
    onGroupOrderChange(groupOrder === "asc" ? "desc" : "asc");
  };

  const handleClearGrouping = () => {
    onGroupByChange("none");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
    <div className={cn("relative inline-block", className)}>
      {/* Botão de Disparo - Conforme Anexo 2 */}
      <PopoverTrigger asChild>
      <button
        id={triggerId}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Agrupar tarefas"
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer",
          groupBy !== "none"
            ? "border-primary/60 bg-primary/15 text-primary hover:bg-primary/20"
            : "border-border bg-card/60 text-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        <Layers
          className={cn(
            "h-3.5 w-3.5",
            groupBy !== "none" ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span>Agrupando por: {getGroupByLabel(groupBy)}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform" />
      </button>
      </PopoverTrigger>

      {/* Popover de Opções - Conforme Anexo 1 */}
        <PopoverContent
          align="start"
          collisionPadding={8}
          aria-label="Opções de agrupamento"
          className="w-72 rounded-xl p-1.5 shadow-2xl"
        >
          {/* Lista de Opções de Agrupamento */}
          <div className="space-y-0.5 py-1">
            {GROUP_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = groupBy === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left group",
                    isSelected
                      ? "bg-secondary text-foreground"
                      : "text-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isSelected
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.detail && (
                      <span className="text-[11px] text-muted-foreground">
                        {opt.detail}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Barra Inferior com Pílula Ativa, Ordenação e Lixeira (Anexo 1) */}
          <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 px-1 pb-1">
            {/* Pílula do Campo Ativo com borda roxa brilhante */}
            <div
              className={cn(
                "flex-1 inline-flex items-center justify-between px-2.5 py-1 rounded-md text-xs font-semibold border transition-all",
                groupBy !== "none"
                  ? "border-primary bg-secondary text-foreground shadow-sm"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                <ActiveIcon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    groupBy !== "none" ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="truncate">{getGroupByLabel(groupBy)}</span>
              </div>
              <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
            </div>

            {/* Alternador de Ordenação: Crescente / Decrescente */}
            <button
              type="button"
              onClick={toggleOrder}
              disabled={groupBy === "none"}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-muted transition-colors cursor-pointer",
                groupBy !== "none"
                  ? "text-foreground hover:bg-muted hover:text-foreground"
                  : "text-muted-foreground cursor-not-allowed opacity-50"
              )}
              title={
                groupOrder === "asc"
                  ? "Alternar para Decrescente"
                  : "Alternar para Crescente"
              }
            >
              <span>{groupOrder === "asc" ? "Crescente" : "Decrescente"}</span>
              {groupOrder === "asc" ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-3 h-3 text-muted-foreground" />
              )}
            </button>

            {/* Ícone de Lixeira (limpar agrupamento para 'Nenhum') */}
            <button
              type="button"
              onClick={handleClearGrouping}
              disabled={groupBy === "none"}
              className={cn(
                "p-1.5 rounded-md border border-border bg-muted transition-colors cursor-pointer",
                groupBy !== "none"
                  ? "text-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                  : "text-muted-foreground cursor-not-allowed opacity-50"
              )}
              title="Remover agrupamento (Nenhum)"
              aria-label="Remover agrupamento"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </PopoverContent>
    </div>
    </Popover>
  );
}
