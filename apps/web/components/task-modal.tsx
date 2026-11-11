"use client";

import React, {
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  Subtask,
  TaskComment,
  CanonicalTaskStatus,
  CanonicalTaskPriority,
} from "@/types/task";
import {
  normalizeTaskStatus,
  normalizeTaskPriority,
} from "@/types/task";
import {
  StatusIcon,
  StatusBadge,
  StatusDropdownContent,
  getStatusDefinition,
  STATUS_DEFINITIONS,
  ALL_CANONICAL_STATUSES,
} from "@/components/task-status-icon";
import {
  PriorityIcon,
  ALL_CANONICAL_PRIORITIES,
  getPriorityPillStyle,
} from "@/components/task-priority-icon";
import { NotionDatePicker } from "@/components/ui/notion-date-picker";
import { formatNotionDate } from "@/lib/notion-date";
import {
  DEFAULT_CHECKLIST_SUBTASKS,
  DEFAULT_TASK_COMMENTS,
} from "@/lib/initial-data";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlignLeft,
  AtSign,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  Clock,
  Copy,
  Flame,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minimize2,
  MessageSquareMore,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  SendHorizontal,
  Share2,
  Smile,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskModalContentHandle {
  requestClose: () => void;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  initialStatus?: TaskStatus;
  onSave: (
    task: Omit<Task, "id" | "createdAt" | "code"> & {
      id?: string;
      code?: string;
      coverUrl?: string;
      icon?: string;
    }
  ) => void;
  onUpdateTask?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onAddComment?: (taskId: string, comment: TaskComment) => void;
}

interface TaskModalContentProps {
  task: Task | null;
  initialStatus?: TaskStatus;
  onClose: () => void;
  onSave: (
    task: Omit<Task, "id" | "createdAt" | "code"> & {
      id?: string;
      code?: string;
      coverUrl?: string;
      icon?: string;
    }
  ) => void;
  onUpdateTask?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onAddComment?: (taskId: string, comment: TaskComment) => void;
}

const DEFAULT_GROUPS_ORDER = [
  "Planejamento e organização",
  "Execução e configuração",
  "Materiais de apoio",
];

const TEAM_MEMBERS = [
  { name: "Sem responsável", value: "", avatar: "" },
  { name: "Will", value: "Will", avatar: "/avatars/will.png" },
];

const PROJECT_OPTIONS = [
  "Site – Graci (Power RH)",
  "IDE Gestor – Core UI",
  "CRM Comercial & Pipeline",
  "ERP Financeiro",
];

// Cores e Gradientes estilo Notion fiéis ao Print 2
const NOTION_COVER_PALETTE = [
  { label: "Vermelho Coral", value: "#e05252" },
  { label: "Amarelo Mostarda", value: "#f1b844" },
  { label: "Azul Ciano", value: "#1a9fe8" },
  { label: "Bege Suave", value: "#fcf5ec" },
  {
    label: "Gradiente Ciano / Azul",
    value: "linear-gradient(135deg, #06b6d4, #3b82f6)",
  },
  {
    label: "Gradiente Rosa / Magenta",
    value: "linear-gradient(135deg, #ec4899, #f43f5e)",
  },
  {
    label: "Gradiente Pôr do Sol",
    value: "linear-gradient(135deg, #f97316, #ef4444)",
  },
  {
    label: "Gradiente Pastel Aurora",
    value: "linear-gradient(135deg, #a7f3d0, #bfdbfe)",
  },
  {
    label: "Gradiente Roxo / Índigo",
    value: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  {
    label: "Gradiente Dark Midnight",
    value: "linear-gradient(135deg, #0f172a, #1e1b4b)",
  },
  {
    label: "Gradiente Esmeralda",
    value: "linear-gradient(135deg, #10b981, #047857)",
  },
  { label: "Grafite Matte", value: "#1e293b" },
];

const UNSPLASH_PRESETS = [
  {
    label: "Minimal Tech",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Deep Space",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Neon Gradient",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Mountain Sunset",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Architecture",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  },
  {
    label: "Dark Texture",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  },
];

const NOTION_EMOJIS = [
  "😍",
  "💜",
  "🚀",
  "✨",
  "💡",
  "🎨",
  "⚡",
  "📌",
  "🔥",
  "🛠️",
  "🎯",
  "💎",
  "🌟",
  "🧩",
  "📂",
  "📈",
  "💻",
  "🔮",
  "☕",
  "🎉",
  "✅",
  "🏷️",
  "⭐",
  "🏆",
];

function formatDueDateBr(dateStr?: string): string {
  if (!dateStr) return "20/11/2026";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatPillDate(dateStr?: string): string {
  if (!dateStr) return "sex (20/nov)";
  const daysOfWeek = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];

  try {
    let day: number | undefined;
    let monthIdx: number | undefined;
    let year: number | undefined;

    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      day = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (dateStr.includes("-")) {
      const parts = dateStr.slice(0, 10).split("-");
      year = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }

    if (
      day !== undefined &&
      monthIdx !== undefined &&
      year !== undefined &&
      !isNaN(day) &&
      !isNaN(monthIdx) &&
      !isNaN(year)
    ) {
      const d = new Date(year, monthIdx, day);
      const dow = daysOfWeek[d.getDay()] || "sex";
      const mStr = months[monthIdx] || "nov";
      return `${dow} (${day}/${mStr})`;
    }
  } catch {
    // fallback
  }

  return "sex (20/nov)";
}

function ensureGroupedSubtasks(rawSubtasks?: Subtask[]): Subtask[] {
  if (!rawSubtasks || rawSubtasks.length === 0) {
    return DEFAULT_CHECKLIST_SUBTASKS;
  }
  const hasAnyGroup = rawSubtasks.some((s) => Boolean(s.group));
  if (hasAnyGroup) {
    return rawSubtasks;
  }
  return DEFAULT_CHECKLIST_SUBTASKS;
}

function StatusHexagonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("w-3.5 h-3.5", className)}
      aria-hidden="true"
    >
      <path
        d="M8 1.5L13.5 4.7V11.3L8 14.5L2.5 11.3V4.7L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 5.2V8.4M8 10.8H8.01"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SignalBarsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("w-3.5 h-3.5", className)}
      aria-hidden="true"
    >
      <rect x="2" y="10" width="2.2" height="4" rx="0.8" fill="currentColor" />
      <rect x="6" y="7" width="2.2" height="7" rx="0.8" fill="currentColor" />
      <rect x="10" y="3.5" width="2.2" height="10.5" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function NotionStatusTypeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("w-3.5 h-3.5", className)}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.5V3.5M8 12.5V14.5M1.5 8H3.5M12.5 8H14.5M3.4 3.4L4.8 4.8M11.2 11.2L12.6 12.6M3.4 12.6L4.8 11.2M11.2 4.8L12.6 3.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PurpleBoardIcon() {
  return (
    <div className="w-[34px] h-[34px] rounded-[8px] bg-gradient-to-b from-[#7c5dfa] to-[#5938e8] shadow-[0_2px_12px_rgba(110,81,249,0.5)] flex items-center justify-center shrink-0 border border-white/15">
      <div className="w-[18px] h-[18px] rounded-[4px] bg-white/20 flex items-start gap-[2.5px] p-[3.5px]">
        <span className="w-[5px] h-[11px] rounded-[1.5px] bg-white" />
        <span className="w-[5px] h-[7px] rounded-[1.5px] bg-white" />
      </div>
    </div>
  );
}

const TaskModalContent = forwardRef<
  TaskModalContentHandle,
  TaskModalContentProps
