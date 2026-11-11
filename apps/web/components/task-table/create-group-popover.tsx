"use client";

import React, { useState } from "react";
import { Plus, FolderPlus, Layers, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TASK_ITEM_TYPES_LIST,
  type ProjectTaskItemType,
} from "@/lib/task-item-type";
import type { TaskStatus } from "@/types/task";
import { TaskSolidStatusBadge } from "./task-solid-status-badge";
import { cn } from "@/lib/utils";

interface CreateGroupPopoverProps {
  onCreateFreeGroup: (name: string) => void;
  onCreateSpecialGroup: (data: {
    title: string;
    itemType: ProjectTaskItemType;
    status: TaskStatus;
  }) => void;
}

export function CreateGroupPopover({
  onCreateFreeGroup,
  onCreateSpecialGroup,
}: CreateGroupPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"free" | "special">("special");

  // Campos para Grupo Livre
  const [freeGroupName, setFreeGroupName] = useState("");

  // Campos para Grupo Especial
  const [specialTitle, setSpecialTitle] = useState("");
  const [selectedType, setSelectedType] = useState<ProjectTaskItemType>("STAGE");
  const [specialStatus, setSpecialStatus] = useState<TaskStatus>("PENDENTE");

  function handleCreateFree(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = freeGroupName.trim();
    if (!trimmed) return;
    onCreateFreeGroup(trimmed);
    setFreeGroupName("");
    setOpen(false);
  }

  function handleCreateSpecial(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = specialTitle.trim();
    if (!trimmed) return;
    onCreateSpecialGroup({
      title: trimmed,
      itemType: selectedType,
      status: specialStatus,
    });
    setSpecialTitle("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#252838] bg-[#12141f] text-xs font-semibold text-[#c8cce0] hover:text-white hover:border-[#3b82f6] hover:bg-[#181a28] shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#8b5cf6]" />
          <span>+ Adicionar novo grupo</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        className="w-80 p-3.5 bg-[#141624] border-[#252838] text-white shadow-2xl rounded-2xl z-50"
      >
        <div className="flex items-center gap-1.5 p-1 bg-[#0d0e17] rounded-lg mb-3">
          <button
            type="button"
            onClick={() => setTab("special")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer",
              tab === "special"
                ? "bg-[#25283f] text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span>Grupo especial</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("free")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer",
              tab === "free"
                ? "bg-[#25283f] text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Grupo livre</span>
          </button>
        </div>

        {tab === "special" ? (
          <form onSubmit={handleCreateSpecial} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Tipo especial
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {TASK_ITEM_TYPES_LIST.filter((t) => t.type !== "TASK").map((def) => {
                  const isSelected = selectedType === def.type;
                  return (
                    <button
                      key={def.type}
                      type="button"
                      onClick={() => setSelectedType(def.type)}
                      className={cn(
                        "flex items-center gap-1.5 p-1.5 rounded-lg border text-left text-xs transition-all cursor-pointer",
                        isSelected
                          ? "border-[#8b5cf6] bg-[#8b5cf6]/15 text-white font-medium"
                          : "border-[#252838] bg-[#10121d] text-muted-foreground hover:text-white"
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="truncate">{def.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Título do grupo / tarefa especial
              </label>
              <Input
                autoFocus
                placeholder="Ex: Etapa 06 — Pós-lançamento..."
                value={specialTitle}
                onChange={(e) => setSpecialTitle(e.target.value)}
                className="h-8 text-xs bg-[#0d0e17] border-[#252838] text-white placeholder:text-[#6e728c]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <TaskSolidStatusBadge
                status={specialStatus}
                onChangeStatus={setSpecialStatus}
                size="sm"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 text-xs bg-[#8b5cf6] hover:bg-[#7c4def] text-white font-medium cursor-pointer"
              >
                Criar grupo especial
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateFree} className="space-y-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O grupo livre é apenas um container visual para organizar tarefas por nome ou contexto.
            </p>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Nome do container livre
              </label>
              <Input
                autoFocus
                placeholder="Ex: Tarefas pendentes, Backlog..."
                value={freeGroupName}
                onChange={(e) => setFreeGroupName(e.target.value)}
                className="h-8 text-xs bg-[#0d0e17] border-[#252838] text-white placeholder:text-[#6e728c]"
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                size="sm"
                className="h-8 px-3 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium cursor-pointer"
              >
                Criar grupo livre
              </Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
