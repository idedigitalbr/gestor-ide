import React, { useMemo, useState } from "react";
import type { CrmProjectMember, Task, ViewMode } from "@gestor-ide/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const dayMs = 86400000;
function dateOf(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function keyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function TaskButton({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  return <button type="button" onClick={() => onOpen(task)} className="block w-full rounded-md border border-border bg-card px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block truncate font-medium">{task.title}</span><span className="text-muted-foreground">{task.status}</span></button>;
}

export function TaskAdditionalView({ mode, tasks, members, onOpen }: { mode: ViewMode; tasks: Task[]; members: CrmProjectMember[]; onOpen: (task: Task) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const undated = tasks.filter((task) => !dateOf(task.dueDate));
  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);
  if (mode === "calendar") return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold capitalize">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoje</Button><Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Anterior</Button><Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Próximo</Button></div></div><p className="text-xs text-muted-foreground">Tarefas exibidas pela data de prazo.</p><div className="overflow-x-auto rounded-lg border border-border"><div className="grid min-w-[700px] grid-cols-7">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => <div key={label} className="border-b border-border bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{label}</div>)}{days.map((day) => <div key={keyOf(day)} className={`min-h-28 space-y-1 border-b border-r border-border p-2 ${day.getMonth() !== month.getMonth() ? "bg-muted/40 text-muted-foreground" : "bg-card"}`}><span className="text-xs font-medium">{day.getDate()}</span>{tasks.filter((task) => task.dueDate?.slice(0, 10) === keyOf(day)).map((task) => <TaskButton key={task.id} task={task} onOpen={onOpen} />)}</div>)}</div></div>{undated.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold">Sem prazo ({undated.length})</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{undated.map((task) => <TaskButton key={task.id} task={task} onOpen={onOpen} />)}</div></section>}</div>;
  if (mode === "gantt") {
    const dated = tasks.filter((task) => dateOf(task.startDate) || dateOf(task.dueDate));
    const timestamps = dated.flatMap((task) => [dateOf(task.startDate)?.getTime(), dateOf(task.dueDate)?.getTime()].filter((n): n is number => n !== undefined));
    const min = Math.min(...timestamps), max = Math.max(...timestamps), span = Math.max(1, Math.round((max - min) / dayMs) + 1);
    return <div className="space-y-4"><div><h2 className="text-base font-semibold">Gantt de tarefas</h2><p className="text-xs text-muted-foreground">Período entre o início e o prazo; tarefas com apenas uma data aparecem nesse dia.</p></div>{dated.length > 0 && <div className="overflow-x-auto rounded-lg border border-border"><div className="min-w-[700px]"><div className="flex justify-between border-b border-border bg-muted px-3 py-2 text-xs text-muted-foreground"><span>{new Date(min).toLocaleDateString("pt-BR")}</span><span>{new Date(max).toLocaleDateString("pt-BR")}</span></div>{dated.map((task) => { const a = dateOf(task.startDate)?.getTime() ?? dateOf(task.dueDate)!.getTime(); const b = dateOf(task.dueDate)?.getTime() ?? a; const left = ((Math.min(a, b) - min) / dayMs / span) * 100; const width = ((Math.abs(b - a) / dayMs + 1) / span) * 100; return <div key={task.id} className="grid grid-cols-[180px_1fr] items-center gap-3 border-b border-border p-3 last:border-0"><button type="button" onClick={() => onOpen(task)} className="truncate text-left text-sm hover:underline">{task.title}</button><div className="relative h-7 rounded bg-muted"><button type="button" onClick={() => onOpen(task)} title={`${task.title}: ${new Date(a).toLocaleDateString("pt-BR")} – ${new Date(b).toLocaleDateString("pt-BR")}`} aria-label={`Abrir ${task.title}`} className="absolute h-full min-w-2 rounded bg-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ left: `${left}%`, width: `${width}%` }} /></div></div>; })}</div></div>}<section className="space-y-2"><h3 className="text-sm font-semibold">Sem datas ({tasks.length - dated.length})</h3>{tasks.filter((task) => !dateOf(task.startDate) && !dateOf(task.dueDate)).map((task) => <TaskButton key={task.id} task={task} onOpen={onOpen} />)}</section></div>;
  }
  const groups = new Map<string, { name: string; tasks: Task[] }>();
  for (const task of tasks) {
    const ids = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
    if (!ids.length) { const group = groups.get("unassigned") ?? { name: "Sem responsável", tasks: [] }; group.tasks.push(task); groups.set("unassigned", group); }
    for (const id of new Set(ids)) { const group = groups.get(id) ?? { name: members.find((member) => member.userId === id)?.user.name || (id === task.assigneeId ? task.assignee : null) || "Responsável", tasks: [] }; group.tasks.push(task); groups.set(id, group); }
  }
  return <div className="space-y-4"><div><h2 className="text-base font-semibold">Carga de trabalho</h2><p className="text-xs text-muted-foreground">Quantidade de tarefas por responsável. Tarefas com vários responsáveis aparecem para cada um.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from(groups.entries()).map(([id, group]) => <section key={id} className="space-y-2 rounded-lg border border-border bg-card p-3"><div className="flex items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold">{group.name}</h3><Badge variant="secondary">{group.tasks.length} {group.tasks.length === 1 ? "tarefa" : "tarefas"}</Badge></div>{group.tasks.map((task) => <TaskButton key={task.id} task={task} onOpen={onOpen} />)}</section>)}</div></div>;
}
