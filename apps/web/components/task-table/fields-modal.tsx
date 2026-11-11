"use client";

import { useMemo, useState } from "react";
import {
  AlignLeft,
  Calendar,
  Check,
  ChevronDownSquare,
  Hash,
  Plus,
  Search,
  Settings,
  Sparkles,
  Tag,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type CustomFieldType =
  | "text"
  | "dropdown"
  | "date"
  | "textarea"
  | "number"
  | "labels"
  | "auto";

export interface CustomColumnDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
}

export interface ExistingColumnItem {
  id: string;
  label: string;
  isVisible: boolean;
}

export const POPULAR_FIELD_TYPES: {
  type: CustomFieldType;
  label: string;
  description: string;
  icon: typeof Type;
  iconColor: string;
  badge?: string;
}[] = [
  {
    type: "dropdown",
    label: "Lista suspensa",
    description: "Opções pré-definidas em menu para padronizar e categorizar tarefas.",
    icon: ChevronDownSquare,
    iconColor: "text-emerald-500",
  },
  {
    type: "text",
    label: "Texto",
    description: "Adicione contexto importante a qualquer tarefa com apenas uma linha.",
    icon: Type,
    iconColor: "text-blue-500",
  },
  {
    type: "date",
    label: "Data",
    description: "Defina datas específicas ou marcos complementares no calendário.",
    icon: Calendar,
    iconColor: "text-teal-500",
  },
  {
    type: "textarea",
    label: "Área de texto (Texto longo)",
    description: "Texto com múltiplas linhas para especificações detalhadas e notas.",
    icon: AlignLeft,
    iconColor: "text-sky-500",
  },
  {
    type: "number",
    label: "Número",
    description: "Valores numéricos, contadores, pontuação ou valores financeiros.",
    icon: Hash,
    iconColor: "text-emerald-500",
  },
  {
    type: "labels",
    label: "Rótulos (Seleção múltipla)",
    description: "Múltiplas tags ou etiquetas coloridas para filtrar e agrupar tarefas.",
    icon: Tag,
    iconColor: "text-green-500",
  },
  {
    type: "auto",
    label: "Preenchimento automático com...",
    description: "Gere campos dinâmicos ou resumidos com base nas informações do projeto.",
    icon: Sparkles,
    iconColor: "text-purple-500",
    badge: "IA",
  },
];

