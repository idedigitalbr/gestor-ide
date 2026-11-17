"use client";

import React, { useState } from "react";
import {
  Folder,
  FileText,
  FileSpreadsheet,
  BookOpen,
  Bookmark,
  Palette,
  PenTool,
  Layout,
  Layers,
  Monitor,
  BarChart2,
  LineChart,
  Table,
  Database,
  Sparkles,
  Bot,
  Code,
  Workflow,
  Cpu,
  Globe,
  Link as LinkIcon,
  Share2,
  Compass,
  ExternalLink,
  Presentation,
  Tv,
  CheckSquare,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const AVAILABLE_CUSTOM_VIEW_ICONS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Folder: { label: "Pasta", icon: Folder },
  FileText: { label: "Documento", icon: FileText },
  FileSpreadsheet: { label: "Planilha", icon: FileSpreadsheet },
  BookOpen: { label: "Documentação", icon: BookOpen },
  Bookmark: { label: "Marcador", icon: Bookmark },
  Layout: { label: "Protótipo", icon: Layout },
  Palette: { label: "Design", icon: Palette },
  PenTool: { label: "Vetor / UI", icon: PenTool },
  Layers: { label: "Camadas / Figma", icon: Layers },
  Monitor: { label: "Aplicação Web", icon: Monitor },
  BarChart2: { label: "Gráfico de Barras", icon: BarChart2 },
  LineChart: { label: "Gráfico de Linha", icon: LineChart },
  Table: { label: "Tabela Externa", icon: Table },
  Database: { label: "Banco de Dados", icon: Database },
  Sparkles: { label: "Inteligência Artificial", icon: Sparkles },
  Bot: { label: "ChatBot / Assistente", icon: Bot },
  Code: { label: "Repositório / Código", icon: Code },
  Workflow: { label: "Fluxo / Automação", icon: Workflow },
  Cpu: { label: "Servidor / API", icon: Cpu },
  Globe: { label: "Website / Web", icon: Globe },
  Link: { label: "Link Externo", icon: LinkIcon },
  Share2: { label: "Compartilhado", icon: Share2 },
  Compass: { label: "Explorar", icon: Compass },
  ExternalLink: { label: "Atalho Direto", icon: ExternalLink },
  Presentation: { label: "Apresentação", icon: Presentation },
  Tv: { label: "Vídeo / Painel", icon: Tv },
  CheckSquare: { label: "Checklist", icon: CheckSquare },
};

export function renderCustomViewIcon(
  iconName: string,
  className = "size-3.5"
): React.ReactNode {
  const item = AVAILABLE_CUSTOM_VIEW_ICONS[iconName];
  if (item) {
    const IconComponent = item.icon;
    return <IconComponent className={className} />;
  }
  return <Globe className={className} />;
}

export interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = Object.entries(AVAILABLE_CUSTOM_VIEW_ICONS).filter(
    ([name, meta]) => {
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        name.toLowerCase().includes(term) ||
        meta.label.toLowerCase().includes(term)
      );
    }
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="absolute left-2 top-2 size-3 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ícone..."
          className="w-full pl-7 pr-2 py-1 text-xs bg-background border border-border/80 rounded-md outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 bg-background/50 border border-border/60 rounded-md">
        {filteredIcons.map(([name, meta]) => {
          const IconComp = meta.icon;
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                "flex items-center justify-center size-8 rounded-md transition-all cursor-pointer",
                isSelected
                  ? "bg-primary/15 text-primary ring-1.5 ring-primary font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              title={`${meta.label} (${name})`}
              aria-label={meta.label}
              aria-pressed={isSelected}
            >
              <IconComp className="size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
