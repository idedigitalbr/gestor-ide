"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  CircleDot,
  Layers,
  File,
  FileText,
  LayoutGrid,
  PanelTop,
  ListChecks,
  Diamond,
  Check,
  Search,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getItemTypeDefinition,
  normalizeItemType,
  PROJECT_TASK_ITEM_TYPES,
  TASK_ITEM_TYPES_LIST,
  type ProjectTaskItemType,
  type TaskItemTypeDefinition,
} from "@/lib/task-item-type";

interface TaskItemTypeIconProps {
  type?: unknown;
  hasContent?: boolean;
  className?: string;
  size?: number;
}

export function TaskItemTypeIcon({ type, hasContent, className, size = 16 }: TaskItemTypeIconProps) {
  const norm = normalizeItemType(type);
  const def = getItemTypeDefinition(norm);

  switch (norm) {
    case "STAGE":
      return <Layers className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
    case "PAGE":
      return <FileText className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
    case "MODULE":
      return <LayoutGrid className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
    case "SECTION":
      return <PanelTop className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
    case "ITEM":
      return <ListChecks className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
    case "MILESTONE":
      return <Diamond className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
    case "TASK":
    default:
      if (hasContent) {
        return <FileText className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
      }
      return <File className={cn("shrink-0", className)} style={{ color: def.color, width: size, height: size }} />;
  }
}

export interface TaskItemTypeSelectorProps {
  value?: unknown;
  hasContent?: boolean;
  onChange: (type: ProjectTaskItemType) => void;
  allowedTypes?: readonly ProjectTaskItemType[];
  disabled?: boolean;
  variant?: "badge" | "button" | "icon-only" | "full";
  className?: string;
  align?: "start" | "end" | "center";
}

export function TaskItemTypeSelector({
  value,
  hasContent,
  onChange,
  allowedTypes,
  disabled = false,
  variant = "badge",
  className,
  align = "start",
}: TaskItemTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentType = normalizeItemType(value);
  const currentDef = getItemTypeDefinition(currentType);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Foca no input de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const filteredTypes = useMemo(() => {
    const list = allowedTypes
      ? TASK_ITEM_TYPES_LIST.filter((item) => allowedTypes.includes(item.type))
      : TASK_ITEM_TYPES_LIST;

    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
    );
  }, [allowedTypes, search]);

  const handleSelect = (type: ProjectTaskItemType) => {
    onChange(type);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Botão de Disparo */}
      {variant === "icon-only" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Tipo de item: ${currentDef.label}`}
          title={`Tipo: ${currentDef.label} (${currentDef.subtitle}). Clique para alterar.`}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer",
            className
          )}
        >
          <TaskItemTypeIcon type={currentType} hasContent={hasContent} size={15} />
        </button>
      ) : variant === "full" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <TaskItemTypeIcon type={currentType} hasContent={hasContent} size={16} />
            <span className="font-semibold">{currentDef.label}</span>
            <span className="text-[11px] text-muted-foreground truncate">— {currentDef.subtitle}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      ) : variant === "button" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-50",
            className
          )}
        >
          <TaskItemTypeIcon type={currentType} hasContent={hasContent} size={14} />
          <span>{currentDef.label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      ) : (
        /* Default: badge */
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold transition-all hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-60",
            currentDef.badgeBg,
            currentDef.badgeText,
            className
          )}
        >
          <TaskItemTypeIcon type={currentType} hasContent={hasContent} size={13} />
          <span>{currentDef.label}</span>
          <ChevronDown className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* Popover / Dropdown Menu Estilo ClickUp */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/20 backdrop-blur-sm animate-in fade-in-0 zoom-in-95",
            align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          )}
          style={{ minWidth: "240px" }}
        >
          {/* Campo de Busca */}
          <div className="relative mb-1 px-1 pt-1 pb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tipo (ex: Tarefa, Etapa...)"
              className="h-8 w-full rounded-lg border border-border bg-secondary pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-ring/30"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                  setSearch("");
                } else if (e.key === "Enter" && filteredTypes.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredTypes[0].type);
                }
              }}
            />
          </div>

          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tipo de Item
          </div>

          {/* Lista de Opções */}
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {filteredTypes.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Nenhum tipo correspondente.
              </div>
            ) : (
              filteredTypes.map((item) => {
                const isSelected = item.type === currentType;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleSelect(item.type)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-secondary hover:text-foreground cursor-pointer",
                      isSelected && "bg-secondary font-semibold"
                    )}
                  >
                    <TaskItemTypeIcon type={item.type} hasContent={item.type === "TASK"} size={16} />
                    <div className="min-w-0 flex-1 leading-snug">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-xs">{item.label}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate block">
                        {item.subtitle}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
