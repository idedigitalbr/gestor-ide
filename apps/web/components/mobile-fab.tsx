"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFabProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  hasBottomNav?: boolean;
}

export function MobileFab({
  onClick,
  disabled = false,
  className = "",
  hasBottomNav = true,
}: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Criar nova tarefa"
      title="Criar nova tarefa (+)"
      className={cn(
        "md:hidden fixed z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-2xl border border-primary-foreground/20",
        "flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        hasBottomNav ? "bottom-20 right-4" : "bottom-6 right-4",
        className
      )}
    >
      <Plus className="size-7 stroke-[2.8]" />
    </button>
  );
}
