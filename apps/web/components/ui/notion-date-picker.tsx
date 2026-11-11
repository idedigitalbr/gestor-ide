"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  formatMonthYearPtBr,
  formatNotionDate,
  parseIsoOrDateString,
  toIsoDateString,
  toPtBrDisplayDate,
} from "@/lib/notion-date";

export function isUrgentPriority(priority?: string | null): boolean {
  if (!priority) return false;
  const p = priority.toLowerCase().trim();
  return (
    p === "urgent" ||
    p === "urgente" ||
    p === "high" ||
    p === "alta" ||
    p.includes("urgent") ||
    p.includes("alta")
  );
}

export interface NotionDateRangeValue {
  startDate: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface NotionDatePickerProps {
  startDate: string | null | undefined;
  endDate?: string | null | undefined;
  startTime?: string | null | undefined;
  endTime?: string | null | undefined;
  priority?: string | null | undefined;
  onPriorityChange?: (priority: string) => void | Promise<void>;
  allowRange?: boolean;
  disabled?: boolean;
  placeholder?: string;
  align?: "start" | "center" | "end";
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
  onChange: (value: NotionDateRangeValue) => void | Promise<void>;
  renderTrigger?: (props: {
    formatted: string;
    isOpen: boolean;
    hasDate: boolean;
    isUrgent: boolean;
    open: () => void;
  }) => React.ReactNode;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

interface CalendarDay {
  date: Date;
  iso: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function generateCalendarMonth(year: number, month: number): CalendarDay[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = [];
  const today = new Date();
  const todayIso = toIsoDateString(today);

  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDate - i);
    const iso = toIsoDateString(d);
    days.push({
      date: d,
      iso,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: iso === todayIso,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const iso = toIsoDateString(d);
    days.push({
      date: d,
      iso,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: iso === todayIso,
    });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const iso = toIsoDateString(d);
    days.push({
      date: d,
      iso,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: iso === todayIso,
    });
  }

  return days;
}

export function NotionDatePicker({
  startDate,
  endDate,
  startTime: initialStartTime,
  endTime: initialEndTime,
  priority,
  onPriorityChange,
  allowRange = true,
  disabled = false,
  placeholder = "Adicionar data",
  align = "start",
  className,
  triggerClassName,
  ariaLabel,
  onChange,
  renderTrigger,
}: NotionDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const parsedStart = useMemo(() => parseIsoOrDateString(startDate), [startDate]);
  const parsedEnd = useMemo(() => parseIsoOrDateString(endDate), [endDate]);

  const [internalPriority, setInternalPriority] = useState<string>("Normal");
  const isUrgent = isUrgentPriority(priority ?? internalPriority);

  const handleSelectPriority = (selected: "urgent" | "normal") => {
    if (selected === "urgent") {
      const nextVal = isUrgent ? "Normal" : "Urgente";
      setInternalPriority(nextVal);
      if (onPriorityChange) {
        void onPriorityChange(nextVal);
      }
    } else {
      setInternalPriority("Normal");
      if (onPriorityChange) {
        void onPriorityChange("Normal");
      }
    }
  };

  const [hasEndDate, setHasEndDate] = useState<boolean>(Boolean(endDate && endDate !== startDate));
  const [includeTime, setIncludeTime] = useState<boolean>(Boolean(initialStartTime || initialEndTime));
  const [timeStart, setTimeStart] = useState<string>(initialStartTime ?? "09:00");
  const [timeEnd, setTimeEnd] = useState<string>(initialEndTime ?? "18:00");

  const [viewDate, setViewDate] = useState<Date>(() => parsedStart || new Date());
  const [tempStart, setTempStart] = useState<Date | null>(parsedStart);
  const [tempEnd, setTempEnd] = useState<Date | null>(parsedEnd);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const [manualDraft, setManualDraft] = useState<string | null>(null);
  const manualInput = manualDraft ?? (tempStart
    ? tempEnd && hasEndDate
      ? `${toPtBrDisplayDate(tempStart)} → ${toPtBrDisplayDate(tempEnd)}`
      : toPtBrDisplayDate(tempStart)
    : "");

  const openPicker = () => {
    if (disabled) return;
    setTempStart(parsedStart);
    setTempEnd(parsedEnd);
    setHasEndDate(Boolean(parsedEnd && parsedStart && parsedEnd.getTime() !== parsedStart.getTime()));
    if (parsedStart) setViewDate(parsedStart);
    setManualDraft(null);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const calendarDays = useMemo(
    () => generateCalendarMonth(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setViewDate(today);
    applySelection(today, hasEndDate ? tempEnd : null);
  };

  const applySelection = (start: Date | null, end: Date | null) => {
    setManualDraft(null);
    setTempStart(start);
    setTempEnd(end);

    const startIso = start ? toIsoDateString(start) : null;
    const endIso = end ? toIsoDateString(end) : null;

    void onChange({
      startDate: startIso,
      endDate: endIso,
      startTime: includeTime ? timeStart : null,
      endTime: includeTime && hasEndDate ? timeEnd : null,
    });
  };

  const handleDayClick = (dayDate: Date) => {
    setManualDraft(null);
    if (!hasEndDate) {
      applySelection(dayDate, null);
      return;
    }

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dayDate);
      setTempEnd(null);
    } else {
      if (dayDate.getTime() < tempStart.getTime()) {
        setTempStart(dayDate);
        setTempEnd(null);
      } else {
        applySelection(tempStart, dayDate);
        setIsOpen(false);
      }
    }
  };

  const handleToggleRange = (enabled: boolean) => {
    setManualDraft(null);
    setHasEndDate(enabled);
    if (!enabled && tempStart) {
      applySelection(tempStart, null);
    }
  };

  const handleClear = () => {
    setManualDraft(null);
    setTempStart(null);
    setTempEnd(null);
    void onChange({
      startDate: null,
      endDate: null,
      startTime: null,
      endTime: null,
    });
    setIsOpen(false);
  };

  const handleManualInputCommit = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) {
      handleClear();
      return;
    }

    if (trimmed.includes("→") || trimmed.includes(" - ")) {
      const parts = trimmed.split(/→|-/);
      const s = parseIsoOrDateString(parts[0]);
      const e = parseIsoOrDateString(parts[1]);
      if (s) {
        setHasEndDate(Boolean(e));
        applySelection(s, e);
      }
    } else {
      const s = parseIsoOrDateString(trimmed);
      if (s) {
        applySelection(s, hasEndDate ? tempEnd : null);
      }
    }
  };

  const formattedDisplay = useMemo(
    () =>
      formatNotionDate(
        startDate,
        hasEndDate && endDate ? endDate : null,
        {
          includeTime,
          startTime: initialStartTime ?? undefined,
          endTime: initialEndTime ?? undefined,
        }
      ),
    [startDate, endDate, hasEndDate, includeTime, initialStartTime, initialEndTime]
  );

  const hasDate = Boolean(startDate);

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      {renderTrigger ? (
        renderTrigger({
          formatted: formattedDisplay,
          isOpen,
          hasDate,
          isUrgent,
          open: openPicker,
        })
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => isOpen ? setIsOpen(false) : openPicker()}
          aria-label={
            ariaLabel ||
            (hasDate
              ? `Data: ${formattedDisplay}${isUrgent ? " (Urgente)" : ""}`
              : isUrgent
              ? `${placeholder} (Urgente)`
              : placeholder)
          }
          title={
            hasDate
              ? `${formattedDisplay}${isUrgent ? " — Urgente" : ""}`
              : isUrgent
              ? "Urgente"
              : placeholder
          }
          className={cn(
            "group/date inline-flex min-h-[28px] items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-foreground transition-all hover:bg-secondary cursor-pointer",
            !hasDate && "text-muted-foreground/50 hover:text-foreground",
            isOpen && "bg-secondary ring-1 ring-primary/30",
            triggerClassName
          )}
        >
          {hasDate ? (
            <>
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover/date:text-primary transition-colors" />
              {isUrgent && (
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/15 border border-rose-500/40 text-[10px] font-black text-rose-500 shadow-xs"
                  title="Urgente / Alta prioridade"
                  aria-label="Urgente"
                >
                  !
                </span>
              )}
              <span className="truncate">{formattedDisplay}</span>
            </>
          ) : (
            <>
              <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover/date:text-primary transition-colors" />
              {isUrgent && (
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-500/15 border border-rose-500/40 text-[10px] font-black text-rose-500 shadow-xs"
                  title="Urgente / Alta prioridade"
                  aria-label="Urgente"
                >
                  !
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/60">{placeholder}</span>
            </>
          )}
        </button>
      )}

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Seletor de datas"
          className={cn(
            "absolute z-50 mt-1 w-[280px] sm:w-[290px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-3 outline-none",
            align === "end" && "right-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "start" && "left-0"
          )}
        >
          {/* Top input bar */}
          <div className="mb-2.5">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualDraft(e.target.value)}
              onBlur={handleManualInputCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleManualInputCommit();
                }
              }}
              placeholder="DD/MM/AAAA"
              className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Month & Year header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold capitalize text-foreground">
              {formatMonthYearPtBr(viewDate)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleGoToday}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1 text-center text-[10px] font-semibold text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
            {calendarDays.map((cell) => {
              const cellTime = cell.date.getTime();
              const startTime = tempStart ? tempStart.getTime() : null;
              const endTime = tempEnd ? tempEnd.getTime() : null;
              const hoverTime = hoverDate ? hoverDate.getTime() : null;

              const isStart = Boolean(startTime && cellTime === startTime);
              const isEnd = Boolean(endTime && cellTime === endTime);

              let isInRange = false;
              if (startTime && endTime) {
                isInRange = cellTime > startTime && cellTime < endTime;
              } else if (startTime && !endTime && hoverTime && hoverTime > startTime) {
                isInRange = cellTime > startTime && cellTime <= hoverTime;
              }

              const isSelected = isStart || isEnd;

              return (
                <div
                  key={cell.iso}
                  onMouseEnter={() => {
                    if (hasEndDate && tempStart && !tempEnd) {
                      setHoverDate(cell.date);
                    }
                  }}
                  className={cn(
                    "relative py-0.5",
                    isInRange && "bg-primary/20",
                    isStart && hasEndDate && (tempEnd || hoverTime) && "rounded-l-lg bg-primary/20",
                    isEnd && "rounded-r-lg bg-primary/20"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(cell.date)}
                    className={cn(
                      "h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-colors select-none cursor-pointer",
                      !cell.isCurrentMonth && "text-muted-foreground/35",
                      cell.isCurrentMonth && !isSelected && "text-foreground hover:bg-secondary",
                      cell.isToday && !isSelected && "bg-rose-500/20 text-rose-500 font-bold",
                      isSelected && "bg-primary text-primary-foreground font-semibold shadow-xs"
                    )}
                  >
                    {cell.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Toggles */}
          <div className="mt-2.5 pt-2.5 border-t border-border space-y-2">
            {onPriorityChange && (
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-medium text-foreground">Prioridade</span>
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPriority("normal")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all select-none cursor-pointer",
                      !isUrgent
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPriority("urgent")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all select-none cursor-pointer",
                      isUrgent
                        ? "bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[10px] font-black",
                        isUrgent
                          ? "bg-rose-500/25 text-rose-500"
                          : "text-muted-foreground"
                      )}
                    >
                      !
                    </span>
                    <span>Urgente</span>
                  </button>
                </div>
              </div>
            )}

            {allowRange && (
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-medium text-foreground">Data de término</span>
                <Switch
                  checked={hasEndDate}
                  onCheckedChange={handleToggleRange}
                  aria-label="Ativar data de término"
                />
              </div>
            )}

            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-foreground">Incluir hora</span>
              <Switch
                checked={includeTime}
                onCheckedChange={(checked) => {
                  setIncludeTime(checked);
                  void onChange({
                    startDate: tempStart ? toIsoDateString(tempStart) : null,
                    endDate: tempEnd && hasEndDate ? toIsoDateString(tempEnd) : null,
                    startTime: checked ? timeStart : null,
                    endTime: checked && hasEndDate ? timeEnd : null,
                  });
                }}
                aria-label="Incluir horário"
              />
            </div>

            {includeTime && (
              <div className="flex items-center gap-2 px-1 pt-1">
                <div className="flex-1">
                  <span className="block text-[10px] text-muted-foreground mb-0.5">Início</span>
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => {
                      setTimeStart(e.target.value);
                      void onChange({
                        startDate: tempStart ? toIsoDateString(tempStart) : null,
                        endDate: tempEnd && hasEndDate ? toIsoDateString(tempEnd) : null,
                        startTime: e.target.value,
                        endTime: hasEndDate ? timeEnd : null,
                      });
                    }}
                    className="h-7 w-full rounded border border-border bg-card px-1.5 text-xs text-foreground"
                  />
                </div>
                {hasEndDate && (
                  <div className="flex-1">
                    <span className="block text-[10px] text-muted-foreground mb-0.5">Fim</span>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => {
                        setTimeEnd(e.target.value);
                        void onChange({
                          startDate: tempStart ? toIsoDateString(tempStart) : null,
                          endDate: tempEnd && hasEndDate ? toIsoDateString(tempEnd) : null,
                          startTime: timeStart,
                          endTime: e.target.value,
                        });
                      }}
                      className="h-7 w-full rounded border border-border bg-card px-1.5 text-xs text-foreground"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
