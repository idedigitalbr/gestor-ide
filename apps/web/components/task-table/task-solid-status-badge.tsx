"use client";

import React from "react";
import type { TaskStatus } from "@/types/task";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { StatusDropdownContent, StatusIcon, getStatusDefinition } from "../task-status-icon";
import { cn } from "@/lib/utils";

interface TaskSolidStatusBadgeProps {
  status: TaskStatus;
  onChangeStatus?: (nextStatus: TaskStatus) => void;
  className?: string;
  size?: "sm" | "md";
}

export function TaskSolidStatusBadge({
  status,
  onChangeStatus,
  className,
  size = "md",
}: TaskSolidStatusBadgeProps) {
  const def = getStatusDefinition(status);

  const badgeContent = (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg text-foreground transition-colors select-none font-semibold",
        onChangeStatus && "cursor-pointer hover:bg-accent",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        className
      )}
      title={`Status: ${def.label}`}
    >
      <StatusIcon status={status} className="h-4 w-4 shrink-0" />
      <span className="truncate tracking-wide">{def.label}</span>
    </div>
  );

  if (!onChangeStatus) {
    return badgeContent;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="min-w-0 max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg cursor-pointer">
          {badgeContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-0 bg-transparent border-none shadow-none z-50">
        <StatusDropdownContent
          currentStatus={status}
          onSelectStatus={(next) => onChangeStatus(next)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