>(function TaskModalContent(
  {
    task,
    initialStatus = "A Fazer",
    onClose,
    onSave,
    onUpdateTask,
    onDelete,
    onUpdateSubtasks,
    onAddComment,
  },
  ref
) {
  const isEditing = Boolean(task);

  const defaultTitle = task?.title ?? "";
  const defaultSubtitle = task?.subtitle ?? "";
  const defaultDescription = task?.description ?? "";

  const [title, setTitle] = useState(defaultTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);

  const [description, setDescription] = useState(defaultDescription);
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const [status, setStatus] = useState<TaskStatus>(() =>
    normalizeTaskStatus(task?.status ?? initialStatus ?? "PENDENTE")
  );
  const [priority, setPriority] = useState<TaskPriority>(() =>
    normalizeTaskPriority(task?.priority ?? "Normal")
  );
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [projectName, setProjectName] = useState(
    task?.projectName || ""
  );
  const [assignee, setAssignee] = useState(
    task?.assignee || ""
  );
  const [assigneeAvatar, setAssigneeAvatar] = useState(
    task?.assigneeAvatar || ""
  );
  const [tags, setTags] = useState<string[]>(
    task?.tags && task.tags.length > 0
      ? task.tags
      : task?.tag
        ? [task.tag]
        : []
  );
  const [newTagInput, setNewTagInput] = useState("");
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  const [estimate, setEstimate] = useState(
    task?.estimate ?? ""
  );

  // Capa & Ícone estilo Notion
  // Toda tarefa vem sem ícone e sem capa por padrão
  const [coverUrl, setCoverUrl] = useState<string | undefined>(() => {
    return task?.coverUrl || undefined;
  });

  const [icon, setIcon] = useState<string | undefined>(() => {
    return task?.icon || undefined;
  });

  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);
  const [coverPosition, setCoverPosition] = useState<"center" | "top" | "bottom">("center");
  const [coverTab, setCoverTab] = useState<"gallery" | "upload" | "link" | "unsplash">("gallery");
  const [linkInput, setLinkInput] = useState("");
  const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subtasks & Checklist state
  const hasSubtasks = Boolean(task?.subtasks && task.subtasks.length > 0);

  // Regra de colapso do usuário:
  // Quando abre a task tudo tem que começar fechado
  // Só o que fica aberto é a seção de checklist/subtarefas (se tiver preenchido)
  // Se não tiver preenchido, quem começa aberto é só a parte de propriedades
  const [isPropertiesExpanded, setIsPropertiesExpanded] = useState(!hasSubtasks);
  const [isDescOpen, setIsDescOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(hasSubtasks);
  const [isBottomOpen, setIsBottomOpen] = useState(false);

  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(() =>
    ensureGroupedSubtasks(task?.subtasks)
  );
  const activeSubtasks = useMemo(() => {
    if (isEditing && task?.subtasks && task.subtasks.some((s) => s.group)) {
      return task.subtasks;
    }
    return localSubtasks;
  }, [isEditing, task?.subtasks, localSubtasks]);

  // Collapsible groups state
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({
    "Planejamento e organização": false,
    "Execução e configuração": false,
    "Materiais de apoio": true,
  });

  // Quick-add checklist item state
  const [showAddChecklistItem, setShowAddChecklistItem] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistGroup, setNewChecklistGroup] = useState(
    "Execução e configuração"
  );

  // Comments, Activities & Attachments state (3 abas)
  const [bottomTab, setBottomTab] = useState<"activities" | "comments" | "attachments">(
    "activities"
  );
  const [localComments, setLocalComments] = useState<TaskComment[]>(() =>
    task?.comments ?? []
  );
  const activeComments = isEditing && task?.comments && task.comments.length >= 2
    ? task.comments
    : localComments;

  const [newCommentText, setNewCommentText] = useState("");

  function syncTaskField(patch: Partial<Task>) {
    if (!task) return;
    const updated: Task = {
      ...task,
      title,
      subtitle,
      description,
      status,
      priority,
      dueDate,
      projectName,
      assignee,
      assigneeAvatar,
      tags,
      tag: tags[0] ?? task.tag,
      estimate,
      coverUrl,
      icon,
      subtasks: activeSubtasks,
      comments: activeComments,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTask?.(updated);
  }

  function handleClose() {
    if (!task && title.trim()) {
      onSave({
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        status,
        priority,
        dueDate,
        projectName,
        assignee,
        assigneeAvatar,
        tags,
        tag: tags[0],
        estimate,
        coverUrl,
        icon,
        subtasks: activeSubtasks,
        comments: activeComments,
      });
    }
    onClose();
  }

  useImperativeHandle(ref, () => ({
    requestClose: handleClose,
  }));

  // Botão Compartilhar: copia o link da tarefa e dá feedback visual
  function handleShare() {
    const code = task?.code || "IDE-104";
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/?modal=${code}`
        : `https://ide-gestor.local/?modal=${code}`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl);
      setSharedFeedback(true);
      setTimeout(() => setSharedFeedback(false), 2000);
    }
  }

  function handleSelectCover(value?: string) {
    setCoverUrl(value);
    syncTaskField({ coverUrl: value });
    setIsCoverPopoverOpen(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleSelectCover(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSelectIcon(emoji?: string) {
    setIcon(emoji);
    syncTaskField({ icon: emoji });
    setIsIconPopoverOpen(false);
  }

  function handleSelectStatus(nextStatus: TaskStatus) {
    const norm = normalizeTaskStatus(nextStatus);
    setStatus(norm);
    syncTaskField({ status: norm });
  }

  function handleSelectPriority(nextPriority: TaskPriority) {
    const norm = normalizeTaskPriority(nextPriority);
    setPriority(norm);
    syncTaskField({ priority: norm });
  }

  function handleSelectAssignee(member: { name: string; avatar: string }) {
    setAssignee(member.name);
    setAssigneeAvatar(member.avatar);
    syncTaskField({
      assignee: member.name,
      assigneeAvatar: member.avatar,
    });
  }

  function handleRemoveTag(tagToRemove: string) {
    const next = tags.filter((t) => t !== tagToRemove);
    setTags(next);
    syncTaskField({ tags: next, tag: next[0] });
  }

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      const next = [...tags, trimmed];
      setTags(next);
      syncTaskField({ tags: next, tag: next[0] });
    }
    setNewTagInput("");
    setIsTagPopoverOpen(false);
  }

  function handleToggleSubtask(id: string) {
    const updated = activeSubtasks.map((s) =>
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    setLocalSubtasks(updated);
    if (task && onUpdateSubtasks) {
      onUpdateSubtasks(task.id, updated);
    }
  }

  function handleUpdateSubtaskMeta(id: string, updates: Partial<Subtask>) {
    const updated = activeSubtasks.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    setLocalSubtasks(updated);
    if (task && onUpdateSubtasks) {
      onUpdateSubtasks(task.id, updated);
    }
  }

  function handleDeleteSubtaskItem(id: string) {
    const updated = activeSubtasks.filter((s) => s.id !== id && s.parentId !== id);
    setLocalSubtasks(updated);
    if (task && onUpdateSubtasks) {
      onUpdateSubtasks(task.id, updated);
    }
  }

  function handleAddChildSubtaskItem(parentId: string, group?: string) {
    const newChild: Subtask = {
      id: `st-${crypto.randomUUID()}`,
      parentId,
      title: "Novo item de checklist",
      completed: false,
      group,
    };
    const updated = [...activeSubtasks, newChild];
    setLocalSubtasks(updated);
    if (task && onUpdateSubtasks) {
      onUpdateSubtasks(task.id, updated);
    }
  }

  function handleAddChecklistSubtask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newChecklistTitle.trim();
    if (!trimmed) return;
    const newSt: Subtask = {
      id: `st-${Date.now()}`,
      title: trimmed,
      completed: false,
      group: newChecklistGroup,
    };
    const updated = [...activeSubtasks, newSt];
    setLocalSubtasks(updated);
    if (task && onUpdateSubtasks) {
      onUpdateSubtasks(task.id, updated);
    }
    setCollapsedGroups((prev) => ({ ...prev, [newChecklistGroup]: false }));
    setNewChecklistTitle("");
    setShowAddChecklistItem(false);
  }

  function toggleGroupCollapse(groupName: string) {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  }

  const groupedSubtasks = useMemo(() => {
    const map = new Map<string, Subtask[]>();
    for (const g of DEFAULT_GROUPS_ORDER) {
      map.set(g, []);
    }
    for (const item of activeSubtasks) {
      const groupName = item.group || "Execução e configuração";
      const list = map.get(groupName) ?? [];
      list.push(item);
      map.set(groupName, list);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [activeSubtasks]);

  const allGroupsCollapsed = useMemo(
    () => groupedSubtasks.every(([groupName]) => collapsedGroups[groupName]),
    [groupedSubtasks, collapsedGroups]
  );

  function handleCollapseOrExpandAll() {
    const targetCollapsed = !allGroupsCollapsed;
    const next: Record<string, boolean> = {};
    for (const [groupName] of groupedSubtasks) {
      next[groupName] = targetCollapsed;
    }
    setCollapsedGroups(next);
  }

  const totalSubtasksCount = activeSubtasks.length;
  const completedSubtasksCount = activeSubtasks.filter(
    (s) => s.completed
  ).length;
  const progressPercent =
    totalSubtasksCount > 0
      ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100)
      : 0;

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;
    const newComment: TaskComment = {
      id: `c-${Date.now()}`,
      author: "Will (Você)",
      avatar: "/avatars/user-composer.png",
      timeAgo: "agora mesmo",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const nextComments = [newComment, ...activeComments];
    setLocalComments(nextComments);
    if (task && onAddComment) {
      onAddComment(task.id, newComment);
    }
    setNewCommentText("");
  }

  function getTagChipStyle(tagName: string, index: number) {
    const lower = tagName.toLowerCase();
    if (lower.includes("ui") || lower.includes("ux") || index === 0) {
      return "bg-[#1d3458] border-[#2c4e82] text-[#93c5fd]";
    }
    return "bg-[#352259] border-[#4e3280] text-[#d8b4fe]";
  }

  function getPriorityPillStyle(prio: TaskPriority) {
    if (prio === "Alta" || prio === "Urgente") {
      return "bg-[#3a1d28] border-[#592838] text-[#fda4af]";
    }
    if (prio === "Média") {
      return "bg-[#382c1a] border-[#574324] text-[#fcd34d]";
    }
    return "bg-[#1b2c3b] border-[#294359] text-[#93c5fd]";
  }

  // Estilo da capa Notion
  const coverStyle = useMemo(() => {
    if (!coverUrl) return {};
    if (coverUrl.startsWith("http") || coverUrl.startsWith("data:image")) {
      return {
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: coverPosition,
      };
    }
    return {
      background: coverUrl,
    };
  }, [coverUrl, coverPosition]);

  return (
    <div className="flex flex-col w-full bg-[#141522] text-[#f3f4f8] select-none">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">{subtitle}</DialogDescription>

      {/* =================================================================== */}
      {/* 1. TOP HEADER BAR                                                   */}
      {/* =================================================================== */}
      <div className="h-[38px] px-4 bg-[#181928] border-b border-[#232538] flex items-center justify-between shrink-0">
        {/* Esquerda: apenas — IDE-104 (sem ícone de link solto) */}
        <div className="flex items-center gap-2">
          <span className="w-4 h-[1.5px] bg-[#5e627d] rounded-full inline-block" />
          <span className="text-[12.5px] font-medium text-[#9498b3] tracking-wide">
            {task?.code || "IDE-104"}
          </span>
        </div>

        {/* Direita: Compartilhar + ... + Fechar (sem ícones avulsos de link) */}
        <div className="flex items-center gap-2 text-[#9498b3]">
          {/* Botão Compartilhar com cópia inteligente de link */}
          <button
            type="button"
            onClick={handleShare}
            title="Copiar link e compartilhar"
            className={cn(
              "h-[26px] px-2.5 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer outline-none",
              sharedFeedback
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-[#9498b3] hover:text-white hover:bg-white/[0.06]"
            )}
          >
            {sharedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartilhar</span>
              </>
            )}
          </button>

          {/* Menu Mais opções */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Mais opções"
                className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer outline-none"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-[#1a1c2d] border-[#2c2f48] text-[#f3f4f8]"
            >
              <DropdownMenuItem
                onClick={handleShare}
                className="text-xs gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#9498b3]" />
                <span>Copiar link da tarefa</span>
              </DropdownMenuItem>
              {task && onDelete && (
                <>
                  <DropdownMenuSeparator className="bg-[#282b40]" />
                  <DropdownMenuItem
                    onClick={() => {
                      if (
                        window.confirm(
                          `Tem certeza que deseja excluir "${title}"?`
                        )
                      ) {
                        onDelete(task.id);
                        onClose();
                      }
                    }}
                    className="text-xs text-rose-400 focus:text-rose-300 gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir tarefa</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botão Fechar Modal */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar modal"
            title="Fechar"
            className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CAPA NOTION STYLE (ANEXOS 2 E 3)                                 */}
      {/* =================================================================== */}
      {coverUrl ? (
        <div
          className="relative w-full h-[140px] group/cover overflow-hidden select-none transition-all duration-200"
          style={coverStyle}
        >
          {/* Botões de Ação na Capa (Notion: Alterar capa | Reposicionar) */}
          <div className="absolute right-4 bottom-3 opacity-90 group-hover/cover:opacity-100 flex items-center gap-2 transition-opacity">
            <Popover
              open={isCoverPopoverOpen}
              onOpenChange={setIsCoverPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-3 rounded-[6px] bg-black/60 hover:bg-black/85 backdrop-blur-md text-[12px] font-medium text-white border border-white/10 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer outline-none"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Alterar</span>
                </button>
              </PopoverTrigger>

              {/* Popover Notion Style de Capa (Idêntico ao Print 2!) */}
              <PopoverContent
                align="end"
                className="w-[380px] p-0 bg-[#1c1d24] border-[#2c2e3d] text-[#f3f4f8] shadow-2xl rounded-[12px] overflow-hidden"
              >
                {/* Abas Superiores do Popover */}
                <div className="flex items-center justify-between border-b border-[#282a38] px-3 pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCoverTab("gallery")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "gallery"
                          ? "text-white font-semibold"
                          : "text-[#8e92ab] hover:text-white"
                      )}
                    >
                      Galeria
                      {coverTab === "gallery" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a9fe8] rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverTab("upload")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "upload"
                          ? "text-white font-semibold"
                          : "text-[#8e92ab] hover:text-white"
                      )}
                    >
                      Carregar
                      {coverTab === "upload" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a9fe8] rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverTab("link")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "link"
                          ? "text-white font-semibold"
                          : "text-[#8e92ab] hover:text-white"
                      )}
                    >
                      Link
                      {coverTab === "link" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a9fe8] rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverTab("unsplash")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "unsplash"
                          ? "text-white font-semibold"
                          : "text-[#8e92ab] hover:text-white"
                      )}
                    >
                      Unsplash
                      {coverTab === "unsplash" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a9fe8] rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Botão Remover Capa */}
                  <button
                    type="button"
                    onClick={() => handleSelectCover(undefined)}
                    className="text-[12px] text-[#989cb3] hover:text-rose-400 pb-2 transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                </div>

                {/* Conteúdo da Aba: Galeria (Cores e Gradientes do Print 2) */}
                {coverTab === "gallery" && (
                  <div className="p-3.5 space-y-2.5">
                    <span className="text-[11.5px] font-medium text-[#8e92ab] block">
                      Cor e Gradiente
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {NOTION_COVER_PALETTE.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          title={item.label}
                          onClick={() => handleSelectCover(item.value)}
                          className={cn(
                            "h-[38px] rounded-[7px] border border-white/10 hover:scale-[1.04] transition-all cursor-pointer relative shadow-sm",
                            coverUrl === item.value && "ring-2 ring-white"
                          )}
                          style={{
                            background: item.value,
                          }}
                        >
                          {coverUrl === item.value && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow absolute inset-0 m-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conteúdo da Aba: Carregar (Upload do Computador) */}
                {coverTab === "upload" && (
                  <div className="p-4 space-y-3 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-[#3a3d52] hover:border-[#5e43d8] rounded-[10px] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[#15161e]"
                    >
                      <Upload className="w-6 h-6 text-[#8e92ab]" />
                      <span className="text-[12.5px] font-medium text-white">
                        Escolher uma imagem
                      </span>
                      <span className="text-[11px] text-[#7c809a]">
                        JPG, PNG ou GIF (máx. 5MB)
                      </span>
                    </div>
                  </div>
                )}

                {/* Conteúdo da Aba: Link */}
                {coverTab === "link" && (
                  <div className="p-4 space-y-3">
                    <span className="text-[11.5px] font-medium text-[#8e92ab] block">
                      Link da imagem
                    </span>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (linkInput.trim()) {
                          handleSelectCover(linkInput.trim());
                          setLinkInput("");
                        }
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Cole o link da imagem..."
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        className="h-8 text-xs bg-[#131520] border-[#2c2f48] text-white"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 px-3 bg-[#1a9fe8] hover:bg-[#1688c7] text-white text-xs cursor-pointer"
                      >
                        Aplicar
                      </Button>
                    </form>
                  </div>
                )}

                {/* Conteúdo da Aba: Unsplash */}
                {coverTab === "unsplash" && (
                  <div className="p-3.5 space-y-2">
                    <span className="text-[11.5px] font-medium text-[#8e92ab] block">
                      Fotos populares
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {UNSPLASH_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleSelectCover(p.url)}
                          className="h-[52px] rounded-[7px] overflow-hidden border border-white/10 hover:scale-[1.03] transition-transform cursor-pointer relative"
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={() => {
                setCoverPosition((prev) =>
                  prev === "center" ? "top" : prev === "top" ? "bottom" : "center"
                );
              }}
              title="Reposicionar alinhamento da imagem"
              className="h-7 px-2.5 rounded-[6px] bg-black/60 hover:bg-black/85 backdrop-blur-md text-[12px] font-medium text-white/90 hover:text-white border border-white/10 shadow-sm flex items-center gap-1 transition-all cursor-pointer outline-none"
            >
              <span>Reposicionar</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectCover(undefined)}
              title="Remover capa"
              className="h-7 px-2 rounded-[6px] bg-black/60 hover:bg-black/85 backdrop-blur-md text-[12px] font-medium text-[#c4c8de] hover:text-rose-300 border border-white/10 shadow-sm flex items-center gap-1 transition-all cursor-pointer outline-none"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* =================================================================== */}
      {/* 3. NOTION QUICK ACTIONS & TITLE AREA                                */}
      {/* =================================================================== */}
      <div className="group/notion-top px-6 pt-3 pb-1">
        {/* Botões Notion de Adicionar ícone / Adicionar capa (Aparecem SOMENTE no hover!) */}
        {(!coverUrl || !icon) && (
          <div
            className={cn(
              "flex items-center gap-1.5 transition-all duration-200",
              // Só aparece se passar o hover aí próximo (igual como é no Notion!)
              "opacity-0 group-hover/notion-top:opacity-100 pointer-events-none group-hover/notion-top:pointer-events-auto",
              icon ? "mb-1" : "mb-2 min-h-[28px]"
            )}
          >
            {!icon && (
              <button
                type="button"
                onClick={() => {
                  handleSelectIcon("😍");
                  setIsIconPopoverOpen(true);
                }}
                className="h-[28px] px-2.5 rounded-[6px] hover:bg-white/[0.06] hover:text-white text-[#8e92ab] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Smile className="w-4 h-4 text-[#8e92ab]" />
                <span>Adicionar ícone</span>
              </button>
            )}

            {!coverUrl && (
              <button
                type="button"
                onClick={() => {
                  setCoverUrl("#1a9fe8");
                  syncTaskField({ coverUrl: "#1a9fe8" });
                  setIsCoverPopoverOpen(true);
                }}
                className="h-[28px] px-2.5 rounded-[6px] hover:bg-white/[0.06] hover:text-white text-[#8e92ab] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-[#8e92ab]" />
                <span>Adicionar capa</span>
              </button>
            )}
          </div>
        )}

        {/* Ícone sobreposto Notion Style (se houver ícone) */}
        {icon && (
          <div
            className={cn(
              "flex items-center gap-3 relative z-10 select-none",
              coverUrl ? "-mt-8 mb-2" : "mb-3"
            )}
          >
            <Popover
              open={isIconPopoverOpen}
              onOpenChange={setIsIconPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Clique para alterar ou remover ícone"
                  className="rounded-[10px] p-1 bg-[#141522] border border-[#2a2c42] hover:border-[#5e43d8] transition-colors cursor-pointer shadow-md flex items-center justify-center outline-none"
                >
                  {icon === "board" ? (
                    <PurpleBoardIcon />
                  ) : (
                    <span className="text-[34px] leading-none inline-block">
                      {icon}
                    </span>
                  )}
                </button>
              </PopoverTrigger>

              {/* Popover Notion Style de Ícone */}
              <PopoverContent
                align="start"
                className="w-[280px] p-3 bg-[#1c1d24] border-[#2c2e3d] text-white shadow-2xl rounded-[12px] space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-[#2a2d3e] pb-2">
                  <span className="text-[12px] font-semibold text-white">
                    Escolher Ícone
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectIcon(undefined)}
                    className="text-[11.5px] text-[#989cb3] hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {NOTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectIcon(emoji)}
                      className={cn(
                        "h-8 rounded-[6px] hover:bg-white/[0.08] text-[20px] flex items-center justify-center transition-colors cursor-pointer",
                        icon === emoji && "bg-white/[0.12] ring-1 ring-[#7c5dfa]"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#2a2d3e] pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectIcon("board")}
                    className="w-full h-8 px-2.5 rounded-[6px] hover:bg-white/[0.06] flex items-center gap-2 text-[12px] text-[#d8dbe8] transition-colors cursor-pointer"
                  >
                    <PurpleBoardIcon />
                    <span>Ícone Padrão IDE Gestor</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Título & Subtítulo */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  syncTaskField({ title: title.trim() || defaultTitle });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setIsEditingTitle(false);
                    syncTaskField({ title: title.trim() || defaultTitle });
                  }
                }}
                className="h-8 text-[20px] font-bold bg-[#1a1c2d] border-[#5e43d8] text-white px-2"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-[21px] font-bold text-white leading-[1.2] tracking-[-0.01em] cursor-text hover:text-white/90 transition-colors"
                title="Clique para editar o título"
              >
                {title}
              </h2>
            )}

            {isEditingSubtitle ? (
              <Input
                autoFocus
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                onBlur={() => {
                  setIsEditingSubtitle(false);
                  syncTaskField({ subtitle });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setIsEditingSubtitle(false);
                    syncTaskField({ subtitle });
                  }
                }}
                className="h-7 mt-1 text-[12.5px] bg-[#1a1c2d] border-[#5e43d8] text-[#c8cce0] px-2"
              />
            ) : (
              <p
                onClick={() => setIsEditingSubtitle(true)}
                className="text-[12.5px] text-[#989cb3] mt-0.5 leading-snug cursor-text hover:text-[#c8cce0] transition-colors"
                title="Clique para editar o subtítulo"
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. SEÇÃO DE PROPRIEDADES (MINIMALISTA OU EXPANDIDA)                */}
        {/* ================================================================= */}
        <div className="mt-3.5">
          {!isPropertiesExpanded ? (
            /* Versão minimalista em 1 linha com os mesmos pills funcionais e bonitos de Anexo 2 */
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {/* 1. Status Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-[26px] rounded-full border border-[#23263a] bg-[#131520] hover:bg-[#181a28] px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#d8dbe8] transition-all cursor-pointer outline-none shrink-0"
                  >
                    <StatusIcon status={status} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{getStatusDefinition(status).label}</span>
                    <ChevronDown className="w-3 h-3 text-[#8e92ab] shrink-0 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="p-0 bg-transparent border-none shadow-none"
                >
                  <StatusDropdownContent
                    currentStatus={status}
                    onSelectStatus={handleSelectStatus}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Prioridade Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "h-[26px] rounded-[7px] border px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition-all hover:brightness-110 cursor-pointer outline-none shrink-0",
                      getPriorityPillStyle(priority)
                    )}
                  >
                    <PriorityIcon priority={priority} />
                    <span>{normalizeTaskPriority(priority)}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-40 bg-[#1a1c2d] border-[#2c2f48] text-white p-1"
                >
                  <DropdownMenuLabel className="text-[11px] font-semibold text-[#8e92ab] uppercase px-2 py-1">
                    Prioridade
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#2c2f48]/70 my-1" />
                  {ALL_CANONICAL_PRIORITIES.map((p) => {
                    const isSel = normalizeTaskPriority(priority) === p;
                    return (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => handleSelectPriority(p)}
                        className={cn(
                          "text-xs justify-between cursor-pointer rounded-md px-2 py-1.5",
                          isSel
                            ? "bg-[#252840] text-white font-semibold"
                            : "hover:bg-[#202336] text-[#d1d5db]"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <PriorityIcon priority={p} />
                          <span>{p}</span>
                        </span>
                        {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3. Prazo Pill */}
              <NotionDatePicker
                startDate={dueDate}
                priority={priority}
                onPriorityChange={(p) => {
                  const norm = normalizeTaskPriority(p);
                  setPriority(norm);
                  syncTaskField({ priority: norm });
                }}
                allowRange
                placeholder="Definir prazo"
                onChange={({ startDate }) => {
                  const val = startDate || "";
                  setDueDate(val);
                  syncTaskField({ dueDate: val });
                }}
                triggerClassName="h-[26px] rounded-full border border-[#292c42] bg-[#161826] hover:border-[#3d4160] px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white transition-colors cursor-pointer outline-none shrink-0"
                renderTrigger={({ open }) => (
                  <button
                    type="button"
                    onClick={open}
                    className="h-[26px] rounded-full border border-[#292c42] bg-[#161826] hover:border-[#3d4160] px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white transition-colors cursor-pointer outline-none shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#8e92ab]" />
                    <span>{formatPillDate(dueDate)}</span>
                  </button>
                )}
              />

              {/* 4. Projeto / Módulo Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-[26px] rounded-full border border-[#3e2e6e] bg-[#241b42] hover:brightness-110 px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#e9d5ff] transition-all cursor-pointer outline-none shrink-0"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0" />
                    <span className="truncate max-w-[150px]">
                      {projectName || "Site - Graci (Power RH)"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-56 bg-[#1a1c2d] border-[#2c2f48] text-white"
                >
                  {PROJECT_OPTIONS.map((proj) => (
                    <DropdownMenuItem
                      key={proj}
                      onClick={() => {
                        setProjectName(proj);
                        syncTaskField({ projectName: proj });
                      }}
                      className="text-xs justify-between cursor-pointer"
                    >
                      <span className="truncate">{proj}</span>
                      {projectName === proj && (
                        <Check className="w-3.5 h-3.5 text-[#7c5dfa]" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 5. Responsável Pill com avatar do Will integrado */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-[26px] rounded-full border border-[#292c42] bg-[#161826] hover:border-[#3d4160] pl-1 pr-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white transition-colors cursor-pointer outline-none shrink-0"
                  >
                    <img
                      src="/avatars/will.png"
                      alt={assignee || "Will"}
                      className="w-[20px] h-[20px] rounded-full object-cover border border-[#2e324a] shrink-0"
                    />
                    <span>{assignee || "Will"}</span>
                    <ChevronDown className="w-3 h-3 text-[#8e92ab]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-44 bg-[#1a1c2d] border-[#2c2f48] text-white p-1"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setAssignee("Will");
                      setAssigneeAvatar("/avatars/will.png");
                      syncTaskField({ assignee: "Will", assigneeAvatar: "/avatars/will.png" });
                    }}
                    className="text-xs gap-2 justify-between cursor-pointer rounded-md px-2 py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <img
                        src="/avatars/will.png"
                        alt="Will"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>Will</span>
                    </span>
                    {assignee === "Will" && (
                      <Check className="w-3.5 h-3.5 text-[#7c5dfa]" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAssignee("");
                      setAssigneeAvatar("");
                      syncTaskField({ assignee: "", assigneeAvatar: "" });
                    }}
                    className="text-xs gap-2 justify-between cursor-pointer rounded-md px-2 py-1.5 text-[#8e92ab]"
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Sem responsável</span>
                    </span>
                    {!assignee && (
                      <Check className="w-3.5 h-3.5 text-[#7c5dfa]" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Angle/Chevron padrão no canto direito para expandir */}
              <button
                type="button"
                onClick={() => setIsPropertiesExpanded(true)}
                className="h-6 w-6 rounded-[6px] hover:bg-white/[0.06] text-[#8e92ab] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-auto"
                title="Expandir propriedades"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Versão expandida com os 7 metadata cards completos (Anexo 2) */
            <div className="space-y-2">
              {/* Header com o angle padrão no canto direito para recolher */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#8e92ab]" />
                  <span className="text-[13px] font-bold text-white">Propriedades</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPropertiesExpanded(false)}
                  className="h-6 w-6 rounded-[6px] hover:bg-white/[0.06] text-[#8e92ab] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Recolher propriedades"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Row 1: Status | Prioridade | Prazo | Projeto / Módulo */}
              <div className="grid grid-cols-2 sm:grid-cols-[1.05fr_0.95fr_1fr_1.2fr] gap-2">
                {/* Card 1: Status */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <StatusHexagonIcon className="text-[#8e92ab]" />
                    <span>Status</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full h-[26px] rounded-full border px-2.5 flex items-center justify-between text-[11.5px] font-semibold transition-all hover:brightness-110 cursor-pointer outline-none",
                            getStatusDefinition(status).bgColor,
                            getStatusDefinition(status).borderColor,
                            getStatusDefinition(status).textColor
                          )}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <StatusIcon status={status} className="w-4 h-4 shrink-0" />
                            <span className="truncate">{getStatusDefinition(status).label}</span>
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0 ml-1" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="p-0 bg-transparent border-none shadow-none"
                      >
                        <StatusDropdownContent
                          currentStatus={status}
                          onSelectStatus={handleSelectStatus}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Card 2: Prioridade */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <SignalBarsIcon className="text-[#8e92ab]" />
                    <span>Prioridade</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-[26px] rounded-[7px] border px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition-all hover:brightness-110 cursor-pointer outline-none",
                            getPriorityPillStyle(priority)
                          )}
                        >
                          <PriorityIcon priority={priority} />
                          <span>{normalizeTaskPriority(priority)}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-40 bg-[#1a1c2d] border-[#2c2f48] text-white p-1"
                      >
                        <DropdownMenuLabel className="text-[11px] font-semibold text-[#8e92ab] uppercase px-2 py-1">
                          Prioridade
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#2c2f48]/70 my-1" />
                        {ALL_CANONICAL_PRIORITIES.map((p) => {
                          const isSel = normalizeTaskPriority(priority) === p;
                          return (
                            <DropdownMenuItem
                              key={p}
                              onClick={() => handleSelectPriority(p)}
                              className={cn(
                                "text-xs justify-between cursor-pointer rounded-md px-2 py-1.5",
                                isSel
                                  ? "bg-[#252840] text-white font-semibold"
                                  : "hover:bg-[#202336] text-[#d1d5db]"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <PriorityIcon priority={p} />
                                <span>{p}</span>
                              </span>
                              {isSel && (
                                <Check className="w-3.5 h-3.5 text-white" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Card 3: Prazo */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <Calendar className="w-3.5 h-3.5 text-[#8e92ab]" />
                    <span>Prazo</span>
                  </div>
                  <div className="mt-1.5">
                    <NotionDatePicker
                      startDate={dueDate}
                      priority={priority}
                      onPriorityChange={(p) => {
                        const norm = normalizeTaskPriority(p);
                        setPriority(norm);
                        syncTaskField({ priority: norm });
                      }}
                      allowRange
                      placeholder="Definir prazo"
                      onChange={({ startDate }) => {
                        const val = startDate || "";
                        setDueDate(val);
                        syncTaskField({ dueDate: val });
                      }}
                      triggerClassName="h-[26px] rounded-full border border-[#292c42] bg-[#161826] px-3 inline-flex items-center text-[11.5px] font-semibold text-white hover:border-[#3d4160] transition-colors cursor-pointer outline-none"
                      renderTrigger={({ open }) => (
                        <button
                          type="button"
                          onClick={open}
                          className="h-[26px] rounded-full border border-[#292c42] bg-[#161826] px-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white hover:border-[#3d4160] transition-colors cursor-pointer outline-none"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#8e92ab]" />
                          <span>{formatPillDate(dueDate)}</span>
                        </button>
                      )}
                    />
                  </div>
                </div>

                {/* Card 4: Projeto / Módulo */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <Layers className="w-3.5 h-3.5 text-[#8e92ab]" />
                    <span>Projeto / Módulo</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-[26px] max-w-full rounded-full border border-[#3e2e6e] bg-[#241b42] px-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#e9d5ff] hover:brightness-110 transition-all truncate cursor-pointer outline-none"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0" />
                          <span className="truncate">{projectName || "Selecionar projeto"}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 bg-[#1a1c2d] border-[#2c2f48] text-white"
                      >
                        {PROJECT_OPTIONS.map((proj) => (
                          <DropdownMenuItem
                            key={proj}
                            onClick={() => {
                              setProjectName(proj);
                              syncTaskField({ projectName: proj });
                            }}
                            className="text-xs justify-between cursor-pointer"
                          >
                            <span className="truncate">{proj}</span>
                            {projectName === proj && (
                              <Check className="w-3.5 h-3.5 text-[#7c5dfa]" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Row 2: Responsável | Etiquetas | Estimativa */}
              <div className="grid grid-cols-1 sm:grid-cols-[1.18fr_1.68fr_1fr] gap-2">
                {/* Card 5: Responsável */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <User className="w-3.5 h-3.5 text-[#8e92ab]" />
                    <span>Responsável</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-[28px] rounded-full border border-[#292c42] bg-[#161826] pl-1.5 pr-3 flex items-center justify-between text-[11.5px] font-semibold text-white hover:border-[#3d4160] transition-colors cursor-pointer outline-none"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img
                              src="/avatars/will.png"
                              alt={assignee || "Will"}
                              className="w-[20px] h-[20px] rounded-full object-cover border border-[#2e324a] shrink-0"
                            />
                            <span className="truncate">{assignee || "Will"}</span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-[#8e92ab] shrink-0 ml-1" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-48 bg-[#1a1c2d] border-[#2c2f48] text-white p-1"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setAssignee("Will");
                            setAssigneeAvatar("/avatars/will.png");
                            syncTaskField({ assignee: "Will", assigneeAvatar: "/avatars/will.png" });
                          }}
                          className="text-xs gap-2 justify-between cursor-pointer rounded-md px-2 py-1.5"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <img
                              src="/avatars/will.png"
                              alt="Will"
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span className="truncate">Will</span>
                          </span>
                          {assignee === "Will" && (
                            <Check className="w-3.5 h-3.5 text-[#7c5dfa]" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setAssignee("");
                            setAssigneeAvatar("");
                            syncTaskField({ assignee: "", assigneeAvatar: "" });
                          }}
                          className="text-xs gap-2 justify-between cursor-pointer rounded-md px-2 py-1.5 text-[#8e92ab]"
                        >
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Sem responsável</span>
                          </span>
                          {!assignee && (
                            <Check className="w-3.5 h-3.5 text-[#7c5dfa]" />
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Card 6: Etiquetas */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <Tag className="w-3.5 h-3.5 text-[#8e92ab]" />
                    <span>Etiquetas</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {tags.map((t, idx) => (
                      <span
                        key={t}
                        className={cn(
                          "h-[25px] rounded-[7px] border px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium",
                          getTagChipStyle(t, idx)
                        )}
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          aria-label={`Remover etiqueta ${t}`}
                          className="opacity-80 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    <Popover
                      open={isTagPopoverOpen}
                      onOpenChange={setIsTagPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="Adicionar etiqueta"
                          className="h-[25px] w-[25px] rounded-[7px] border border-[#2c2f44] bg-[#202232] inline-flex items-center justify-center text-[#989cb3] hover:text-white hover:border-[#3d4160] transition-colors cursor-pointer outline-none"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-48 p-2.5 bg-[#1a1c2d] border-[#2c2f48] text-white"
                      >
                        <form onSubmit={handleAddTag} className="flex gap-1.5">
                          <Input
                            autoFocus
                            placeholder="Nova etiqueta..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            className="h-7 text-xs bg-[#131520] border-[#2c2f48] text-white"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-7 px-2 bg-[#7c5dfa] hover:bg-[#6e51f9] text-white text-xs cursor-pointer"
                          >
                            OK
                          </Button>
                        </form>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Card 7: Estimativa */}
                <div className="rounded-[11px] border border-[#23263a] bg-[#131520] px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8e92ab]">
                    <Clock className="w-3.5 h-3.5 text-[#8e92ab]" />
                    <span>Estimativa</span>
                  </div>
                  <div className="mt-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-[26px] rounded-[7px] border border-[#2a2c3e] bg-[#202232] px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white hover:border-[#3d4160] transition-colors cursor-pointer outline-none"
                        >
                          <Flame className="w-3 h-3 text-[#989cb3]" />
                          <span>{estimate || "Definir"}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-44 p-2.5 bg-[#1a1c2d] border-[#2c2f48] text-white space-y-1.5"
                      >
                        <span className="text-[11px] text-[#989cb3] font-medium block">
                          Tempo estimado
                        </span>
                        <Input
                          value={estimate}
                          onChange={(e) => {
                            setEstimate(e.target.value);
                            syncTaskField({ estimate: e.target.value });
                          }}
                          className="h-7 text-xs bg-[#131520] border-[#2c2f48] text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. DESCRIÇÃO SECTION                                                */}
      {/* =================================================================== */}
      <div className="px-6 pt-3 pb-3.5 border-b border-[#242638]">
        {/* Cabeçalho da descrição com angle padronizado */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsDescOpen((prev) => !prev)}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left"
          >
            <AlignLeft className="w-4 h-4 text-[#8e92ab]" />
            <h3 className="text-[14px] font-bold text-white">Descrição</h3>
          </button>

          <button
            type="button"
            onClick={() => setIsDescOpen((prev) => !prev)}
            className="h-6 w-6 rounded-[6px] hover:bg-white/[0.06] text-[#8e92ab] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isDescOpen ? "Recolher descrição" : "Expandir descrição"}
          >
            {isDescOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Caixa de descrição (visível apenas quando descolapsada) */}
        {isDescOpen && (
          <div className="mt-2.5 rounded-[11px] border border-[#282b3e] bg-[#1c1e2b] px-3.5 py-2.5 text-[13px] leading-[1.55] transition-colors focus-within:border-[#5e43d8]">
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                syncTaskField({ description: e.target.value });
              }}
              placeholder="Adicione uma descrição detalhada da tarefa..."
              rows={4}
              className="w-full bg-transparent border-0 p-0 text-[13px] leading-[1.55] text-[#d8dbe8] placeholder:text-[#6e728c] focus-visible:ring-0 resize-none shadow-none"
            />
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. CHECKLIST & SUBTAREFAS SECTION                                   */}
      {/* =================================================================== */}
      <div className="px-6 pt-3.5 pb-4 border-b border-[#242638]">
        {/* Section Title + Progress Counter + Arrow > / v */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsChecklistOpen((prev) => !prev)}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer group text-left"
          >
            <CheckSquare className="w-4 h-4 text-[#8e92ab]" />
            <h3 className="text-[14px] font-bold text-white">
              Checklist & Subtarefas
            </h3>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-[#8e92ab]">
              {completedSubtasksCount} de {totalSubtasksCount} concluídas ({progressPercent}%)
            </span>
            <button
              type="button"
              onClick={() => setIsChecklistOpen((prev) => !prev)}
              className="h-6 w-6 rounded-[6px] hover:bg-white/[0.06] text-[#8e92ab] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isChecklistOpen ? "Recolher checklist" : "Expandir checklist"}
            >
              {isChecklistOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Purple Progress Bar */}
        <div className="h-[9px] w-full rounded-full bg-[#3b3d4e] overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7c5dfa] to-[#9476ff] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Conteúdo colapsável com isChecklistOpen */}
        {isChecklistOpen && (
          <>
            <div className="space-y-2">
            {groupedSubtasks.map(([groupName, groupItems]) => {
            const isCollapsed = Boolean(collapsedGroups[groupName]);
            const groupDone = groupItems.filter((i) => i.completed).length;
            const groupTotal = groupItems.length;

            return (
              <div
                key={groupName}
                className="rounded-[11px] border border-[#282b3e] bg-[#1a1c28] overflow-hidden"
              >
                {/* Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(groupName)}
                  className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#989cb3]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#989cb3]" />
                    )}
                    <span className="text-[13px] font-bold text-white">
                      {groupName}
                    </span>
                  </div>

                  <span className="rounded-full bg-[#2a2d3e] px-2.5 py-0.2 text-[11px] font-bold text-[#d8dbe8]">
                    {groupDone}/{groupTotal}
                  </span>
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div>
                    {(() => {
                      const rootItems = groupItems.filter((i) => !i.parentId);
                      return rootItems.map((item) => {
                        const childItems = groupItems.filter((ch) => ch.parentId === item.id);
                        const hasSubtaskMeta = Boolean(
                          (item.dueDate && item.dueDate.trim() !== "") ||
                          (item.assignee && item.assignee.trim() !== "") ||
                          item.inProgress ||
                          childItems.length > 0
                        );

                        return (
                          <React.Fragment key={item.id}>
                            <div className="px-3.5 py-1.5 border-t border-[#242736] flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors group/mitem">
                              <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => handleToggleSubtask(item.id)}
                                  className="sr-only"
                                />
                                {hasSubtaskMeta ? (
                                  item.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#7c5dfa] shrink-0" />
                                  ) : (
                                    <CircleDashed className="w-4 h-4 text-[#8e92ab] shrink-0" />
                                  )
                                ) : item.completed ? (
                                  <span className="w-4 h-4 rounded-[4px] bg-[#7c5dfa] border border-[#8e73ff] flex items-center justify-center text-white shrink-0 shadow-[0_1px_6px_rgba(124,93,250,0.4)]">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="w-4 h-4 rounded-[4px] border-[1.5px] border-[#8e92ab] hover:border-white bg-transparent shrink-0 transition-colors" />
                                )}

                                <span
                                  className={cn(
                                    "text-[12.5px] truncate transition-colors",
                                    item.completed
                                      ? "line-through decoration-[#8e92ab]/75 text-[#8e92ab]"
                                      : "text-[#e4e6f2] font-medium"
                                  )}
                                >
                                  {item.title}
                                </span>
                              </label>

                              {/* Ações / Metadados à Direita */}
                              <div className="flex items-center gap-2 shrink-0">
                                {hasSubtaskMeta ? (
                                  <div className="rounded-[5px] bg-[#111218] border border-[#232534] px-2 py-0.5 flex flex-col min-w-[148px] -my-0.5">
                                    <div className="flex items-center justify-between gap-2.5 text-[8.5px] text-[#7c809a] pb-0.5 border-b border-[#222432]">
                                      <span>Data de vencimento</span>
                                      <span className="flex items-center gap-1">
                                        <span>Respons...</span>
                                        <button
                                          type="button"
                                          onClick={() => handleAddChildSubtaskItem(item.id, groupName)}
                                          className="w-2.5 h-2.5 rounded-full bg-[#7c5dfa] hover:bg-[#6c4ded] text-white inline-flex items-center justify-center text-[7.5px] font-bold cursor-pointer"
                                          title="Adicionar sub-item"
                                        >
                                          +
                                        </button>
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2.5 pt-0.5">
                                      <NotionDatePicker
                                        startDate={item.dueDate}
                                        allowRange
                                        placeholder="Definir data"
                                        onChange={({ startDate }) =>
                                          handleUpdateSubtaskMeta(item.id, {
                                            dueDate: startDate || undefined,
                                          })
                                        }
                                        renderTrigger={({ open }) => (
                                          <button
                                            type="button"
                                            onClick={open}
                                            className="text-[10px] font-semibold text-[#82b4ff] hover:underline cursor-pointer"
                                          >
                                            {item.dueDate || "25/11/26"}
                                          </button>
                                        )}
                                      />
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            className="p-0 border-0 bg-transparent cursor-pointer"
                                            title={item.assignee || "Will"}
                                          >
                                            <img
                                              src="/avatars/will.png"
                                              alt={item.assignee || "Will"}
                                              className="w-4 h-4 rounded-full object-cover border border-[#2e324a]"
                                            />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-36 bg-[#1a1c2d] border-[#2c2f48] text-white p-1">
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateSubtaskMeta(item.id, { assignee: "Will", assigneeAvatar: "/avatars/will.png" })}
                                            className="text-xs gap-1.5 cursor-pointer"
                                          >
                                            <img src="/avatars/will.png" alt="Will" className="w-3.5 h-3.5 rounded-full" />
                                            <span>Will</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateSubtaskMeta(item.id, { assignee: undefined, assigneeAvatar: undefined })}
                                            className="text-xs text-muted-foreground cursor-pointer"
                                          >
                                            <User className="w-3.5 h-3.5" />
                                            <span>Limpar</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="opacity-0 group-hover/mitem:opacity-100 flex items-center gap-1.5 transition-opacity">
                                    <NotionDatePicker
                                      startDate={item.dueDate}
                                      allowRange
                                      placeholder="+ Prazo"
                                      onChange={({ startDate }) =>
                                        handleUpdateSubtaskMeta(item.id, {
                                          dueDate: startDate || undefined,
                                        })
                                      }
                                      renderTrigger={({ open }) => (
                                        <button
                                          type="button"
                                          onClick={open}
                                          className="h-[20px] rounded border border-[#2b2e44] bg-[#161826] px-1.5 inline-flex items-center gap-1 text-[9.5px] text-[#8e92ab] hover:text-white hover:border-[#3b82f6] cursor-pointer"
                                        >
                                          <Calendar className="w-2.5 h-2.5" />
                                          <span>+ Prazo</span>
                                        </button>
                                      )}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSubtaskMeta(item.id, { assignee: "Will", assigneeAvatar: "/avatars/will.png" })}
                                      className="h-[20px] rounded border border-[#2b2e44] bg-[#161826] px-1.5 inline-flex items-center gap-1 text-[9.5px] text-[#8e92ab] hover:text-white hover:border-[#3b82f6] cursor-pointer"
                                    >
                                      <User className="w-2.5 h-2.5" />
                                      <span>+ Resp</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddChildSubtaskItem(item.id, groupName)}
                                      className="h-[20px] rounded border border-[#2b2e44] bg-[#161826] px-1.5 inline-flex items-center text-[9.5px] text-[#8e92ab] hover:text-white hover:border-[#3b82f6] cursor-pointer"
                                    >
                                      + Sub
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubtaskItem(item.id)}
                                      className="p-1 text-[#8e92ab] hover:text-destructive cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sub-itens Filhos (Aninhados abaixo do item pai) */}
                            {childItems.map((ch) => (
                              <div
                                key={ch.id}
                                className="pl-9 pr-3.5 py-1.5 border-t border-[#202332] bg-[#141520]/60 flex items-center justify-between gap-2.5 hover:bg-white/[0.02] transition-colors group/mchild relative"
                              >
                                <div className="absolute left-[20px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] border-b-[2px] border-l-[2px] border-[#7c5dfa]/60 rounded-bl-[4px] pointer-events-none" />
                                <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={ch.completed}
                                    onChange={() => handleToggleSubtask(ch.id)}
                                    className="sr-only"
                                  />
                                  {ch.completed ? (
                                    <span className="w-3.5 h-3.5 rounded-[3px] bg-[#7c5dfa] border border-[#8e73ff] flex items-center justify-center text-white shadow-xs">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </span>
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#8e92ab] hover:border-white bg-transparent shrink-0 transition-colors" />
                                  )}
                                  <span
                                    className={cn(
                                      "text-[12px] truncate",
                                      ch.completed
                                        ? "line-through text-[#8e92ab]"
                                        : "text-[#d1d5db]"
                                    )}
                                  >
                                    {ch.title}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubtaskItem(ch.id)}
                                  className="opacity-0 group-hover/mchild:opacity-100 p-1 text-[#8e92ab] hover:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Add Checklist Form */}
        {showAddChecklistItem && (
          <form
            onSubmit={handleAddChecklistSubtask}
            className="mt-2.5 rounded-[10px] border border-[#5e43d8] bg-[#1a1c28] p-2.5 flex flex-wrap items-center gap-2"
          >
            <Input
              autoFocus
              placeholder="Digite o título do item..."
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              className="flex-1 min-w-[200px] h-8 text-xs bg-[#131520] border-[#2c2f48] text-white"
            />
            <select
              value={newChecklistGroup}
              onChange={(e) => setNewChecklistGroup(e.target.value)}
              className="h-8 rounded-md border border-[#2c2f48] bg-[#131520] px-2 text-xs text-[#d8dbe8] outline-none"
            >
              {DEFAULT_GROUPS_ORDER.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              size="sm"
              className="h-8 px-3 bg-[#7c5dfa] hover:bg-[#6e51f9] text-white text-xs cursor-pointer"
            >
              Adicionar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddChecklistItem(false)}
              className="h-8 px-2 text-xs text-[#989cb3] hover:text-white cursor-pointer"
            >
              Cancelar
            </Button>
          </form>
        )}

            {/* Footer Buttons: + Adicionar item | ^ Recolher tudo */}
            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAddChecklistItem((prev) => !prev)}
                className="h-[30px] px-3 rounded-[9px] border border-[#5e43d8] bg-[#1e1938] hover:bg-[#28214a] text-[#c4b5fd] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar item</span>
              </button>

              <button
                type="button"
                onClick={handleCollapseOrExpandAll}
                className="h-[30px] px-3 rounded-[9px] border border-[#2a2d3e] bg-[#1a1c28] hover:bg-[#222536] text-[#c4c8de] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {allGroupsCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expandir tudo</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher tudo</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* =================================================================== */}
      {/* 7. ATIVIDADES | COMENTÁRIOS | ANEXOS SECTION                         */}
      {/* =================================================================== */}
      <div className="px-6 pt-3 pb-4 bg-[#11121d]">
        {/* Tabs Header + Arrow > / v */}
        <div className="flex items-center justify-between border-b border-[#232538] pb-1">
          <div className="flex items-center gap-6">
            {/* Aba 1: Atividades */}
            <button
              type="button"
              onClick={() => {
                setBottomTab("activities");
                setIsBottomOpen(true);
              }}
              className={cn(
                "pb-2 flex items-center gap-2 text-[12.5px] font-semibold transition-colors relative cursor-pointer",
                bottomTab === "activities"
                  ? "text-white"
                  : "text-[#8e92ab] hover:text-white"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-[#9476ff]" />
              <span>Atividades</span>
              {bottomTab === "activities" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#7c5dfa]" />
              )}
            </button>

            {/* Aba 2: Comentários */}
            <button
              type="button"
              onClick={() => {
                setBottomTab("comments");
                setIsBottomOpen(true);
              }}
              className={cn(
                "pb-2 flex items-center gap-2 text-[12.5px] font-semibold transition-colors relative cursor-pointer",
                bottomTab === "comments"
                  ? "text-white"
                  : "text-[#8e92ab] hover:text-white"
              )}
            >
              <MessageSquareMore className="w-3.5 h-3.5 text-[#9476ff]" />
              <span>Comentários</span>
              <span className="rounded-full bg-[#2a244d] text-[#c4b5fd] px-1.5 py-0.2 text-[10.5px] font-bold">
                {activeComments.length}
              </span>
              {bottomTab === "comments" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#7c5dfa]" />
              )}
            </button>

            {/* Aba 3: Anexos */}
            <button
              type="button"
              onClick={() => {
                setBottomTab("attachments");
                setIsBottomOpen(true);
              }}
              className={cn(
                "pb-2 flex items-center gap-2 text-[12.5px] font-semibold transition-colors relative cursor-pointer",
                bottomTab === "attachments"
                  ? "text-white"
                  : "text-[#8e92ab] hover:text-white"
              )}
            >
              <Paperclip className="w-3.5 h-3.5 text-[#9476ff]" />
              <span>Anexos</span>
              <span className="rounded-full bg-[#2a244d] text-[#c4b5fd] px-1.5 py-0.2 text-[10.5px] font-bold">
                0
              </span>
              {bottomTab === "attachments" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#7c5dfa]" />
              )}
            </button>
          </div>

          {/* Botão arrow > / v no canto superior direito */}
          <button
            type="button"
            onClick={() => setIsBottomOpen((prev) => !prev)}
            className="h-6 w-6 rounded-[6px] hover:bg-white/[0.06] text-[#8e92ab] hover:text-white flex items-center justify-center transition-colors cursor-pointer mb-1"
            title={isBottomOpen ? "Recolher seção" : "Expandir seção"}
          >
            {isBottomOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Conteúdo da seção inferior (Renderizado quando isBottomOpen === true) */}
        {isBottomOpen && (
          <div className="mt-3">
            {bottomTab === "activities" && (
              <div className="space-y-2 py-1 text-xs text-[#8e92ab]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c5dfa]" />
                  <span>
                    Tarefa criada por <strong className="text-white">Will</strong>
                  </span>
                  <span className="text-[10px] text-[#696d84] ml-auto">há 1 dia</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>
                    Status definido como{" "}
                    <strong className="text-white">
                      {getStatusDefinition(status).label}
                    </strong>
                  </span>
                  <span className="text-[10px] text-[#696d84] ml-auto">recente</span>
                </div>
              </div>
            )}

            {bottomTab === "comments" && (
              <>
                {/* Comment Composer */}
                <form
                  onSubmit={handleSubmitComment}
                  className="flex items-center gap-2.5"
                >
                  <img
                    src="/avatars/will.png"
                    alt="Will"
                    className="w-7 h-7 rounded-full object-cover border border-[#2a2d3e] shrink-0"
                  />

                  <div className="flex-1 flex items-center rounded-[10px] border border-[#282b3e] bg-[#181a28] pl-3 pr-1.5 py-1 focus-within:border-[#5e43d8] transition-colors">
                    <input
                      type="text"
                      placeholder="Adicionar um comentário..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-transparent text-[12.5px] text-white placeholder:text-[#7c809a] outline-none"
                    />

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Mencionar (@)"
                        onClick={() =>
                          setNewCommentText((prev) => `${prev}@Will `)
                        }
                        className="p-1 text-[#8e92ab] hover:text-white transition-colors cursor-pointer"
                      >
                        <AtSign className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Anexar arquivo"
                        className="p-1 text-[#8e92ab] hover:text-white transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="submit"
                        aria-label="Enviar comentário"
                        className="w-6 h-6 rounded-[7px] bg-[#6e51f9] hover:bg-[#7c5dfa] text-white flex items-center justify-center shadow-sm ml-1 transition-colors cursor-pointer"
                      >
                        <SendHorizontal className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Comments Feed */}
                <div className="mt-3 space-y-3">
                  {activeComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex items-start justify-between gap-2.5"
                    >
                      <img
                        src="/avatars/will.png"
                        alt={comment.author}
                        className="w-7 h-7 rounded-full object-cover border border-[#2a2d3e] shrink-0 mt-0.5"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-bold text-white">
                            {comment.author}
                          </span>
                          <span className="text-[11px] text-[#7c809a]">
                            {comment.timeAgo || "há 2 horas"}
                          </span>
                        </div>
                        <p className="text-[12.5px] text-[#c8cce0] mt-0.5 leading-snug">
                          {comment.content}
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-label="Opções do comentário"
                        className="p-1 text-[#7c809a] hover:text-white transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {bottomTab === "attachments" && (
              <div className="border border-dashed border-[#282b3e] rounded-[10px] p-6 text-center text-[#8e92ab] bg-[#141524]">
                <Paperclip className="w-6 h-6 mx-auto mb-2 text-[#686c85]" />
                <p className="text-xs font-medium text-[#d8dbe8]">
                  Nenhum anexo adicionado ainda
                </p>
                <p className="text-[11px] text-[#686c85] mt-1">
                  Arraste arquivos ou clique para fazer upload
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

TaskModalContent.displayName = "TaskModalContent";

export function TaskModal(props: TaskModalProps) {
  const contentRef = useRef<TaskModalContentHandle | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) {
      if (contentRef.current) {
        contentRef.current.requestClose();
      } else {
        props.onClose();
      }
    }
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        id="task-modal-content"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[800px] max-w-[800px] max-h-[96vh] overflow-y-auto p-0 gap-0 bg-[#141522] border border-[#2a2c42] rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.85)] outline-none"
        style={{ width: "800px", maxWidth: "min(800px, 96vw)" }}
      >
        {props.isOpen && (
          <TaskModalContent
            key={props.task?.id ?? `${props.initialStatus}-new`}
            ref={contentRef}
            onClose={props.onClose}
            task={props.task}
            initialStatus={props.initialStatus}
            onSave={props.onSave}
            onUpdateTask={props.onUpdateTask}
            onDelete={props.onDelete}
            onUpdateSubtasks={props.onUpdateSubtasks}
            onAddComment={props.onAddComment}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
