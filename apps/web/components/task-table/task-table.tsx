"use client";

import React, { useState, useMemo } from "react";
import type { CrmProjectMember } from "@gestor-ide/core";
import type {
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
  CanonicalTaskStatus,
  TaskGroupBy,
  GroupOrder,
} from "@/types/task";
import { normalizeTaskStatus, normalizeTaskPriority } from "@/types/task";
import {
  StatusIcon,
  StatusDropdownContent,
  getStatusDefinition,
  ALL_CANONICAL_STATUSES,
} from "../task-status-icon";
import {
  PriorityIcon,
  ALL_CANONICAL_PRIORITIES,
} from "../task-priority-icon";
import { TaskItemTypeSelector } from "../task-item-type-selector";
import {
  isTaskContentFilled,
  getItemTypeDefinition,
  getAllowedGroupTypes,
  normalizeItemType,
  type ProjectTaskItemType,
} from "@/lib/task-item-type";
import {
  ArrowUpFromLine,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FolderTree,
  GripVertical,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import {
  canReparentTask,
  type TaskDropMode,
} from "@/lib/task-hierarchy";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ColumnHeaderCell, type SortDirection } from "./column-header-cell";
import {
  FieldsModal,
  type CustomColumnDefinition,
} from "./fields-modal";
import { TaskSegmentedProgress } from "./task-segmented-progress";
import { TaskSolidStatusBadge } from "./task-solid-status-badge";
import { TaskTimelineDateCell } from "./task-timeline-date-cell";
import { TaskAssigneeCell } from "./task-assignee-cell";
import { CreateGroupPopover } from "./create-group-popover";
import { getLocalFreeGroups, setLocalFreeGroups } from "@/lib/gestor-cache";

