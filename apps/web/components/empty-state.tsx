"use client";

import React from "react";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddTask: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ onAddTask, isFiltered, onClearFilters }: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16 px-4 text-center select-none">
      <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground mb-2.5">
        <CheckSquare className="w-4 h-4" />
      </div>
      <h3 className="font-medium text-xs text-foreground mb-1">
        {isFiltered ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa criada"}
      </h3>
      <p className="text-[11px] text-muted-foreground max-w-xs mb-3">
        {isFiltered
          ? "Ajuste os filtros de status, prioridade ou a busca textual."
          : "Comece adicionando uma tarefa para acompanhar na Tabela."}
      </p>

      <div className="flex items-center gap-2">
        {isFiltered && onClearFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs bg-secondary border-border text-secondary-foreground"
          >
            Limpar Filtros
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onAddTask}
          className="h-7 text-xs bg-primary text-primary-foreground hover:opacity-90 font-medium gap-1 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Criar Tarefa</span>
        </Button>
      </div>
    </div>
  );
}
