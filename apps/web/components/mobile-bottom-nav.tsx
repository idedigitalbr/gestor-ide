"use client";

import React from "react";
import {
  CalendarDays,
  CheckSquare,
  FolderGit2,
  Home,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "home" | "projects" | "tasks" | "calendar" | "menu";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  unreadCount?: number;
  className?: string;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  className = "",
}: MobileBottomNavProps) {
  const tabs = [
    {
      id: "home" as const,
      label: "Início",
      icon: Home,
    },
    {
      id: "projects" as const,
      label: "Projetos",
      icon: FolderGit2,
    },
    {
      id: "tasks" as const,
      label: "Tarefas",
      icon: CheckSquare,
    },
    {
      id: "calendar" as const,
      label: "Agenda",
      icon: CalendarDays,
    },
    {
      id: "menu" as const,
      label: "Mais",
      icon: SlidersHorizontal,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <nav
      aria-label="Navegação móvel"
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-30",
        "bg-card/95 backdrop-blur-md border-t border-border/80 shadow-lg",
        "pb-safe",
        className
      )}
    >
      <div className="flex items-center justify-around h-15 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "relative flex-1 min-h-[48px] h-full flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer outline-none",
                "active:scale-95",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "size-5 transition-transform",
                    isActive ? "scale-110 stroke-[2.4]" : "stroke-[1.8]"
                  )}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] leading-tight tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