function CollapsibleSection({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      inert={!open ? true : undefined}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        open
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0 pointer-events-none"
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onAddTask: (
    taskData: Omit<Task, "id" | "createdAt" | "code"> & { code?: string }
  ) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onReorderTasks?: (
    draggedTaskId: string,
    targetTaskId: string | null,
    targetStatus: TaskStatus,
    options?: { mode?: TaskDropMode; customGroup?: string }
  ) => void;
  groupBy?: TaskGroupBy;
  groupOrder?: GroupOrder;
  isFieldsModalOpen?: boolean;
  onOpenFieldsModal?: () => void;
  onCloseFieldsModal?: () => void;
  subtaskMode?: "collapsed" | "expanded" | "separate";
  showClosedSubtasks?: boolean;
  projectId?: string | null;
  projectMembers?: CrmProjectMember[];
  membersLoaded?: boolean;
}

const TABLE_GROUPS: CanonicalTaskStatus[] = ALL_CANONICAL_STATUSES;
const PRIORITIES: TaskPriority[] = ALL_CANONICAL_PRIORITIES;

const PRESET_TAGS = [
  "geral",
  "feature",
  "bug",
  "ui",
  "backend",
  "melhoria",
  "urgente",
];

interface TableColumnConfig {
  id: string;
  label: string;
  isCustom?: boolean;
}

// Ordem principal especificada: TAREFA | STATUS | DATA | RESPONSÁVEL | ...
const DEFAULT_COLUMNS: TableColumnConfig[] = [
  { id: "status", label: "Status" },
  { id: "dueDate", label: "Data" },
  { id: "assignee", label: "Responsável" },
];

function getDueDateBucket(dueDate?: string): string {
  if (!dueDate) return "Sem data";
  const todayStr = new Date().toISOString().slice(0, 10);
  const taskDate = dueDate.slice(0, 10);
  if (taskDate < todayStr) return "Atrasadas";
  if (taskDate === todayStr) return "Hoje";
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (taskDate === tomorrowStr) return "Amanhã";
  const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  if (taskDate <= inSevenDays) return "Esta semana";
  return "Próximas";
}

function getTaskTypeCategory(task: Task): string {
  if (task.subtasks && task.subtasks.length > 0) return "Com subtarefas";
  return "Tarefa simples";
}

export function TaskTable({
  tasks,
  onUpdateTask,
  onChangeAssignee,
  onDeleteTask,
  onOpenDetails,
  onAddTask,
  onUpdateSubtasks,
  onReorderTasks,
  groupBy = "none",
  groupOrder = "asc",
  isFieldsModalOpen: externalFieldsModalOpen,
  onOpenFieldsModal,
  onCloseFieldsModal,
  subtaskMode = "collapsed",
  showClosedSubtasks = true,
  projectId,
  projectMembers = [],
  membersLoaded = false,
}: TaskTableProps) {
  // Controle de colunas e ordenação rápida
  const [columns, setColumns] = useState<TableColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalFieldsModalOpen, setInternalFieldsModalOpen] = useState(false);
  const isFieldsModalOpen =
    externalFieldsModalOpen !== undefined
      ? externalFieldsModalOpen
      : internalFieldsModalOpen;

  function handleOpenFieldsModal() {
    if (onOpenFieldsModal) onOpenFieldsModal();
    else setInternalFieldsModalOpen(true);
  }

  function handleCloseFieldsModal() {
    if (onCloseFieldsModal) onCloseFieldsModal();
    else setInternalFieldsModalOpen(false);
  }

  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(
    () => new Set()
  );

  // Lista dinâmica de grupos livres criados pelo usuário
  const [customFreeGroups, setCustomFreeGroups] = useState<string[]>(() => projectId ? getLocalFreeGroups(projectId) : []);

  function handleSortToggle(columnId: string) {
    if (sortColumn !== columnId) {
      setSortColumn(columnId);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  }

  function handleSetSort(columnId: string, direction: "asc" | "desc" | null) {
    setSortColumn(direction ? columnId : null);
    setSortDirection(direction);
  }

  function handleMoveColumn(columnId: string, targetIndex: number) {
    setColumns((prev) => {
      const currentIndex = prev.findIndex((c) => c.id === columnId);
      if (currentIndex === -1) return prev;
      const item = prev[currentIndex];
      const next = [...prev];
      next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function handleMoveToStart(columnId: string) {
    handleMoveColumn(columnId, 0);
  }

  function handleMoveToEnd(columnId: string) {
    setColumns((prev) => {
      const currentIndex = prev.findIndex((c) => c.id === columnId);
      if (currentIndex === -1) return prev;
      const item = prev[currentIndex];
      const next = [...prev];
      next.splice(currentIndex, 1);
      next.push(item);
      return next;
    });
  }

  function handleHideColumn(columnId: string) {
    setHiddenColumnIds((prev) => {
      const next = new Set(prev);
      next.add(columnId);
      return next;
    });
  }

  function handleAddExistingColumn(columnId: string) {
    setHiddenColumnIds((prev) => {
      const next = new Set(prev);
      next.delete(columnId);
      return next;
    });
  }

  function handleCreateCustomColumn(newCol: CustomColumnDefinition) {
    setColumns((prev) => [
      ...prev,
      { id: newCol.id, label: newCol.label, isCustom: true },
    ]);
  }

  function sortTasksList(list: Task[]): Task[] {
    if (!sortColumn || !sortDirection) return list;
    return [...list].sort((a, b) => {
      let valA = "";
      let valB = "";
      if (sortColumn === "title") {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortColumn === "dueDate") {
        valA = a.dueDate || "";
        valB = b.dueDate || "";
      } else if (sortColumn === "status") {
        valA = a.status;
        valB = b.status;
      } else if (sortColumn === "assignee") {
        valA = a.assignee || "";
        valB = b.assignee || "";
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  // Grupos e tarefas expandidas
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Multi-seleção de linhas e confirmação de exclusão
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteState, setConfirmDeleteState] = useState<
    | { mode: "single"; task: Task }
    | { mode: "bulk"; count: number }
    | null
  >(null);

  // Drag & drop inline
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<{
    taskId: string;
    mode: "before" | "nest";
  } | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  // Edição inline de título de tarefa
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Criação inline de tarefa em grupo
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("Normal");
  const [quickDueDate, setQuickDueDate] = useState<string>("");
  const [quickTag, setQuickTag] = useState<string>("geral");

  // Criação e edição inline de subtarefas / checklists
  const [addingSubtaskForId, setAddingSubtaskForId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  function toggleExpandTask(taskId: string) {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  function toggleSelectTask(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSelectGroup(groupTasks: Task[]) {
    const allSelected =
      groupTasks.length > 0 && groupTasks.every((t) => selectedIds.has(t.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const t of groupTasks) {
        if (allSelected) {
          next.delete(t.id);
        } else {
          next.add(t.id);
        }
      }
      return next;
    });
  }

  function handleStartEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }

  function handleSaveInlineTitle(task: Task) {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTask({ ...task, title: trimmed });
    }
    setEditingTaskId(null);
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDragOverState(null);
    setDragOverGroup(null);
  }

  function handleDragOverRow(e: React.DragEvent, targetTask: Task) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTaskId || draggedTaskId === targetTask.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const nextMode: "before" | "nest" =
      relY >= rect.height * 0.42 &&
      canReparentTask(tasks, draggedTaskId, targetTask.id)
        ? "nest"
        : "before";
    setDragOverGroup(null);
    setDragOverState((prev) =>
      prev?.taskId === targetTask.id && prev.mode === nextMode
        ? prev
        : { taskId: targetTask.id, mode: nextMode }
    );
  }

  function handleDropOnRow(
    e: React.DragEvent,
    targetTask: Task,
    targetStatus: TaskStatus
  ) {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedTaskId || e.dataTransfer.getData("text/plain");
    const dropMode =
      dragOverState?.taskId === targetTask.id ? dragOverState.mode : "before";
    setDraggedTaskId(null);
    setDragOverState(null);
    setDragOverGroup(null);

    if (!sourceId || sourceId === targetTask.id) return;

    if (dropMode === "nest") {
      setExpandedTasks((prev) => ({ ...prev, [targetTask.id]: true }));
    }

    if (onReorderTasks) {
      onReorderTasks(sourceId, targetTask.id, targetStatus, { mode: dropMode });
    } else {
      const sourceTask = tasks.find((t) => t.id === sourceId);
      if (
        sourceTask &&
        normalizeTaskStatus(sourceTask.status) !== normalizeTaskStatus(targetStatus)
      ) {
        onUpdateTask({ ...sourceTask, status: normalizeTaskStatus(targetStatus) });
      }
    }
  }

  function handleDropOnGroup(
    e: React.DragEvent,
    targetStatus: TaskStatus,
    customGroup?: string
  ) {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedTaskId || e.dataTransfer.getData("text/plain");
    setDraggedTaskId(null);
    setDragOverState(null);
    setDragOverGroup(null);

    if (!sourceId) return;

    if (onReorderTasks) {
      onReorderTasks(sourceId, null, targetStatus, {
        mode: "root",
        customGroup,
      });
    } else {
      const sourceTask = tasks.find((t) => t.id === sourceId);
      if (
        sourceTask &&
        normalizeTaskStatus(sourceTask.status) !== normalizeTaskStatus(targetStatus)
      ) {
        onUpdateTask({ ...sourceTask, status: normalizeTaskStatus(targetStatus) });
      }
    }
  }

  function openQuickAdd(groupId: string) {
    setCollapsedGroups((prev) =>
      prev[groupId] ? { ...prev, [groupId]: false } : prev
    );
    setAddingInGroup(groupId);
    setQuickTitle("");
    setQuickPriority("Normal");
    setQuickDueDate("");
    setQuickTag("geral");
  }

  function handleSaveQuickAdd(e: React.FormEvent, status: TaskStatus, customGroup?: string) {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;

    onAddTask({
      title: trimmed,
      status,
      priority: quickPriority,
      dueDate: quickDueDate || undefined,
      tag: quickTag,
      description: "",
      itemType: "TASK",
      customGroup,
    });

    setAddingInGroup(null);
    setQuickTitle("");
  }

  // Operações em lote (Bulk actions)
  function handleBulkStatusChange(status: TaskStatus) {
    for (const id of selectedIds) {
      const t = tasks.find((item) => item.id === id);
      if (t) onUpdateTask({ ...t, status });
    }
    setSelectedIds(new Set());
  }

  function handleBulkPriorityChange(priority: TaskPriority) {
    for (const id of selectedIds) {
      const t = tasks.find((item) => item.id === id);
      if (t) onUpdateTask({ ...t, priority });
    }
    setSelectedIds(new Set());
  }

  function handleBulkTagChange(tag: string) {
    for (const id of selectedIds) {
      const task = tasks.find((item) => item.id === id);
      if (task) {
        const tags = Array.from(new Set([...(task.tags ?? (task.tag ? [task.tag] : [])), tag]));
        onUpdateTask({ ...task, tag: tags[0], tags });
      }
    }
    setSelectedIds(new Set());
  }

  function handleBulkRemoveTag(tagToRemove: string) {
    for (const id of selectedIds) {
      const task = tasks.find((item) => item.id === id);
      if (task) {
        const currentTags = task.tags ?? (task.tag ? [task.tag] : []);
        const nextTags = currentTags.filter((item) => item !== tagToRemove);
        if (nextTags.length !== currentTags.length) {
          onUpdateTask({ ...task, tag: nextTags[0], tags: nextTags });
        }
      }
    }
    setSelectedIds(new Set());
  }

  async function handleBulkAssigneeChange(member: CrmProjectMember | null) {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    for (const id of ids) {
      if (onChangeAssignee && !id.startsWith("task-")) {
        await onChangeAssignee(id, member);
      } else {
        const task = tasks.find((item) => item.id === id);
        if (task) {
          onUpdateTask({
            ...task,
            assigneeId: member?.userId,
            assigneeIds: member ? [member.userId] : [],
            assignee: member?.user.name || member?.user.email || undefined,
            assigneeAvatar: member?.user.avatarUrl || undefined,
          });
        }
      }
    }
  }

  function handleBulkReparent(parentTaskId: string | undefined) {
    for (const id of selectedIds) {
      const task = tasks.find((item) => item.id === id);
      if (!task) continue;
      if (!canReparentTask(tasks, id, parentTaskId)) continue;
      if ((task.parentTaskId ?? undefined) === parentTaskId) continue;
      onUpdateTask({
        ...task,
        parentTaskId,
        ...(parentTaskId ? { customGroup: undefined } : {}),
      });
    }
    if (parentTaskId) {
      setExpandedTasks((prev) => ({ ...prev, [parentTaskId]: true }));
    }
    setSelectedIds(new Set());
  }

  const selectedAssignedTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const id of selectedIds) {
      const task = tasks.find((item) => item.id === id);
      if (!task) continue;
      for (const t of task.tags ?? (task.tag ? [task.tag] : [])) {
        if (t.trim()) tagSet.add(t.trim());
      }
    }
    return Array.from(tagSet).sort();
  }, [selectedIds, tasks]);

  const hasSelectedChildTasks = useMemo(
    () =>
      Array.from(selectedIds).some((id) =>
        Boolean(tasks.find((item) => item.id === id)?.parentTaskId)
      ),
    [selectedIds, tasks]
  );

  const eligibleBulkParents = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const selectedArray = Array.from(selectedIds);
    return tasks.filter(
      (candidate) =>
        !selectedIds.has(candidate.id) &&
        selectedArray.some((id) => canReparentTask(tasks, id, candidate.id))
    );
  }, [selectedIds, tasks]);

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setConfirmDeleteState({ mode: "bulk", count: selectedIds.size });
  }

  function handleConfirmDeleteAction() {
    if (!confirmDeleteState) return;
    if (confirmDeleteState.mode === "bulk") {
      for (const id of selectedIds) {
        onDeleteTask(id);
      }
      setSelectedIds(new Set());
    } else {
      onDeleteTask(confirmDeleteState.task.id);
    }
    setConfirmDeleteState(null);
  }

  // Subtarefas e Checklists Inline
  function handleOpenAddSubtask(task: Task) {
    setExpandedTasks((prev) => ({ ...prev, [task.id]: true }));
    setAddingSubtaskForId(task.id);
    setNewSubtaskTitle("");
  }

  function handleSaveNewSubtask(e: React.FormEvent, task: Task) {
    e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    const current = task.subtasks ?? [];
    const newItem: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: trimmed,
      completed: false,
    };
    const next = [...current, newItem];

    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }

    setNewSubtaskTitle("");
  }

  function handleToggleSubtask(task: Task, subtaskId: string) {
    const current = task.subtasks ?? [];
    const next = current.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleSaveSubtaskTitle(task: Task, subtaskId: string) {
    const trimmed = editingSubtaskTitle.trim();
    setEditingSubtaskKey(null);
    if (!trimmed) return;

    const current = task.subtasks ?? [];
    const next = current.map((s) =>
      s.id === subtaskId ? { ...s, title: trimmed } : s
    );
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleDeleteSubtask(task: Task, subtaskId: string) {
    const current = task.subtasks ?? [];
    const next = current.filter(
      (s) => s.id !== subtaskId && s.parentId !== subtaskId
    );
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleUpdateSubtaskMeta(
    task: Task,
    subtaskId: string,
    updates: Partial<Subtask>
  ) {
    const current = task.subtasks ?? [];
    const next = current.map((s) =>
      s.id === subtaskId ? { ...s, ...updates } : s
    );
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleAddChildSubtask(task: Task, parentSubtaskId: string) {
    const current = task.subtasks ?? [];
    const newChild: Subtask = {
      id: `st-child-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: "Novo sub-item",
      completed: false,
      parentId: parentSubtaskId,
    };
    const next = [...current, newChild];
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
    setEditingSubtaskKey(`${task.id}:${newChild.id}`);
    setEditingSubtaskTitle(newChild.title);
  }

  function handleDeleteWithConfirm(task: Task) {
    setConfirmDeleteState({ mode: "single", task });
  }

  // ---------------------------------------------------------------------------
  // Agrupamentos Dinâmicos (quando groupBy !== "none")
  // ---------------------------------------------------------------------------
  interface GroupDefinition {
    id: string;
    label: string;
    icon: React.ReactNode;
    tasks: Task[];
    defaultStatus: TaskStatus;
    color?: string;
  }

  const computedGroups = useMemo<GroupDefinition[]>(() => {
    if (groupBy === "none") return [];

    let groups: GroupDefinition[] = [];

    if (groupBy === "status") {
      groups = TABLE_GROUPS.map((status) => {
        const def = getStatusDefinition(status);
        return {
          id: status,
          label: def.label,
          icon: <StatusIcon status={status} />,
          tasks: tasks.filter((t) => normalizeTaskStatus(t.status) === status),
          defaultStatus: status,
          color: def.color,
        };
      });
    } else if (groupBy === "assignee") {
      const assigneeSet = new Set<string>();
      let hasUnassigned = false;
      for (const t of tasks) {
        if (t.assignee?.trim()) {
          assigneeSet.add(t.assignee.trim());
        } else {
          hasUnassigned = true;
        }
      }
      const sortedAssignees = Array.from(assigneeSet).sort();
      if (hasUnassigned) sortedAssignees.push("Sem responsável");

      groups = sortedAssignees.map((assignee) => ({
        id: assignee,
        label: assignee,
        icon: <User className="w-3.5 h-3.5 text-primary" />,
        tasks: tasks.filter((t) =>
          assignee === "Sem responsável"
            ? !t.assignee || !t.assignee.trim()
            : t.assignee === assignee
        ),
        defaultStatus: "PENDENTE",
        color: "#3b82f6",
      }));
    } else if (groupBy === "priority") {
      groups = PRIORITIES.map((priority) => ({
        id: priority,
        label: priority,
        icon: <PriorityIcon priority={priority} />,
        tasks: tasks.filter(
          (t) =>
            normalizeTaskPriority(t.priority) ===
            normalizeTaskPriority(priority)
        ),
        defaultStatus: "PENDENTE",
        color:
          priority === "Urgente"
            ? "#ef4444"
            : priority === "Alta"
            ? "#f97316"
            : "#3b82f6",
      }));
    } else if (groupBy === "tag") {
      const tagSet = new Set<string>();
      let hasUntagged = false;
      for (const t of tasks) {
        if (t.tag?.trim()) {
          tagSet.add(t.tag.trim());
        } else if (t.tags && t.tags.length > 0) {
          tagSet.add(t.tags[0]!.trim());
        } else {
          hasUntagged = true;
        }
      }
      const sortedTags = Array.from(tagSet).sort();
      if (hasUntagged) sortedTags.push("Sem etiqueta");

      groups = sortedTags.map((tag) => ({
        id: tag,
        label: tag === "Sem etiqueta" ? tag : `#${tag}`,
        icon: <Tag className="w-3.5 h-3.5 text-primary" />,
        tasks: tasks.filter((t) => {
          if (tag === "Sem etiqueta") {
            return (!t.tag || !t.tag.trim()) && (!t.tags || t.tags.length === 0);
          }
          return t.tag === tag || (t.tags && t.tags.includes(tag));
        }),
        defaultStatus: "PENDENTE",
        color: "#8b5cf6",
      }));
    } else if (groupBy === "dueDate") {
      const buckets = [
        "Atrasadas",
        "Hoje",
        "Amanhã",
        "Esta semana",
        "Próximas",
        "Sem data",
      ];
      groups = buckets.map((bucket) => ({
        id: bucket,
        label: bucket,
        icon: <Calendar className="w-3.5 h-3.5 text-primary" />,
        tasks: tasks.filter((t) => getDueDateBucket(t.dueDate) === bucket),
        defaultStatus: "PENDENTE",
        color: bucket === "Atrasadas" ? "#ef4444" : "#3b82f6",
      }));
    } else if (groupBy === "taskType") {
      const types = ["Com subtarefas", "Tarefa simples"];
      groups = types.map((type) => ({
        id: type,
        label: type,
        icon: <Package className="w-3.5 h-3.5 text-primary" />,
        tasks: tasks.filter((t) => getTaskTypeCategory(t) === type),
        defaultStatus: "PENDENTE",
        color: "#06b6d4",
      }));
    }

    if (groupOrder === "desc") {
      return [...groups].reverse();
    }
    return groups;
  }, [groupBy, groupOrder, tasks]);

  // ---------------------------------------------------------------------------
  // Estrutura Natural de Grupos Livres e Especiais (quando groupBy === "none")
  // ---------------------------------------------------------------------------
  const naturalGroups = useMemo(() => {
    if (groupBy !== "none") return null;

    // Tarefas raízes (sem parentTaskId)
    const rootTasks = tasks.filter((t) => !t.parentTaskId);

    // Mapear grupos livres existentes nos dados ou criados pelo usuário
    const freeGroupNames = new Set<string>(customFreeGroups);
    for (const t of tasks) {
      if (t.customGroup?.trim()) {
        freeGroupNames.add(t.customGroup.trim());
      }
    }

    // Identificar grupos especiais: tarefas raiz que possuem itemType especial ou filhos
    const specialRootTasks: Task[] = [];
    const regularRootTasks: Task[] = [];

    for (const t of rootTasks) {
      if (t.customGroup && freeGroupNames.has(t.customGroup)) {
        continue;
      }
      const hasChildren = tasks.some((ch) => ch.parentTaskId === t.id);
      const isSpecialType =
        Boolean(t.itemType) && t.itemType !== "TASK";

      if (isSpecialType || hasChildren) {
        specialRootTasks.push(t);
      } else {
        regularRootTasks.push(t);
      }
    }

    const freeGroupsList = Array.from(freeGroupNames).map((name) => ({
      name,
      tasks: tasks.filter((t) => t.customGroup === name && !t.parentTaskId),
    }));

    return {
      specialRootTasks,
      freeGroups: freeGroupsList,
      regularRootTasks,
    };
  }, [groupBy, tasks, customFreeGroups]);

  // Handlers para criação de novos grupos através do Popover
  function handleCreateFreeGroup(name: string) {
    const next = customFreeGroups.includes(name) ? customFreeGroups : [...customFreeGroups, name];
    setCustomFreeGroups(next);
    if (projectId) setLocalFreeGroups(projectId, next);
  }

  function handleCreateSpecialGroup(data: {
    title: string;
    itemType: ProjectTaskItemType;
    status: TaskStatus;
    startDate?: string;
    dueDate?: string;
    assigneeId?: string;
    assignee?: string;
    assigneeAvatar?: string;
  }, parentTaskId?: string) {
    onAddTask({
      title: data.title,
      itemType: data.itemType,
      status: data.status,
      startDate: data.startDate,
      dueDate: data.dueDate,
      assigneeId: data.assigneeId,
      assignee: data.assignee,
      assigneeAvatar: data.assigneeAvatar,
      priority: "Normal",
      description: "",
      parentTaskId,
    });
    if (parentTaskId) setExpandedTasks((prev) => ({ ...prev, [parentTaskId]: true }));
  }

  // ---------------------------------------------------------------------------
  // Renderizador Recursivo de Linha de Tarefa (Tree Hierarchy)
  // ---------------------------------------------------------------------------
  function renderTaskRow(
    task: Task,
    depth: number,
    parentStripeColor?: string
  ): React.ReactNode {
    const isEditing = editingTaskId === task.id;
    const isSelected = selectedIds.has(task.id);
    const isDragged = draggedTaskId === task.id;
    const isDragTarget =
      dragOverState?.taskId === task.id && draggedTaskId !== task.id;
    const isDragBefore = isDragTarget && dragOverState?.mode === "before";
    const isDragNest = isDragTarget && dragOverState?.mode === "nest";

    // Filhos desta tarefa na árvore
    const childTasks = sortTasksList(
      tasks.filter((t) => t.parentTaskId === task.id)
    );
    const parentTask = task.parentTaskId ? tasks.find((item) => item.id === task.parentTaskId) : undefined;
    const parentType = parentTask ? normalizeItemType(parentTask.itemType) : null;
    const allowedItemTypes: ProjectTaskItemType[] = ["TASK", ...getAllowedGroupTypes(parentType)];
    const subtasks = task.subtasks ?? [];
    const hasDescendants = childTasks.length > 0 || subtasks.length > 0;

    const isTaskExpanded =
      subtaskMode === "expanded"
        ? true
        : subtaskMode === "separate"
        ? false
        : Boolean(expandedTasks[task.id]);

    const itemDef = getItemTypeDefinition(task.itemType);
    const isSpecial = normalizeItemType(task.itemType) !== "TASK" || childTasks.length > 0;
    const stripeColor = itemDef.color || parentStripeColor || "#3b82f6";

    return (
      <React.Fragment key={task.id}>
        <div
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, task.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverRow(e, task)}
          onDrop={(e) => handleDropOnRow(e, task, task.status)}
          className={cn(
            "flex items-center justify-between h-[50px] min-h-[50px] pr-3 transition-colors group/row relative border-b border-border/50",
            isSelected
              ? "bg-accent"
              : "hover:bg-accent/40",
            isDragged && "opacity-40",
            isDragBefore && "border-t-2 border-t-primary",
            isDragNest && "bg-primary/10 ring-1 ring-inset ring-primary/50"
          )}
          style={{ paddingLeft: `${depth * 36 + 14}px` }}
        >
          {isSpecial && (
            <div aria-hidden="true" className="absolute inset-y-0 right-0 rounded-xl border border-border bg-card pointer-events-none" style={{ left: `${depth * 36}px` }} />
          )}
          {/* Conectores em formato de árvore para filhos */}
          {depth > 0 && (
            <>
              {/* Linha vertical que desce do pai */}
              <div
                className="absolute top-0 bottom-0 w-px bg-border pointer-events-none"
                style={{
                  left: `${(depth - 1) * 36 + 18}px`,
                }}
              />
              {/* Ramo curvo de 90° conectando visualmente ao item */}
              <div
                className="absolute top-0 w-7 h-1/2 border-b border-l border-border rounded-bl-md pointer-events-none"
                style={{
                  left: `${(depth - 1) * 36 + 18}px`,
                }}
              />
            </>
          )}

          {/* Lado Esquerdo: Drag Handle + Checkbox + Expand + Tipo Especial + Título + Progresso Segmentado + Quick Actions */}
          <div className="relative flex items-center gap-1.5 flex-1 min-w-0 pr-4">
            {/* Drag Handle ::: */}
            <span
              className="opacity-0 group-hover/row:opacity-100 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing transition-opacity shrink-0"
              title="Arraste para mover ou reordenar"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>

            {/* Checkbox de Seleção */}
            <button
              type="button"
              onClick={() => toggleSelectTask(task.id)}
              className={cn(
                "w-4 h-4 rounded-xs border flex items-center justify-center transition-all cursor-pointer shrink-0 mr-0.5",
                isSelected
                  ? "opacity-100 bg-primary border-primary text-primary-foreground"
                  : "opacity-0 group-hover/row:opacity-100 border-border hover:border-foreground bg-background"
              )}
              aria-label={`Selecionar tarefa ${task.title}`}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
            </button>

            {/* Seta para expandir / recolher descendentes */}
            {hasDescendants ? (
              <button
                type="button"
                onClick={() => toggleExpandTask(task.id)}
                aria-expanded={isTaskExpanded}
                aria-label={`${isTaskExpanded ? "Recolher" : "Expandir"} ${task.title}`}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                title={
                  isTaskExpanded ? "Recolher descendentes" : "Expandir descendentes"
                }
              >
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                    isTaskExpanded && "rotate-90"
                  )}
                />
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}

            {/* Ícone e Seletor do Tipo Especial da Tarefa */}
            <TaskItemTypeSelector
              value={task.itemType ?? "TASK"}
              allowedTypes={allowedItemTypes}
              hasContent={isTaskContentFilled(task.description)}
              variant="icon-only"
              note="Tipo especial salvo somente neste navegador."
              onChange={(newType) =>
                onUpdateTask({ ...task, itemType: newType })
              }
            />

            {/* Edição Inline do Título ou Visualização com Progresso */}
            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Input
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineTitle(task);
                    else if (e.key === "Escape") setEditingTaskId(null);
                  }}
                  className="h-7 text-xs bg-background border-primary text-foreground flex-1 max-w-md"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTaskId(null)}
                  className="h-6 px-2 text-[11px] cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveInlineTitle(task)}
                  className="h-6 px-2.5 text-[11px] cursor-pointer"
                >
                  Salvar ↵
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Título da Tarefa */}
                <button
                  type="button"
                  onClick={() => onOpenDetails(task)}
                  className={cn(
                    "text-left text-xs hover:text-primary truncate cursor-pointer transition-colors max-w-xl",
                    isSpecial ? "font-semibold" : "font-medium",
                    task.status === "Concluído" ||
                      normalizeTaskStatus(task.status) === "CONCLUÍDO"
                      ? "line-through text-muted-foreground/60"
                      : "text-foreground"
                  )}
                  title="Clique para abrir detalhes da tarefa"
                >
                  {task.title}
                </button>

                {/* Progresso Segmentado Imediatamente Após o Título */}
                <TaskSegmentedProgress task={task} allTasks={tasks} />

                {isDragNest && (
                  <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Soltar como subtarefa
                  </span>
                )}

                {/* Botões Rápidos Inline no Hover (+ Subtarefa, Tag, Lápis) */}
                <div className="absolute right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 focus-within:opacity-100 flex items-center gap-1 rounded-md bg-card transition-opacity">
                  {getAllowedGroupTypes(normalizeItemType(task.itemType)).length > 0 && (
                    <CreateGroupPopover compact parentType={normalizeItemType(task.itemType)} members={projectMembers} membersLoaded={membersLoaded} onCreateSpecialGroup={(data) => handleCreateSpecialGroup(data, task.id)} />
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenAddSubtask(task)}
                    className="w-6 h-6 rounded border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    title="Adicionar subtarefa / checklist"
                    aria-label="Adicionar subtarefa"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="w-6 h-6 rounded border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                        title="Alterar tag"
                        aria-label="Alterar tag"
                      >
                        <Tag className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-36 bg-popover border-border text-popover-foreground p-1"
                    >
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Definir Tag
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {PRESET_TAGS.map((tagOpt) => (
                        <DropdownMenuItem
                          key={tagOpt}
                          onClick={() =>
                            onUpdateTask({ ...task, tag: tagOpt })
                          }
                          className="text-xs cursor-pointer hover:bg-accent"
                        >
                          #{tagOpt}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    type="button"
                    onClick={() => handleStartEditing(task)}
                    className="w-6 h-6 rounded border border-border bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    title="Renomear inline"
                    aria-label="Renomear tarefa"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lado Direito: Colunas Alinhadas (STATUS | DATA | RESPONSÁVEL | ... | AÇÕES) */}
          <div className="relative flex items-stretch self-stretch shrink-0">
            {columns
              .filter((c) => !hiddenColumnIds.has(c.id))
              .map((col) => {
                if (col.id === "status") {
                  return (
                    <div key={col.id} className="w-52 flex items-center border-l border-muted-foreground/40 pl-3 pr-2">
                      <TaskSolidStatusBadge
                        status={task.status}
                        onChangeStatus={(next) =>
                          onUpdateTask({ ...task, status: next })
                        }
                      />
                    </div>
                  );
                }

                if (col.id === "dueDate") {
                  return (
                    <div key={col.id} className="w-44 flex items-center border-l border-muted-foreground/40 pl-3 pr-2">
                      <TaskTimelineDateCell
                        startDate={task.startDate}
                        dueDate={task.dueDate}
                        status={task.status}
                        priority={task.priority}
                        onUpdateDates={({ startDate, dueDate }) =>
                          onUpdateTask({ ...task, startDate, dueDate })
                        }
                        onUpdatePriority={(nextPriority) =>
                          onUpdateTask({ ...task, priority: nextPriority })
                        }
                      />
                    </div>
                  );
                }

                if (col.id === "assignee") {
                  return (
                    <div key={col.id} className="w-36 flex items-center border-l border-muted-foreground/40 pl-3 pr-2">
                      <TaskAssigneeCell
                        assignee={task.assignee}
                        assigneeId={task.assigneeId}
                        assigneeAvatar={task.assigneeAvatar}
                        members={projectMembers}
                        membersLoaded={membersLoaded}
                        onUpdateAssignee={(_assignee, _assigneeAvatar, assigneeId) => {
                          if (onChangeAssignee) void onChangeAssignee(task.id, projectMembers.find((member) => member.userId === assigneeId) ?? null);
                        }}
                      />
                    </div>
                  );
                }

                // Custom column
                return (
                  <div
                    key={col.id}
                    className="w-28 flex items-center border-l border-muted-foreground/40 pl-3 pr-2 text-xs text-muted-foreground/50"
                  >
                    —
                  </div>
                );
              })}

            {/* Menu de Ações (...) */}
            <div className="w-8 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-opacity cursor-pointer"
                    aria-label={`Mais opções para ${task.title}`}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 bg-popover border-border text-popover-foreground p-1 z-50 shadow-xl"
                >
                  <DropdownMenuItem
                    onClick={() => onOpenDetails(task)}
                    className="text-xs cursor-pointer hover:bg-accent"
                  >
                    Abrir detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStartEditing(task)}
                    className="text-xs cursor-pointer hover:bg-accent"
                  >
                    Renomear inline
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenAddSubtask(task)}
                    className="text-xs cursor-pointer hover:bg-accent"
                  >
                    Adicionar subtarefa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteWithConfirm(task)}
                    className="text-xs text-destructive hover:bg-destructive/20 focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Excluir tarefa</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Itens Descendentes (Child Tasks e Subtasks) com transição suave */}
        {(hasDescendants || addingSubtaskForId === task.id) && (
          <CollapsibleSection open={isTaskExpanded}>
            <div className="relative">
              {hasDescendants && <div aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-border pointer-events-none" style={{ left: `${depth * 36 + 18}px` }} />}
              {/* 1. Renderizar Child Tasks recursivamente */}
              {childTasks.map((child) =>
                renderTaskRow(child, depth + 1, stripeColor)
              )}

              {/* 2. Renderizar Subtarefas / Checklists diretas */}
              {subtasks.length > 0 &&
                renderSubtasksList(task, depth + 1, stripeColor)}

              {/* 3. Form inline para adicionar subelemento */}
              {addingSubtaskForId === task.id && (
                <div
                  className="py-2 pr-3 bg-muted/40 flex items-center gap-2 border-b border-border/50"
                  style={{ paddingLeft: `${(depth + 1) * 36 + 14}px` }}
                >
                  <form
                    onSubmit={(e) => handleSaveNewSubtask(e, task)}
                    className="flex items-center gap-2 w-full max-w-xl"
                  >
                    <input
                      autoFocus
                      type="text"
                      placeholder="Título do novo subelemento / checklist..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setAddingSubtaskForId(null);
                      }}
                      className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 px-3 text-xs cursor-pointer"
                    >
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingSubtaskForId(null)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </React.Fragment>
    );
  }

  // ---------------------------------------------------------------------------
  // Renderizador de Lista de Subtarefas / Checklists
  // ---------------------------------------------------------------------------
  function renderSubtaskColumns(task: Task, subtask: Subtask) {
    const status = subtask.completed ? "CONCLUÍDO" : subtask.inProgress ? "FAZENDO AGORA" : "PENDENTE";
    return (
      <div className="flex items-stretch self-stretch shrink-0">
        {columns.filter((column) => !hiddenColumnIds.has(column.id)).map((column) => {
          const width = column.id === "status" ? "w-52" : column.id === "dueDate" ? "w-44" : column.id === "assignee" ? "w-36" : "w-28";
          return (
            <div key={column.id} className={cn(width, "flex items-center border-l border-muted-foreground/40 pl-3 pr-2")}>
              {column.id === "status" && <TaskSolidStatusBadge status={status} size="sm" />}
              {column.id === "dueDate" && <TaskTimelineDateCell dueDate={subtask.dueDate} status={status} onUpdateDates={({ dueDate }) => handleUpdateSubtaskMeta(task, subtask.id, { dueDate: dueDate || undefined })} />}
              {column.id === "assignee" && <TaskAssigneeCell assignee={subtask.assignee} assigneeAvatar={subtask.assigneeAvatar} members={projectMembers} membersLoaded={membersLoaded} onUpdateAssignee={(assignee, assigneeAvatar) => handleUpdateSubtaskMeta(task, subtask.id, { assignee, assigneeAvatar })} />}
              {column.id !== "status" && column.id !== "dueDate" && column.id !== "assignee" && <span className="text-muted-foreground">—</span>}
            </div>
          );
        })}
        <div className="w-8" />
      </div>
    );
  }

  function renderSubtasksList(
    task: Task,
    depth: number,
    stripeColor: string,
    parentId?: string
  ): React.ReactNode {
    const visibleSubtasks = (task.subtasks ?? []).filter((st) =>
      showClosedSubtasks ? true : !st.completed
    );

    const parentIds = new Set(visibleSubtasks.map((s) => s.id));
    const rootSubtasks = visibleSubtasks.filter((st) => parentId
      ? st.parentId === parentId
      : !st.parentId || !parentIds.has(st.parentId));

    return rootSubtasks.map((st) => {
      const childItems = visibleSubtasks.filter((ch) => ch.parentId === st.id);
      const isParentOfChildren = childItems.length > 0;

      // Diferenciação inteligente especificada:
      // Se não tem nada além do título -> Checklist [ ]
      // Se tem data, responsável ou filhos -> Subtarefa ( )
      const isSubtask = Boolean(
        (st.dueDate && st.dueDate.trim() !== "") ||
          (st.assignee && st.assignee.trim() !== "") ||
          st.inProgress ||
          isParentOfChildren
      );

      const editKey = `${task.id}:${st.id}`;
      const isEditingSub = editingSubtaskKey === editKey;

      return (
        <React.Fragment key={st.id}>
          <div
            className="flex items-center justify-between h-[46px] pr-3 hover:bg-accent/40 bg-background transition-colors group/subrow relative border-b border-border/40"
            style={{ paddingLeft: `${depth * 36 + 14}px` }}
          >
            {/* Conectores em formato de árvore */}
            <div
              className="absolute top-0 bottom-0 w-px bg-border pointer-events-none"
              style={{ left: `${(depth - 1) * 36 + 18}px` }}
            />
            <div
              className="absolute top-0 w-7 h-1/2 border-b border-l border-border rounded-bl-md pointer-events-none"
              style={{ left: `${(depth - 1) * 36 + 18}px` }}
            />

            {/* Lado Esquerdo: Checkbox inteligente + Título */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4">
              <button
                type="button"
                onClick={() => handleToggleSubtask(task, st.id)}
                className="p-0.5 rounded hover:bg-accent transition-colors cursor-pointer shrink-0"
                title={st.completed ? "Marcar como pendente" : "Concluir"}
              >
                {isSubtask ? (
                  st.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CircleDashed className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )
                ) : st.completed ? (
                  <span className="w-4 h-4 rounded-[4px] bg-emerald-600 border border-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-[4px] border-[1.5px] border-muted-foreground/60 hover:border-foreground bg-transparent transition-colors block" />
                )}
              </button>

              {/* Título inline */}
              {isEditingSub ? (
                <div className="flex items-center gap-1.5 flex-1 max-w-md">
                  <Input
                    autoFocus
                    value={editingSubtaskTitle}
                    onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleSaveSubtaskTitle(task, st.id);
                      else if (e.key === "Escape") setEditingSubtaskKey(null);
                    }}
                    className="h-6 text-xs bg-background border-primary text-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSubtaskKey(null)}
                    className="h-6 px-2 text-[10px] cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveSubtaskTitle(task, st.id)}
                    className="h-6 px-2 text-[10px] cursor-pointer"
                  >
                    Salvar ↵
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    onClick={() => {
                      setEditingSubtaskKey(editKey);
                      setEditingSubtaskTitle(st.title);
                    }}
                    className={cn(
                      "text-xs truncate cursor-text select-none",
                      st.completed
                        ? "line-through text-muted-foreground/60"
                        : "text-foreground font-normal"
                    )}
                  >
                    {st.title}
                  </span>

                  {/* Ações no Hover */}
                  <div className="opacity-0 group-hover/subrow:opacity-100 group-focus-within/subrow:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleAddChildSubtask(task, st.id)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary hover:bg-accent text-secondary-foreground hover:text-accent-foreground transition-colors cursor-pointer"
                      title="Adicionar sub-item a este checklist"
                    >
                      + Item
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubtaskKey(editKey);
                        setEditingSubtaskTitle(st.title);
                      }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Renomear"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(task, st.id)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lado Direito: Metadados alinhados às colunas */}
            {renderSubtaskColumns(task, st)}
          </div>

          {isParentOfChildren && renderSubtasksList(task, depth + 1, stripeColor, st.id)}
        </React.Fragment>
      );
    });
  }

  function renderColumnHeader(rootTasks: Task[]) {
    // O indicador usa o mesmo cálculo das etapas, incluindo seus descendentes.
    const taskIds = new Set(tasks.map((task) => task.id));
    let summaryId = "__section_progress__";
    while (taskIds.has(summaryId)) summaryId += "_";
    const summaryRoot = rootTasks[0]
      ? { ...rootTasks[0], id: summaryId, subtasks: [] }
      : null;
    const rootsById = new Set(rootTasks.map((task) => task.id));
    const summaryTasks = tasks.map((task) =>
      rootsById.has(task.id) ? { ...task, parentTaskId: summaryId } : task
    );

    return (
      <div className="flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-7">
          <ColumnHeaderCell
            id="title"
            label="Tarefa"
            isSorted={sortColumn === "title"}
            sortDirection={sortColumn === "title" ? sortDirection : null}
            isDraggable={false}
            onSortToggle={handleSortToggle}
            onSetSort={handleSetSort}
            className="p-0 hover:bg-transparent text-foreground"
          />
          {summaryRoot && <TaskSegmentedProgress task={summaryRoot} allTasks={summaryTasks} />}
        </div>

        <div className="flex items-stretch self-stretch shrink-0">
          {columns
            .filter((c) => !hiddenColumnIds.has(c.id))
            .map((col, idx, arr) => (
              <div
                key={col.id}
                className={cn(
                  "flex items-center border-l border-muted-foreground/40 pl-3",
                  col.id === "status"
                    ? "w-52 pr-2"
                    : col.id === "dueDate"
                    ? "w-44 pr-2"
                    : col.id === "assignee"
                    ? "w-36 pr-2"
                    : "w-28 pr-2"
                )}
              >
                <ColumnHeaderCell
                  id={col.id}
                  label={col.label}
                  isSorted={sortColumn === col.id}
                  sortDirection={sortColumn === col.id ? sortDirection : null}
                  isDraggable={true}
                  canMoveLeft={idx > 0}
                  canMoveRight={idx < arr.length - 1}
                  onSortToggle={handleSortToggle}
                  onSetSort={handleSetSort}
                  onMoveToStart={handleMoveToStart}
                  onMoveToEnd={handleMoveToEnd}
                  onHideColumn={handleHideColumn}
                  onDragStart={(id, e) => {
                    e.dataTransfer.setData("text/plain", id);
                    setDraggedColumnId(id);
                  }}
                  onDragOver={(id, e) => {
                    e.preventDefault();
                    if (dragOverColumnId !== id) setDragOverColumnId(id);
                  }}
                  onDragLeave={() => {
                    if (dragOverColumnId === col.id) setDragOverColumnId(null);
                  }}
                  onDrop={(targetId) => {
                    if (draggedColumnId && draggedColumnId !== targetId) {
                      const targetIdx = columns.findIndex(
                        (c) => c.id === targetId
                      );
                      handleMoveColumn(draggedColumnId, targetIdx);
                    }
                    setDraggedColumnId(null);
                    setDragOverColumnId(null);
                  }}
                  isDragTarget={dragOverColumnId === col.id}
                />
              </div>
            ))}

          {/* Botão "+" para Criar Coluna / Gerenciar Campos */}
          <div className="w-8 flex items-center justify-center">
            <button
              type="button"
              onClick={handleOpenFieldsModal}
              title="Adicionar coluna / Gerenciar campos"
              aria-label="Adicionar coluna"
              className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  let maxDepth = 0;
  for (const task of tasks) {
    let depth = 0;
    let parentId = task.parentTaskId;
    const visited = new Set([task.id]);
    while (parentId && taskById.has(parentId) && !visited.has(parentId)) {
      visited.add(parentId);
      depth++;
      parentId = taskById.get(parentId)?.parentTaskId;
    }
    maxDepth = Math.max(maxDepth, depth);
    const subtasksById = new Map((task.subtasks ?? []).map((item) => [item.id, item]));
    for (const item of task.subtasks ?? []) {
      let itemDepth = depth + 1;
      let itemParent = item.parentId;
      const visitedItems = new Set([item.id]);
      while (itemParent && subtasksById.has(itemParent) && !visitedItems.has(itemParent)) {
        visitedItems.add(itemParent);
        itemDepth++;
        itemParent = subtasksById.get(itemParent)?.parentId;
      }
      maxDepth = Math.max(maxDepth, itemDepth);
    }
  }
  const metadataWidth = columns.filter((column) => !hiddenColumnIds.has(column.id)).reduce((width, column) => width + (column.id === "status" ? 208 : column.id === "dueDate" ? 176 : column.id === "assignee" ? 144 : 112), 32);

  // ---------------------------------------------------------------------------
  // JSX Principal
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full bg-background select-none text-xs relative pb-24 p-4 sm:p-6 space-y-4" style={{ minWidth: Math.max(760, metadataWidth + maxDepth * 36 + 280) }}>


      {/* --------------------------------------------------------------------- */}
      {/* MODO 1: AGRUPAMENTO NATURAL (groupBy === "none") */}
      {/* --------------------------------------------------------------------- */}
      {groupBy === "none" && naturalGroups && (
        <div className="space-y-6">
          {draggedTaskId && tasks.find((t) => t.id === draggedTaskId)?.parentTaskId && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragOverGroup !== "__promote_root__") {
                  setDragOverGroup("__promote_root__");
                  setDragOverState(null);
                }
              }}
              onDrop={(e) => {
                const dragged = tasks.find((t) => t.id === draggedTaskId);
                handleDropOnGroup(e, dragged?.status ?? "PENDENTE", "");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-xs font-medium transition-colors",
                dragOverGroup === "__promote_root__"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Soltar aqui para mover para o nível raiz</span>
            </div>
          )}

          {naturalGroups.specialRootTasks.length > 0 && (
            <section aria-label="Projeto" className="rounded-2xl border border-border bg-card/30 p-3 space-y-3">
              {renderColumnHeader(naturalGroups.specialRootTasks)}
              <div className="space-y-3">
          {/* A. Grupos Especiais (Tarefas Raiz com Tipo Especial / Descendentes) */}
          {naturalGroups.specialRootTasks.map((rootTask) => {
            const itemDef = getItemTypeDefinition(rootTask.itemType);
            const stripeColor = normalizeItemType(rootTask.itemType) === "TASK" ? "var(--primary)" : itemDef.color;

            return (
              <div
                key={rootTask.id}
                className="bg-background border border-border rounded-2xl overflow-hidden relative transition-colors"
              >
                {/* Faixa Fina Colorida na Lateral Esquerda do Bloco (3.5px) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-2xl z-20 pointer-events-none"
                  style={{ backgroundColor: stripeColor }}
                />

                {/* Linha Cabeçalho do Grupo Especial: É A PRÓPRIA TAREFA REAL */}
                {renderTaskRow(rootTask, 0, stripeColor)}
              </div>
            );
          })}

              </div>
            </section>
          )}

          {(naturalGroups.freeGroups.length > 0 || naturalGroups.regularRootTasks.length > 0 || naturalGroups.specialRootTasks.length === 0) && (
            <section aria-label="Outras tarefas" className="rounded-2xl border border-border bg-card/30 p-3 space-y-3">
              {renderColumnHeader([...naturalGroups.freeGroups.flatMap((group) => group.tasks), ...naturalGroups.regularRootTasks])}
              <div className="space-y-3">
          {/* B. Grupos Livres (Containers Visuais sem status/data próprios) */}
          {naturalGroups.freeGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.name]);
            const groupTasks = sortTasksList(group.tasks);
            const isGroupSelected =
              groupTasks.length > 0 &&
              groupTasks.every((t) => selectedIds.has(t.id));
            const totalSubCount = groupTasks.reduce(
              (acc, t) => acc + (t.subtasks?.length ?? 0),
              0
            );

            return (
              <div
                key={group.name}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragOverGroup !== `free:${group.name}`) {
                    setDragOverGroup(`free:${group.name}`);
                    setDragOverState(null);
                  }
                }}
                onDrop={(e) => handleDropOnGroup(e, "PENDENTE", group.name)}
                className={cn(
                  "bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative mb-4 transition-all",
                  dragOverGroup === `free:${group.name}` && "ring-2 ring-primary/50"
                )}
              >
                {/* Faixa Lateral */}
                <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-primary rounded-l-2xl z-20 pointer-events-none" />

                {/* Cabeçalho do Grupo Livre */}
                <div className="flex items-center justify-between h-[50px] px-3.5 bg-muted/40 border-b border-border group/freeheader">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Checkbox de Selecionar Grupo Todo */}
                    <button
                      type="button"
                      onClick={() => toggleSelectGroup(groupTasks)}
                      className={cn(
                        "w-4 h-4 rounded-xs border flex items-center justify-center transition-all cursor-pointer shrink-0",
                        isGroupSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "opacity-0 group-hover/freeheader:opacity-100 group-focus-within/freeheader:opacity-100 border-border hover:border-foreground bg-background"
                      )}
                      title="Selecionar todas as tarefas deste grupo"
                    >
                      {isGroupSelected && (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleGroup(group.name)}
                      className="flex items-center gap-2 cursor-pointer focus:outline-none"
                    >
                      <span className="text-muted-foreground hover:text-foreground">
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200",
                            !isCollapsed && "rotate-90"
                          )}
                        />
                      </span>

                      <span className="font-semibold text-xs text-primary">
                        {group.name}
                      </span>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {groupTasks.length} {groupTasks.length === 1 ? "Tarefa" : "Tarefas"}
                        {totalSubCount > 0 && ` / ${totalSubCount} Subelementos`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openQuickAdd(group.name)}
                      className="opacity-0 group-hover/freeheader:opacity-100 group-focus-within/freeheader:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-all cursor-pointer ml-1"
                      title="Adicionar tarefa neste grupo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Grupo Livre com transição suave */}
                <CollapsibleSection open={!isCollapsed}>
                  <div>
                    {groupTasks.map((t) => renderTaskRow(t, 0, "var(--primary)"))}

                    {/* Botão + Adicionar Tarefa no Grupo Livre */}
                    {addingInGroup === group.name ? (
                      <form
                        onSubmit={(e) => handleSaveQuickAdd(e, "PENDENTE", group.name)}
                        className="flex items-center gap-2 py-2.5 px-4 bg-muted/30 border-t border-border"
                      >
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nome da nova tarefa..."
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setAddingInGroup(null);
                          }}
                          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="h-7 px-3 text-xs cursor-pointer"
                        >
                          Salvar ↵
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingInGroup(null)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Cancelar
                        </Button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openQuickAdd(group.name)}
                        className="w-full text-left h-[44px] pl-8 pr-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        <span>+ Adicionar tarefa</span>
                      </button>
                    )}
                  </div>
                </CollapsibleSection>
              </div>
            );
          })}

          {/* C. Tarefas Regulares Raízes Sem Grupo Especial nem Livre */}
          {sortTasksList(naturalGroups.regularRootTasks).map((task) => (
            <div
              key={task.id}
              className="bg-card border border-border rounded-2xl overflow-hidden relative"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-muted-foreground rounded-l-2xl z-20 pointer-events-none" />
              {renderTaskRow(task, 0)}
            </div>
          ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODO 2: AGRUPAMENTOS DINÂMICOS (quando groupBy !== "none") */}
      {/* --------------------------------------------------------------------- */}
      {groupBy !== "none" && (
        <div className="space-y-4">
          {renderColumnHeader(tasks.filter((task) => !task.parentTaskId || !tasks.some((parent) => parent.id === task.parentTaskId)))}
          {computedGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.id]);
            const groupTasks = sortTasksList(group.tasks);
            const isGroupSelected =
              groupTasks.length > 0 &&
              groupTasks.every((t) => selectedIds.has(t.id));
            const stripeColor = group.color || "var(--primary)";

            return (
              <div
                key={group.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverGroup !== group.id) {
                    setDragOverGroup(group.id);
                    setDragOverState(null);
                  }
                }}
                onDrop={(e) => handleDropOnGroup(e, group.defaultStatus)}
                className={cn(
                  "bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative mb-4 transition-all",
                  dragOverGroup === group.id && "ring-2 ring-primary/50"
                )}
              >
                {/* Faixa Fina Colorida na Lateral Esquerda (3.5px) */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-2xl z-20 pointer-events-none"
                  style={{ backgroundColor: stripeColor }}
                />

                {/* Cabeçalho do Bloco Elevado */}
                <div className="flex items-center justify-between h-[50px] px-3.5 bg-muted/40 border-b border-border group/groupheader">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelectGroup(groupTasks)}
                      className={cn(
                        "w-4 h-4 rounded-xs border flex items-center justify-center transition-all cursor-pointer shrink-0",
                        isGroupSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "opacity-0 group-hover/groupheader:opacity-100 group-focus-within/groupheader:opacity-100 border-border hover:border-foreground bg-background"
                      )}
                      title="Selecionar todas as tarefas deste grupo"
                    >
                      {isGroupSelected && (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-2 cursor-pointer focus:outline-none"
                    >
                      <span className="text-muted-foreground hover:text-foreground">
                        <ChevronRight
                          className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200",
                            !isCollapsed && "rotate-90"
                          )}
                        />
                      </span>

                      {group.icon}

                      <span className="font-semibold text-xs text-foreground">
                        {group.label}
                      </span>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {groupTasks.length}{" "}
                        {groupTasks.length === 1 ? "tarefa" : "tarefas"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openQuickAdd(group.id)}
                      className="opacity-0 group-hover/groupheader:opacity-100 group-focus-within/groupheader:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-all cursor-pointer ml-1"
                      title="Adicionar tarefa neste grupo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lista de Tarefas do Bloco com transição suave */}
                <CollapsibleSection open={!isCollapsed}>
                  <div>
                    {groupTasks.map((task) =>
                      renderTaskRow(task, 0, stripeColor)
                    )}

                    {/* Botão + Adicionar Tarefa */}
                    {addingInGroup === group.id ? (
                      <form
                        onSubmit={(e) =>
                          handleSaveQuickAdd(e, group.defaultStatus)
                        }
                        className="flex items-center gap-2 py-2.5 px-4 bg-muted/30 border-t border-border"
                      >
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nome da nova tarefa..."
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setAddingInGroup(null);
                          }}
                          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="h-7 px-3 text-xs cursor-pointer"
                        >
                          Salvar ↵
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingInGroup(null)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Cancelar
                        </Button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openQuickAdd(group.id)}
                        className="w-full text-left h-[44px] pl-8 pr-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        <span>+ Adicionar tarefa</span>
                      </button>
                    )}
                  </div>
                </CollapsibleSection>
              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Botão "+ Adicionar novo grupo" no Rodapé da Tabela */}
      {/* --------------------------------------------------------------------- */}
      <div className="pt-2">
        <CreateGroupPopover
          members={projectMembers}
          membersLoaded={membersLoaded}
          onCreateFreeGroup={handleCreateFreeGroup}
          onCreateSpecialGroup={handleCreateSpecialGroup}
        />
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Barra Flutuante de Ações em Lote */}
      {/* --------------------------------------------------------------------- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex w-max flex-wrap justify-center max-w-[calc(100vw-2rem)] items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-150">
          <Badge variant="default" className="text-xs px-2.5 py-0.5">
            {selectedIds.size} selecionada(s)
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
              >
                Mudar Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="p-0 bg-transparent border-none shadow-none z-50"
            >
              <StatusDropdownContent
                currentStatus={""}
                onSelectStatus={(s) => handleBulkStatusChange(s)}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
              >
                Prioridade
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-36 p-1 z-50">
              {PRIORITIES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => handleBulkPriorityChange(p)}
                  className="text-xs cursor-pointer"
                >
                  <PriorityIcon priority={p} showLabel />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                <Tag className="w-3 h-3" />
                <span>Adicionar tag</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {PRESET_TAGS.map((tag) => (
                <DropdownMenuItem key={tag} onSelect={() => handleBulkTagChange(tag)}>#{tag}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedAssignedTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs cursor-pointer">
                  Remover tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {selectedAssignedTags.map((tag) => (
                  <DropdownMenuItem key={tag} onSelect={() => handleBulkRemoveTag(tag)}>
                    Remover #{tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {projectMembers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                  <UserCheck className="w-3 h-3" />
                  <span>Responsável</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="max-h-60 overflow-y-auto w-56">
                <DropdownMenuItem onSelect={() => void handleBulkAssigneeChange(null)}>
                  Sem responsável
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projectMembers.map((member) => (
                  <DropdownMenuItem
                    key={member.userId}
                    onSelect={() => void handleBulkAssigneeChange(member)}
                    className="gap-2"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px] font-semibold">
                      <MemberAvatarContent
                        name={member.user.name}
                        src={member.user.avatarUrl}
                      />
                    </span>
                    <span className="truncate">{member.user.name || member.user.email}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {(hasSelectedChildTasks || eligibleBulkParents.length > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                  <FolderTree className="w-3 h-3" />
                  <span>Organizar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto w-60">
                {hasSelectedChildTasks && (
                  <DropdownMenuItem onSelect={() => handleBulkReparent(undefined)}>
                    <ArrowUpFromLine className="w-3.5 h-3.5 mr-1.5" />
                    <span>Tornar tarefa(s) raiz</span>
                  </DropdownMenuItem>
                )}
                {hasSelectedChildTasks && eligibleBulkParents.length > 0 && <DropdownMenuSeparator />}
                {eligibleBulkParents.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                      Mover para pai...
                    </DropdownMenuLabel>
                    {eligibleBulkParents.slice(0, 12).map((parent) => (
                      <DropdownMenuItem
                        key={parent.id}
                        onSelect={() => handleBulkReparent(parent.id)}
                      >
                        <span className="truncate">{parent.title}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="h-7 text-xs gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </Button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Gerenciamento e Criação de Campos */}
      <FieldsModal
        isOpen={isFieldsModalOpen}
        onClose={handleCloseFieldsModal}
        existingColumns={columns.map((c) => ({
          id: c.id,
          label: c.label,
          isVisible: !hiddenColumnIds.has(c.id),
        }))}
        onAddExistingColumn={handleAddExistingColumn}
        onCreateCustomColumn={handleCreateCustomColumn}
      />

      <Dialog
        open={Boolean(confirmDeleteState)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteState(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDeleteState?.mode === "bulk"
                ? `Excluir ${confirmDeleteState.count} tarefa(s)?`
                : "Excluir tarefa?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDeleteState?.mode === "bulk"
                ? `Tem certeza que deseja excluir as ${confirmDeleteState.count} tarefas selecionadas? Esta ação não pode ser desfeita.`
                : confirmDeleteState?.mode === "single"
                ? `Tem certeza que deseja excluir a tarefa "${confirmDeleteState.task.title}"? Esta ação não pode ser desfeita.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteState(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteAction}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
