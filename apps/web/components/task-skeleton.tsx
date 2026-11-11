"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function TaskTableSkeleton() {
  return (
    <div className="w-full bg-card/40 border border-border/80 rounded-lg select-none text-xs relative animate-pulse shadow-xs">
      {/* Cabeçalho da Tabela */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-6">
          <div className="h-3.5 w-20 bg-muted rounded" />
        </div>
        <div className="flex items-center shrink-0 gap-0">
          <span className="hidden md:inline-block w-32 text-left">
            <div className="h-3.5 w-24 bg-muted rounded" />
          </span>
          <span className="w-28 text-left">
            <div className="h-3.5 w-16 bg-muted rounded" />
          </span>
          <span className="hidden lg:inline-block w-28 text-left">
            <div className="h-3.5 w-16 bg-muted rounded" />
          </span>
          <span className="hidden sm:inline-block w-28 text-left">
            <div className="h-3.5 w-14 bg-muted rounded" />
          </span>
          <span className="w-8" />
        </div>
      </div>

      {/* Grupos e Linhas Placeholder */}
      <div className="divide-y divide-border/60 rounded-b-lg">
        {[
          { labelWidth: "w-24", count: 3 },
          { labelWidth: "w-28", count: 2 },
          { labelWidth: "w-20", count: 2 },
        ].map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* Cabeçalho do Grupo */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 border-b border-border/40">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-4 h-4 rounded bg-muted/80" />
                <div className={cn("h-4 rounded bg-muted/90", group.labelWidth)} />
                <div className="h-4 w-12 rounded bg-muted/60" />
              </div>
              <div className="hidden sm:block w-20 h-2 rounded-full bg-muted/60" />
            </div>

            {/* Linhas de Tarefa do Grupo */}
            <div className="divide-y divide-border/40">
              {Array.from({ length: group.count }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center justify-between py-2.5 px-3"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
                    <div className="w-3.5 h-3.5 rounded-xs bg-muted/60 shrink-0" />
                    <div className="w-3.5 h-3.5 rounded-full bg-muted/70 shrink-0" />
                    <div className="flex flex-col gap-1 flex-1 max-w-md">
                      <div
                        className="h-3.5 rounded bg-muted/80"
                        style={{
                          width: `${55 + ((groupIdx * 3 + rowIdx) % 4) * 12}%`,
                        }}
                      />
                      <div className="h-2.5 w-16 rounded bg-muted/50" />
                    </div>
                  </div>

                  <div className="flex items-center shrink-0">
                    <div className="hidden md:flex items-center w-32">
                      <div className="h-3 w-16 rounded bg-muted/60" />
                    </div>
                    <div className="w-28">
                      <div className="h-4 w-14 rounded-full bg-muted/70" />
                    </div>
                    <div className="hidden lg:flex items-center w-28">
                      <div className="h-1.5 w-16 rounded-full bg-muted/60" />
                    </div>
                    <div className="hidden sm:flex items-center w-28">
                      <div className="h-4 w-16 rounded bg-muted/60" />
                    </div>
                    <div className="w-8 flex justify-end">
                      <div className="w-4 h-4 rounded bg-muted/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskKanbanSkeleton() {
  return (
    <div className="flex items-start gap-3 h-full overflow-x-auto pb-4 select-none animate-pulse">
      {["A Fazer", "Em Andamento", "Em Revisão", "Concluído"].map((col, idx) => (
        <div
          key={col}
          className="w-72 shrink-0 rounded-lg bg-card/40 border border-border flex flex-col max-h-full overflow-hidden"
        >
          {/* Cabeçalho da Coluna */}
          <div className="p-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted/60" />
              <div className="h-3.5 w-24 bg-muted/70 rounded" />
              <div className="h-4 w-5 bg-muted/40 rounded-full" />
            </div>
          </div>

          {/* Cards da Coluna */}
          <div className="p-2 flex flex-col gap-2 overflow-y-auto">
            {Array.from({ length: idx === 0 ? 3 : idx === 1 ? 2 : 1 }).map(
              (_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="p-3 rounded-md border border-border/60 bg-muted/20 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-2.5 w-14 bg-muted/40 rounded" />
                    <div className="h-3.5 w-12 bg-muted/50 rounded-full" />
                  </div>
                  <div className="h-3.5 w-4/5 bg-muted/70 rounded" />
                  <div className="h-3 w-3/5 bg-muted/40 rounded" />
                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <div className="h-2.5 w-16 bg-muted/40 rounded" />
                    <div className="w-4 h-4 rounded-full bg-muted/50" />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
