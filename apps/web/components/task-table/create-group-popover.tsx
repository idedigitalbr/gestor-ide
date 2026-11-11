"use client";

import React, { useId, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronRight, FolderPlus, Plus, UserRound } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskItemTypeIcon } from "@/components/task-item-type-selector";
import { NotionDatePicker } from "@/components/ui/notion-date-picker";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import type { CrmProjectMember } from "@gestor-ide/core";
import { getAllowedGroupTypes, getItemTypeDefinition, type ProjectTaskItemType } from "@/lib/task-item-type";
import type { TaskStatus } from "@/types/task";
import { TaskSolidStatusBadge } from "./task-solid-status-badge";
import { cn } from "@/lib/utils";

interface CreateGroupPopoverProps {
  onCreateFreeGroup?: (name: string) => void;
  onCreateSpecialGroup: (data: { title: string; itemType: ProjectTaskItemType; status: TaskStatus; startDate?: string; dueDate?: string; assigneeId?: string; assignee?: string; assigneeAvatar?: string }) => void;
  parentType?: ProjectTaskItemType | null;
  compact?: boolean;
  members?: CrmProjectMember[];
  membersLoaded?: boolean;
}

export function CreateGroupPopover({ onCreateFreeGroup, onCreateSpecialGroup, parentType = null, compact = false, members = [], membersLoaded = false }: CreateGroupPopoverProps) {
  const [open, setOpen] = useState(false);
  const treeId = useId();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const allowedTypes = getAllowedGroupTypes(parentType);
  const [selectedType, setSelectedType] = useState<ProjectTaskItemType | "FREE">(allowedTypes[0] ?? "FREE");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("PENDENTE");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const selectedMember = members.find((member) => member.userId === assigneeId);

  function renderType(type: ProjectTaskItemType, path: string, depth: number): React.ReactNode {
    const def = getItemTypeDefinition(type);
    const children = getAllowedGroupTypes(type);
    const isExpanded = Boolean(expanded[path]);
    const available = allowedTypes.includes(type);
    const selected = selectedType === type;
    const childrenId = `${treeId}-${path}`;
    return (
      <div key={path}>
        <div className={cn("flex items-center rounded-md", selected && "bg-secondary")}>
          {children.length > 0 ? (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`${isExpanded ? "Recolher" : "Expandir"} tipos de ${def.label}`} aria-expanded={isExpanded} aria-controls={childrenId} onClick={() => setExpanded((current) => ({ ...current, [path]: !isExpanded }))}>
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Button>
          ) : <span className="w-7 shrink-0" aria-hidden="true" />}
          <button type="button" disabled={!available} onClick={() => setSelectedType(type)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left text-xs hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
            <TaskItemTypeIcon type={type} size={16} />
            <span className="min-w-0 flex-1"><span className="block font-semibold">{def.label}</span><span className="block text-muted-foreground">{def.subtitle}</span></span>
            {selected && <Check className="h-4 w-4" />}
          </button>
        </div>
        {children.length > 0 && (
          <div id={childrenId} hidden={!isExpanded} className={cn("border-l border-border", depth < 2 && "ml-3")}>
            {isExpanded && children.map((child) => renderType(child, `${path}-${child}`, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name) return;
    if (selectedType === "FREE") {
      if (!onCreateFreeGroup || parentType !== null) return;
      onCreateFreeGroup(name);
    } else {
      if (!allowedTypes.includes(selectedType)) return;
      onCreateSpecialGroup({ title: name, itemType: selectedType, status, startDate: startDate ?? undefined, dueDate: dueDate ?? undefined, assigneeId: selectedMember?.userId, assignee: selectedMember?.user.name || selectedMember?.user.email, assigneeAvatar: selectedMember?.user.avatarUrl ?? undefined });
    }
    setTitle("");
    setStartDate(null);
    setDueDate(null);
    setAssigneeId(null);
    setExpanded({});
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setExpanded({}); }}>
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
            {allowedTypes.map((type) => renderType(type, type, 0))}
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">
            Nome
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome do grupo" className="mt-1" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {selectedType !== "FREE" && <>
              <TaskSolidStatusBadge status={status} onChangeStatus={setStatus} size="sm" />
              <NotionDatePicker startDate={startDate || dueDate} endDate={startDate ? dueDate : null} allowRange ariaLabel="Definir data do grupo" placeholder="Data" onChange={({ startDate: from, endDate }) => { setStartDate(endDate ? from : null); setDueDate(endDate || from || null); }} renderTrigger={({ open: openDate, formatted }) => (
                <Button type="button" variant="outline" size="sm" onClick={openDate} aria-label="Definir data do grupo"><CalendarDays /> <span>{formatted || "Data"}</span></Button>
              )} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" disabled={!membersLoaded} aria-label={selectedMember ? `Responsável: ${selectedMember.user.name || selectedMember.user.email}` : "Selecionar responsável"} title={membersLoaded ? "Selecionar responsável" : "Carregando membros do projeto"} className="overflow-hidden rounded-full">
                    {selectedMember ? <MemberAvatarContent name={selectedMember.user.name} src={selectedMember.user.avatarUrl} initialsLength={1} /> : <UserRound />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {members.map((member) => <DropdownMenuItem key={member.userId} onSelect={() => setAssigneeId(member.userId)}>{member.user.name || member.user.email}{assigneeId === member.userId && <Check className="ml-auto" />}</DropdownMenuItem>)}
                  <DropdownMenuItem onSelect={() => setAssigneeId(null)}>Sem responsável{!assigneeId && <Check className="ml-auto" />}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>}
            <Button type="submit" size="sm" disabled={!title.trim()} className="ml-auto">Criar grupo</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
