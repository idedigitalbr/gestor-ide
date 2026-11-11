"use client";

import React, { useState } from "react";
import { Check, FolderPlus, Plus } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskItemTypeIcon } from "@/components/task-item-type-selector";
import { getAllowedGroupTypes, getItemTypeDefinition, type ProjectTaskItemType } from "@/lib/task-item-type";
import type { TaskStatus } from "@/types/task";
import { TaskSolidStatusBadge } from "./task-solid-status-badge";
import { cn } from "@/lib/utils";

interface CreateGroupPopoverProps {
  onCreateFreeGroup?: (name: string) => void;
  onCreateSpecialGroup: (data: { title: string; itemType: ProjectTaskItemType; status: TaskStatus }) => void;
  parentType?: ProjectTaskItemType | null;
  compact?: boolean;
}

const HIERARCHY: { type: ProjectTaskItemType; depth: number }[] = [
  { type: "STAGE", depth: 0 },
  { type: "PAGE", depth: 1 },
  { type: "MODULE", depth: 1 },
  { type: "SECTION", depth: 2 },
  { type: "ITEM", depth: 2 },
];

export function CreateGroupPopover({ onCreateFreeGroup, onCreateSpecialGroup, parentType = null, compact = false }: CreateGroupPopoverProps) {
  const [open, setOpen] = useState(false);
  const allowedTypes = getAllowedGroupTypes(parentType);
  const [selectedType, setSelectedType] = useState<ProjectTaskItemType | "FREE">(allowedTypes[0] ?? "FREE");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("PENDENTE");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name) return;
    if (selectedType === "FREE") {
      if (!onCreateFreeGroup || parentType !== null) return;
      onCreateFreeGroup(name);
    } else {
      if (!allowedTypes.includes(selectedType)) return;
      onCreateSpecialGroup({ title: name, itemType: selectedType, status });
    }
    setTitle("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("gap-2", compact && "h-6 w-6 p-0")} aria-label={compact ? "Adicionar grupo dentro" : undefined}>
          <Plus className="h-4 w-4" />{!compact && <span>Adicionar novo grupo</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" collisionPadding={8} className="w-80 max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl p-3">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Tipo de grupo</p>
            <p className="mb-2 text-xs text-muted-foreground">A organização por tipo e grupos livres fica salva neste navegador.</p>
            {parentType === null && (
              <button type="button" onClick={() => setSelectedType("FREE")} className={cn("flex w-full items-center gap-2 rounded-md p-2 text-left text-xs hover:bg-secondary", selectedType === "FREE" && "bg-secondary")}>
                <FolderPlus className="h-4 w-4 text-primary" />
                <span className="flex-1"><span className="block font-semibold">Grupo livre</span><span className="text-muted-foreground">Organizar tarefas por contexto</span></span>
                {selectedType === "FREE" && <Check className="h-4 w-4" />}
              </button>
            )}
            {HIERARCHY.map(({ type, depth }) => {
              const def = getItemTypeDefinition(type);
              const available = allowedTypes.includes(type);
              const selected = selectedType === type;
              return (
                <button key={type} type="button" disabled={!available} onClick={() => setSelectedType(type)} className={cn("flex w-full items-center gap-2 rounded-md p-2 text-left text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50", depth === 1 && "pl-5", depth === 2 && "pl-8", selected && "bg-secondary")}>
                  <TaskItemTypeIcon type={type} size={16} />
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{def.label}</span><span className="block text-muted-foreground">{def.subtitle}</span></span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">
            Nome
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome do grupo" className="mt-1" />
          </label>
          <div className="flex items-center justify-between gap-2">
            {selectedType !== "FREE" && <TaskSolidStatusBadge status={status} onChangeStatus={setStatus} size="sm" />}
            <Button type="submit" size="sm" disabled={!title.trim()} className="ml-auto">Criar grupo</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