export function FieldsModal({
  isOpen,
  onClose,
  existingColumns,
  onAddExistingColumn,
  onCreateCustomColumn,
}: {
  isOpen: boolean;
  onClose: () => void;
  existingColumns: ExistingColumnItem[];
  onAddExistingColumn: (columnId: string) => void;
  onCreateCustomColumn: (col: CustomColumnDefinition) => void;
}) {
  const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredType, setHoveredType] = useState<CustomFieldType | null>(null);

  // Form for creating a field
  const [selectedTypeForCreation, setSelectedTypeForCreation] = useState<CustomFieldType | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [dropdownOptionsText, setDropdownOptionsText] = useState("Opção 1, Opção 2, Opção 3");

  const filteredFieldTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return POPULAR_FIELD_TYPES;
    return POPULAR_FIELD_TYPES.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredExisting = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return existingColumns;
    return existingColumns.filter((col) => col.label.toLowerCase().includes(q));
  }, [existingColumns, searchQuery]);

  const handleStartCreate = (type: CustomFieldType, defaultLabel: string) => {
    setSelectedTypeForCreation(type);
    setNewFieldName(defaultLabel);
  };

  const handleFinishCreate = () => {
    const trimmed = newFieldName.trim();
    if (!trimmed || !selectedTypeForCreation) return;

    const id = `custom_${Date.now()}_${trimmed.toLowerCase().replace(/\s+/g, "_")}`;
    const options =
      selectedTypeForCreation === "dropdown" || selectedTypeForCreation === "labels"
        ? dropdownOptionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    onCreateCustomColumn({
      id,
      label: trimmed,
      type: selectedTypeForCreation,
      options,
    });

    setSelectedTypeForCreation(null);
    setNewFieldName("");
    onClose();
  };

  const currentHoveredInfo = useMemo(() => {
    if (!hoveredType) return null;
    return POPULAR_FIELD_TYPES.find((item) => item.type === hoveredType);
  }, [hoveredType]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[460px] p-0 overflow-hidden bg-[#161822] border-border text-foreground shadow-2xl rounded-2xl">
        {/* Header (Anexo 3: Campos + Gear + Close) */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <DialogTitle className="text-base font-semibold text-foreground">Campos</DialogTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
              title="Configurações de campos"
              aria-label="Configurações de campos"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search input (Anexo 3) */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar campos de tarefa"
              className="h-10 w-full pl-3 pr-8 rounded-lg bg-[#0e1017] border-[#2a2d3d] text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs: Criar novo | Adicionar um existente (Anexo 3) */}
        <div className="flex items-center gap-6 px-5 border-b border-[#242738] text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab("create");
              setSelectedTypeForCreation(null);
            }}
            className={cn(
              "pb-2.5 font-semibold transition-colors relative cursor-pointer",
              activeTab === "create"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Criar novo
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("existing");
              setSelectedTypeForCreation(null);
            }}
            className={cn(
              "pb-2.5 font-semibold transition-colors relative cursor-pointer",
              activeTab === "existing"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Adicionar um existente
          </button>
        </div>

        {/* Content body */}
        <div className="px-5 py-3 relative min-h-[300px] max-h-[420px] overflow-y-auto">
          {activeTab === "create" ? (
            selectedTypeForCreation ? (
              /* Sub-form: configure and create the chosen field */
              <div className="flex flex-col gap-3.5 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Nova Coluna: {POPULAR_FIELD_TYPES.find((t) => t.type === selectedTypeForCreation)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTypeForCreation(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Nome do campo</label>
                  <Input
                    autoFocus
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Ex: Responsável técnico, Observações..."
                    className="h-8 text-xs bg-[#0e1017] border-[#2a2d3d]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishCreate();
                    }}
                  />
                </div>

                {(selectedTypeForCreation === "dropdown" || selectedTypeForCreation === "labels") && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Opções (separadas por vírgula)
                    </label>
                    <Input
                      value={dropdownOptionsText}
                      onChange={(e) => setDropdownOptionsText(e.target.value)}
                      placeholder="Opção 1, Opção 2, Opção 3"
                      className="h-8 text-xs bg-[#0e1017] border-[#2a2d3d]"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTypeForCreation(null)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleFinishCreate}
                    disabled={!newFieldName.trim()}
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 cursor-pointer"
                  >
                    Criar coluna
                  </Button>
                </div>
              </div>
            ) : (
              /* List of popular types (Anexo 3) */
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                  Popular
                </div>
                <div className="flex flex-col gap-1">
                  {filteredFieldTypes.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={item.type}
                        onMouseEnter={() => setHoveredType(item.type)}
                        onMouseLeave={() => setHoveredType(null)}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#202330] transition-colors cursor-pointer"
                        onClick={() => handleStartCreate(item.type, item.label)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconComponent className={cn("h-4 w-4 shrink-0", item.iconColor)} />
                          <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-opacity">
                          Criar
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Floating tooltip preview (Anexo 3 left tooltip: "Text / Add important context...") */}
                {currentHoveredInfo && (
                  <div className="hidden lg:block absolute left-[-220px] top-12 w-48 p-3 rounded-xl bg-card border border-border shadow-2xl pointer-events-none animate-in fade-in-50 zoom-in-95">
                    <div className="text-xs font-bold text-foreground mb-1">{currentHoveredInfo.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      {currentHoveredInfo.description}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Tab: Adicionar um existente */
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                Colunas disponíveis
              </div>
              {filteredExisting.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma coluna encontrada
                </div>
              ) : (
                filteredExisting.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => {
                      if (!col.isVisible) onAddExistingColumn(col.id);
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer",
                      col.isVisible ? "opacity-50 cursor-default" : "hover:bg-[#202330]"
                    )}
                  >
                    <span className="text-xs font-medium text-foreground">{col.label}</span>
                    {col.isVisible ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-500" />
                        Visível
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddExistingColumn(col.id);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Exibir
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
