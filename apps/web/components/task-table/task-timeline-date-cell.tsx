"use client";

import React, { useEffect, useState } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { NotionDatePicker } from "@/components/ui/notion-date-picker";
import { formatNotionDate } from "@/lib/notion-date";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";

interface TaskTimelineDateCellProps {
  startDate?: string | null;
  dueDate?: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  onUpdateDates: (dates: { startDate?: string; dueDate?: string }) => void;
  onUpdatePriority?: (priority: TaskPriority) => void;
  className?: string;
}

function formatDateShort(isoDate?: string | null): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const months = [
      "jan", "fev", "mar", "abr", "mai", "jun",
      "jul", "ago", "set", "out", "nov", "dez"
    ];
    const day = d.getUTCDate();
    const month = months[d.getUTCMonth()];
    return `${day} ${month}`;
  } catch {
    return isoDate;
  }
}

export function TaskTimelineDateCell({
  startDate,
  dueDate,
  status,
  priority,
  onUpdateDates,
  onUpdatePriority,
  className,
}: TaskTimelineDateCellProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const normStatus = normalizeTaskStatus(status);
  const isCompleted = normStatus === "CONCLUÍDO";
  const isUrgent = priority === "Urgente" || priority === "Alta";

  // Calcular progresso temporal se houver tanto startDate quanto dueDate
  let hasTimeline = false;
  let elapsedPercent = 0;
  let isOverdue = false;
  let isNearDue = false;

  if (dueDate) {
    const todayStr = new Date(nowMs).toISOString().slice(0, 10);
    const dueDateStr = dueDate.slice(0, 10);
    isOverdue = !isCompleted && dueDateStr < todayStr;

    if (startDate) {
      hasTimeline = true;
      const startMs = new Date(startDate).getTime();
      const dueMs = new Date(dueDate).getTime();
      if (dueMs > startMs) {
        elapsedPercent = Math.max(
          4,
          Math.min(100, Math.round(((nowMs - startMs) / (dueMs - startMs)) * 100))
        );
      } else {
        elapsedPercent = 100;
      }

      const daysLeft = Math.ceil((dueMs - nowMs) / (1000 * 60 * 60 * 24));
      if (!isCompleted && daysLeft <= 2 && daysLeft >= 0) {
        isNearDue = true;
      }
    }
  }

  // Cor da barra de tempo consumido
  let timelineBarColor = "bg-[#3b82f6]"; // Azul sutil padrão
  if (isCompleted) {
    timelineBarColor = "bg-[#10b981]"; // Verde se concluído no prazo
  } else if (isOverdue) {
    timelineBarColor = "bg-[#ef4444]"; // Vermelho se vencido
  } else if (isNearDue || isUrgent) {
    timelineBarColor = "bg-[#f59e0b]"; // Laranja se próximo ou urgente
  }

  // Texto formatado de exibição
  let displayLabel = "";
  if (startDate && dueDate) {
    const sStr = formatDateShort(startDate);
    const dStr = formatDateShort(dueDate);
    displayLabel = sStr === dStr ? sStr : `${sStr} - ${dStr}`;
  } else if (dueDate) {
    displayLabel = formatNotionDate(dueDate) || formatDateShort(dueDate);
  } else if (startDate) {
    displayLabel = formatNotionDate(startDate) || formatDateShort(startDate);
  }

  return (
    <div className={cn("inline-flex items-center max-w-full select-none", className)}>
      <NotionDatePicker
        startDate={startDate || dueDate || null}
        endDate={startDate ? dueDate || null : null}
        allowRange
        priority={priority}
        onPriorityChange={(p) => {
          if (onUpdatePriority) onUpdatePriority(p as TaskPriority);
        }}
        onChange={({ startDate: newStart, endDate: newEnd }) => {
          if (newEnd) {
            onUpdateDates({
              startDate: newStart || undefined,
              dueDate: newEnd || undefined,
            });
          } else {
            onUpdateDates({
              startDate: undefined,
              dueDate: newStart || undefined,
            });
          }
        }}
        renderTrigger={({ open }) => {
          if (!displayLabel) {
            return (
              <button
                type="button"
                onClick={open}
                className="opacity-40 hover:opacity-100 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed border-[#2b2e40] text-[11px] text-muted-foreground hover:text-white transition-opacity cursor-pointer"
                title="Definir data / prazo"
              >
                <Calendar className="w-3 h-3 text-muted-foreground/60" />
                <span>+ Prazo</span>
              </button>
            );
          }

          return (
            <button
              type="button"
              onClick={open}
              className={cn(
                "group/datepill relative h-[25px] rounded-full border overflow-hidden inline-flex items-center px-2.5 text-[11px] font-medium transition-all cursor-pointer max-w-full",
                isOverdue
                  ? "border-[#ef4444]/60 bg-[#1e1315] text-[#fca5a5] hover:border-[#ef4444]"
                  : "border-[#252838] bg-[#12141f] text-[#d6d9ea] hover:border-[#3b82f6]"
              )}
              title={
                hasTimeline
                  ? `Tempo decorrido: ${elapsedPercent}% (${displayLabel})`
                  : displayLabel
              }
            >
              {/* Barra de tempo consumido como fundo decorativo do pill */}
              {hasTimeline && (
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 rounded-l-full transition-all duration-300 opacity-75",
                    timelineBarColor
                  )}
                  style={{ width: `${elapsedPercent}%` }}
                />
              )}

              {/* Conteúdo textual sobreposto */}
              <div className="relative z-10 flex items-center gap-1.5 truncate">
                {isOverdue ? (
                  <span className="text-[#ef4444] font-bold text-xs shrink-0 leading-none">
                    !
                  </span>
                ) : (
                  <Calendar className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                )}
                <span className="truncate">{displayLabel}</span>
              </div>
            </button>
          );
        }}
      />
    </div>
  );
}
