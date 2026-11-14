"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import Image from "next/image";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  Subtask,
  TaskComment,
} from "@/types/task";
import type { CrmProjectMember, CrmUserProfile } from "@gestor-ide/core";
import {
  normalizeTaskStatus,
  normalizeTaskPriority,
} from "@/types/task";
import {
  StatusIcon,
  StatusDropdownContent,
  getStatusDefinition,
} from "@/components/task-status-icon";
import {
  PriorityIcon,
  ALL_CANONICAL_PRIORITIES,
  getPriorityPillStyle,
} from "@/components/task-priority-icon";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { NotionDatePicker } from "@/components/ui/notion-date-picker";
import { formatNotionDate } from "@/lib/notion-date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  MessageSquareMore,
  MoreHorizontal,
  Paperclip,
  Plus,
  SendHorizontal,
  Share2,
  Smile,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  User,
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
  syncError?: string | null;
  remoteConflictWarning?: boolean;
  onReloadRemote?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  currentUser?: CrmUserProfile | null;
  members?: CrmProjectMember[];
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
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
  syncError?: string | null;
  remoteConflictWarning?: boolean;
  onReloadRemote?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  currentUser?: CrmUserProfile | null;
  members?: CrmProjectMember[];
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
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

function generateLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ensureGroupedSubtasks(rawSubtasks?: Subtask[]): Subtask[] {
  return rawSubtasks ?? [];
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
    syncError,
    remoteConflictWarning = false,
    onReloadRemote,
    onDirtyChange,
    currentUser = null,
    members = [],
    onChangeAssignee,
    initialStatus = "PENDENTE",
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
  const [isEditingTitle, setIsEditingTitle] = useState(!task);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);

  const [description, setDescription] = useState(defaultDescription);

  const [status, setStatus] = useState<TaskStatus>(() =>
    normalizeTaskStatus(task?.status ?? initialStatus ?? "PENDENTE")
  );
  const [priority, setPriority] = useState<TaskPriority>(() =>
    normalizeTaskPriority(task?.priority ?? "Normal")
  );
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const projectName = task?.projectName || "";
  const [assignee, setAssignee] = useState(task?.assignee || "");
  const [assigneeAvatar, setAssigneeAvatar] = useState(task?.assigneeAvatar || "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);
  const [tags, setTags] = useState<string[]>(
    task?.tags && task.tags.length > 0
      ? task.tags
      : task?.tag
        ? [task.tag]
        : []
  );
  const [newTagInput, setNewTagInput] = useState("");
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  const [estimate, setEstimate] = useState(task?.estimate ?? "");

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const didSaveRef = useRef(false);

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
    return isEditing && onUpdateSubtasks ? task?.subtasks ?? [] : localSubtasks;
  }, [isEditing, onUpdateSubtasks, task?.subtasks, localSubtasks]);

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
  const activeComments = isEditing && onAddComment ? task?.comments ?? [] : localComments;

  const [newCommentText, setNewCommentText] = useState("");

  const isDirty = Boolean(
    isEditingTitle ||
      isEditingSubtitle ||
      title !== defaultTitle ||
      subtitle !== defaultSubtitle ||
      description !== defaultDescription ||
      Boolean(newCommentText.trim()) ||
      Boolean(newChecklistTitle.trim())
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => {
      onDirtyChange?.(false);
    };
  }, [isDirty, onDirtyChange]);

  const actorName = currentUser?.name || currentUser?.email || "Você";
  const mentionTargetName =
    members[0]?.user.name || members[0]?.user.email || currentUser?.name || "equipe";

  function syncTaskField(patch: Partial<Task>) {
    if (!task) return;
    const updated: Task = {
      ...task,
      title,
      subtitle,
      description,
      status,
      priority,
      startDate,
      dueDate,
      projectName,
      assigneeId: assigneeId || undefined,
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

  function buildNewTaskPayload() {
    return {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      status,
      priority,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      projectName: projectName || undefined,
      assigneeId: assigneeId || undefined,
      assignee: assignee || undefined,
      assigneeAvatar: assigneeAvatar || undefined,
      tags,
      tag: tags[0],
      estimate,
      coverUrl,
      icon,
      subtasks: activeSubtasks,
      comments: activeComments,
    };
  }

  function handleCreateTaskSubmit() {
    if (!title.trim()) {
      setTitleError("Informe um título para criar a tarefa.");
      setIsEditingTitle(true);
      return;
    }
    if (!task && !didSaveRef.current) {
      didSaveRef.current = true;
      onSave(buildNewTaskPayload());
    }
    onClose();
  }

  function handleClose() {
    if (!task && title.trim() && !didSaveRef.current) {
      didSaveRef.current = true;
      onSave(buildNewTaskPayload());
    }
    onClose();
  }

  useImperativeHandle(ref, () => ({
    requestClose: handleClose,
  }));

  // Botão Compartilhar: copia o link da tarefa e dá feedback visual
  function handleShare() {
    const shareParam = task?.code || task?.id;
    if (!shareParam || typeof window === "undefined" || !navigator.clipboard) {
      return;
    }
    const shareUrl = `${window.location.origin}/?modal=${encodeURIComponent(shareParam)}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setSharedFeedback(true);
        window.setTimeout(() => setSharedFeedback(false), 2000);
      })
      .catch(() => {});
  }

  function handleSelectCover(value?: string) {
    setCoverUrl(value);
    syncTaskField({ coverUrl: value });
    setIsCoverPopoverOpen(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Selecione um arquivo de imagem válido (JPG, PNG, GIF ou WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setUploadError(null);
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

  async function handleSelectAssignee(member: CrmProjectMember | null) {
    if (!task) {
      setAssigneeId(member?.userId ?? "");
      setAssignee(member?.user.name || member?.user.email || "");
      setAssigneeAvatar(member?.user.avatarUrl ?? "");
      return;
    }
    if (!onChangeAssignee || isSavingAssignee) return;
    setIsSavingAssignee(true);
    try {
      if (await onChangeAssignee(task.id, member)) {
        setAssigneeId(member?.userId ?? "");
        setAssignee(member?.user.name || member?.user.email || "");
        setAssigneeAvatar(member?.user.avatarUrl ?? "");
      }
    } finally {
      setIsSavingAssignee(false);
    }
  }

  const assigneeMenuItems = (
    <>
      {members.map((member) => (
        <DropdownMenuItem key={member.userId} onSelect={() => void handleSelectAssignee(member)}>
          <span className="flex-1 truncate">{member.user.name || member.user.email}</span>
          {assigneeId === member.userId && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      ))}
      <DropdownMenuItem onSelect={() => void handleSelectAssignee(null)}>
        <span className="flex-1">Sem responsável</span>
        {!assigneeId && <Check className="h-4 w-4" />}
      </DropdownMenuItem>
    </>
  );

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
      id: generateLocalId("st"),
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
      id: generateLocalId("st"),
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
      id: generateLocalId("c"),
      author: actorName,
      avatar: currentUser?.avatarUrl ?? undefined,
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
      return "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300";
    }
    return "bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300";
  }

  // Estilo da capa Notion
  const coverStyle = useMemo(() => {
    if (!coverUrl) return {};
    if (coverUrl.startsWith("http") || coverUrl.startsWith("data:image")) {
      return {
        backgroundImage: `url("${coverUrl.replace(/"/g, "%22")}")`,
        backgroundSize: "cover",
        backgroundPosition: coverPosition,
      };
    }
    return {
      background: coverUrl,
    };
  }, [coverUrl, coverPosition]);

  return (
    <div className="flex flex-col w-full bg-card text-card-foreground select-none">
      <DialogTitle className="sr-only">{title.trim() || "Nova tarefa"}</DialogTitle>
      <DialogDescription className="sr-only">
        {subtitle.trim() || "Detalhes e configurações da tarefa"}
      </DialogDescription>
      {syncError && <div role="alert" className="m-4 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{syncError}</div>}
      {remoteConflictWarning && (
        <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-secondary/70 px-3 py-2 text-xs text-secondary-foreground">
          <span>Esta tarefa foi atualizada no IDE CRM enquanto você editava. Suas alterações locais foram preservadas.</span>
          {onReloadRemote && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReloadRemote}
              className="h-7 px-2.5 text-xs cursor-pointer"
            >
              Recarregar versão do CRM
            </Button>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. TOP HEADER BAR                                                   */}
      {/* =================================================================== */}
      <div className="h-[38px] px-4 bg-muted/50 border-b border-border flex items-center justify-between shrink-0">
        {/* Esquerda: código real da tarefa ou "Nova tarefa" */}
        <div className="flex items-center gap-2">
          <span className="w-4 h-[1.5px] bg-muted-foreground/50 rounded-full inline-block" />
          <span className="text-[12.5px] font-medium text-muted-foreground tracking-wide">
            {task?.code || "Nova tarefa"}
          </span>
        </div>

        {/* Direita: Criar tarefa (quando nova) + Compartilhar + ... + Fechar */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {!task && (
            <Button
              type="button"
              size="sm"
              onClick={handleCreateTaskSubmit}
              className="h-[26px] px-2.5 text-[12px] font-semibold cursor-pointer"
            >
              Criar tarefa
            </Button>
          )}

          {/* Botão Compartilhar com cópia inteligente de link */}
          <button
            type="button"
            disabled={!task}
            onClick={handleShare}
            title={task ? "Copiar link e compartilhar" : "Crie a tarefa antes de compartilhar"}
            className={cn(
              "h-[26px] px-2.5 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer outline-none disabled:opacity-40 disabled:cursor-not-allowed",
              sharedFeedback
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {sharedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
                className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors cursor-pointer outline-none"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-popover border-border text-popover-foreground"
            >
              <DropdownMenuItem
                disabled={!task}
                onClick={handleShare}
                className="text-xs gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copiar link da tarefa</span>
              </DropdownMenuItem>
              {task && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="text-xs text-destructive focus:text-destructive gap-2 cursor-pointer"
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
            className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:text-foreground hover:bg-accent transition-colors cursor-pointer outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CAPA NOTION STYLE                                                */}
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

              {/* Popover Notion Style de Capa */}
              <PopoverContent
                align="end"
                className="w-[380px] p-0 bg-popover border-border text-popover-foreground shadow-2xl rounded-[12px] overflow-hidden"
              >
                {/* Abas Superiores do Popover */}
                <div className="flex items-center justify-between border-b border-border px-3 pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCoverTab("gallery")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "gallery"
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Galeria
                      {coverTab === "gallery" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverTab("upload")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "upload"
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Carregar
                      {coverTab === "upload" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverTab("link")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "link"
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Link
                      {coverTab === "link" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverTab("unsplash")}
                      className={cn(
                        "px-2.5 pb-2 text-[12.5px] font-medium transition-colors relative cursor-pointer",
                        coverTab === "unsplash"
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Unsplash
                      {coverTab === "unsplash" && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Botão Remover Capa */}
                  <button
                    type="button"
                    onClick={() => handleSelectCover(undefined)}
                    className="text-[12px] text-muted-foreground hover:text-destructive pb-2 transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                </div>

                {/* Conteúdo da Aba: Galeria */}
                {coverTab === "gallery" && (
                  <div className="p-3.5 space-y-2.5">
                    <span className="text-[11.5px] font-medium text-muted-foreground block">
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
                            "h-[38px] rounded-[7px] border border-border hover:scale-[1.04] transition-all cursor-pointer relative shadow-sm",
                            coverUrl === item.value && "ring-2 ring-primary"
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
                      className="border border-dashed border-border hover:border-primary rounded-[10px] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-muted/40"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[12.5px] font-medium text-foreground">
                        Escolher uma imagem
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        JPG, PNG, GIF ou WebP (máx. 5 MB)
                      </span>
                    </div>
                    {uploadError && (
                      <p role="alert" className="text-xs text-destructive">
                        {uploadError}
                      </p>
                    )}
                  </div>
                )}

                {/* Conteúdo da Aba: Link */}
                {coverTab === "link" && (
                  <div className="p-4 space-y-3">
                    <span className="text-[11.5px] font-medium text-muted-foreground block">
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
                        className="h-8 text-xs bg-background border-border text-foreground"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 px-3 text-xs cursor-pointer"
                      >
                        Aplicar
                      </Button>
                    </form>
                  </div>
                )}

                {/* Conteúdo da Aba: Unsplash */}
                {coverTab === "unsplash" && (
                  <div className="p-3.5 space-y-2">
                    <span className="text-[11.5px] font-medium text-muted-foreground block">
                      Fotos populares
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {UNSPLASH_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleSelectCover(p.url)}
                          className="h-[52px] rounded-[7px] overflow-hidden border border-border hover:scale-[1.03] transition-transform cursor-pointer relative"
                        >
                          <Image
                            src={p.url}
                            alt={p.label}
                            width={120}
                            height={52}
                            unoptimized
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
              className="h-7 px-2 rounded-[6px] bg-black/60 hover:bg-black/85 backdrop-blur-md text-[12px] font-medium text-white/80 hover:text-rose-300 border border-white/10 shadow-sm flex items-center gap-1 transition-all cursor-pointer outline-none"
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
        {/* Botões Notion de Adicionar ícone / Adicionar capa (Aparecem no hover) */}
        {(!coverUrl || !icon) && (
          <div
            className={cn(
              "flex items-center gap-1.5 transition-all duration-200",
              "opacity-0 group-hover/notion-top:opacity-100 pointer-events-none group-hover/notion-top:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto",
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
                className="h-[28px] px-2.5 rounded-[6px] hover:bg-accent hover:text-foreground text-muted-foreground text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Smile className="w-4 h-4 text-muted-foreground" />
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
                className="h-[28px] px-2.5 rounded-[6px] hover:bg-accent hover:text-foreground text-muted-foreground text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
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
                  className="rounded-[10px] p-1 bg-card border border-border hover:border-primary transition-colors cursor-pointer shadow-md flex items-center justify-center outline-none"
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
                className="w-[280px] p-3 bg-popover border-border text-popover-foreground shadow-2xl rounded-[12px] space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[12px] font-semibold text-foreground">
                    Escolher Ícone
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectIcon(undefined)}
                    className="text-[11.5px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
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
                        "h-8 rounded-[6px] hover:bg-accent text-[20px] flex items-center justify-center transition-colors cursor-pointer",
                        icon === emoji && "bg-accent ring-1 ring-primary"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectIcon("board")}
                    className="w-full h-8 px-2.5 rounded-[6px] hover:bg-accent flex items-center gap-2 text-[12px] text-foreground transition-colors cursor-pointer"
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
                placeholder="Título da nova tarefa..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError && e.target.value.trim()) setTitleError(null);
                }}
                onBlur={() => {
                  if (task) {
                    setIsEditingTitle(false);
                    syncTaskField({ title: title.trim() || defaultTitle });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !task) {
                    e.preventDefault();
                    handleCreateTaskSubmit();
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Escape") {
                    setIsEditingTitle(false);
                    syncTaskField({ title: title.trim() || defaultTitle });
                  }
                }}
                className="h-9 text-[20px] font-bold bg-background border-primary text-foreground px-2.5"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  "text-[21px] font-bold leading-[1.2] tracking-[-0.01em] cursor-text transition-colors",
                  title ? "text-foreground hover:text-foreground/85" : "text-muted-foreground/60"
                )}
                title="Clique para editar o título"
              >
                {title || "Clique para definir o título"}
              </h2>
            )}
            {titleError && (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {titleError}
              </p>
            )}

            {isEditingSubtitle ? (
              <Input
                autoFocus
                placeholder="Subtítulo ou resumo curto..."
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
                className="h-7 mt-1 text-[12.5px] bg-background border-primary text-foreground px-2"
              />
            ) : (
              <p
                onClick={() => setIsEditingSubtitle(true)}
                className={cn(
                  "text-[12.5px] mt-0.5 leading-snug cursor-text transition-colors",
                  subtitle
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                title="Clique para editar o subtítulo"
              >
                {subtitle || "Adicionar subtítulo..."}
              </p>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. SEÇÃO DE PROPRIEDADES (MINIMALISTA OU EXPANDIDA)                */}
        {/* ================================================================= */}
        <div className="mt-3.5">
          {!isPropertiesExpanded ? (
            /* Versão minimalista em 1 linha */
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {/* 1. Status Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-[26px] rounded-full border border-border bg-secondary hover:bg-accent px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary-foreground transition-all cursor-pointer outline-none shrink-0"
                  >
                    <StatusIcon status={status} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{getStatusDefinition(status).label}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 opacity-70" />
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
                      "h-[26px] rounded-[7px] border px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition-all hover:brightness-105 cursor-pointer outline-none shrink-0",
                      getPriorityPillStyle(priority)
                    )}
                  >
                    <PriorityIcon priority={priority} />
                    <span>{normalizeTaskPriority(priority)}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-40 bg-popover border-border text-popover-foreground p-1"
                >
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase px-2 py-1">
                    Prioridade
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  {ALL_CANONICAL_PRIORITIES.map((p) => {
                    const isSel = normalizeTaskPriority(priority) === p;
                    return (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => handleSelectPriority(p)}
                        className={cn(
                          "text-xs justify-between cursor-pointer rounded-md px-2 py-1.5",
                          isSel
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "hover:bg-accent/60 text-popover-foreground/85"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <PriorityIcon priority={p} />
                          <span>{p}</span>
                        </span>
                        {isSel && <Check className="w-3.5 h-3.5 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3. Prazo Pill */}
              <NotionDatePicker
                startDate={startDate || dueDate}
                endDate={startDate ? dueDate : undefined}
                priority={priority}
                onPriorityChange={(p) => {
                  const norm = normalizeTaskPriority(p);
                  setPriority(norm);
                  syncTaskField({ priority: norm });
                }}
                allowRange
                placeholder="Definir prazo"
                onChange={({ startDate: selectedStart, endDate }) => {
                  const nextStart = endDate ? selectedStart || "" : "";
                  const nextDue = endDate || selectedStart || "";
                  setStartDate(nextStart);
                  setDueDate(nextDue);
                  syncTaskField({ startDate: nextStart, dueDate: nextDue });
                }}
                triggerClassName="h-[26px] rounded-full border border-border bg-secondary hover:bg-accent px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary-foreground transition-colors cursor-pointer outline-none shrink-0"
                renderTrigger={({ open }) => (
                  <button
                    type="button"
                    onClick={open}
                    className="h-[26px] rounded-full border border-border bg-secondary hover:bg-accent px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary-foreground transition-colors cursor-pointer outline-none shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{formatNotionDate(startDate || dueDate, startDate ? dueDate : undefined) || "Definir prazo"}</span>
                  </button>
                )}
              />

              {/* 4. Projeto / Módulo Pill (somente leitura) */}
              <span
                title={projectName || "Projeto atual"}
                className="h-[26px] rounded-full border border-primary/30 bg-primary/10 px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary shrink-0"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[150px]">
                  {projectName || "Projeto atual"}
                </span>
              </span>

              {/* 5. Responsável Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isSavingAssignee || (Boolean(task) && !onChangeAssignee) || (!task && members.length === 0)}
                    title={
                      Boolean(task) && !onChangeAssignee
                        ? "Membros do projeto indisponíveis"
                        : members.length === 0
                          ? "Nenhum membro disponível neste projeto"
                          : "Alterar responsável"
                    }
                    className="h-[26px] rounded-full border border-border bg-secondary hover:bg-accent pl-1.5 pr-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary-foreground transition-colors cursor-pointer outline-none shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {assignee ? (
                      <span className="w-[18px] h-[18px] rounded-full overflow-hidden border border-border bg-background inline-flex items-center justify-center text-[9px] shrink-0">
                        <MemberAvatarContent name={assignee} src={assigneeAvatar} initialsLength={1} />
                      </span>
                    ) : (
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span>{assignee || "Sem responsável"}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48 bg-popover border-border text-popover-foreground p-1"
                >
                  {assigneeMenuItems}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Angle/Chevron no canto direito para expandir */}
              <button
                type="button"
                onClick={() => setIsPropertiesExpanded(true)}
                className="h-6 w-6 rounded-[6px] hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-auto"
                title="Expandir propriedades"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Versão expandida com os 7 metadata cards completos */
            <div className="space-y-2">
              {/* Header para recolher */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] font-bold text-foreground">Propriedades</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPropertiesExpanded(false)}
                  className="h-6 w-6 rounded-[6px] hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Recolher propriedades"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Row 1: Status | Prioridade | Prazo | Projeto / Módulo */}
              <div className="grid grid-cols-2 sm:grid-cols-[1.05fr_0.95fr_1fr_1.2fr] gap-2">
                {/* Card 1: Status */}
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <StatusHexagonIcon className="text-muted-foreground" />
                    <span>Status</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full h-[26px] rounded-full border px-2.5 flex items-center justify-between text-[11.5px] font-semibold transition-all hover:brightness-105 cursor-pointer outline-none",
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
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <SignalBarsIcon className="text-muted-foreground" />
                    <span>Prioridade</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "h-[26px] rounded-[7px] border px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold transition-all hover:brightness-105 cursor-pointer outline-none",
                            getPriorityPillStyle(priority)
                          )}
                        >
                          <PriorityIcon priority={priority} />
                          <span>{normalizeTaskPriority(priority)}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-40 bg-popover border-border text-popover-foreground p-1"
                      >
                        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase px-2 py-1">
                          Prioridade
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-1" />
                        {ALL_CANONICAL_PRIORITIES.map((p) => {
                          const isSel = normalizeTaskPriority(priority) === p;
                          return (
                            <DropdownMenuItem
                              key={p}
                              onClick={() => handleSelectPriority(p)}
                              className={cn(
                                "text-xs justify-between cursor-pointer rounded-md px-2 py-1.5",
                                isSel
                                  ? "bg-accent text-accent-foreground font-semibold"
                                  : "hover:bg-accent/60 text-popover-foreground/85"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <PriorityIcon priority={p} />
                                <span>{p}</span>
                              </span>
                              {isSel && (
                                <Check className="w-3.5 h-3.5 text-primary" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Card 3: Prazo */}
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Prazo</span>
                  </div>
                  <div className="mt-1.5">
                    <NotionDatePicker
                      startDate={startDate || dueDate}
                      endDate={startDate ? dueDate : undefined}
                      priority={priority}
                      onPriorityChange={(p) => {
                        const norm = normalizeTaskPriority(p);
                        setPriority(norm);
                        syncTaskField({ priority: norm });
                      }}
                      allowRange
                      placeholder="Definir prazo"
                      onChange={({ startDate: selectedStart, endDate }) => {
                        const nextStart = endDate ? selectedStart || "" : "";
                        const nextDue = endDate || selectedStart || "";
                        setStartDate(nextStart);
                        setDueDate(nextDue);
                        syncTaskField({ startDate: nextStart, dueDate: nextDue });
                      }}
                      triggerClassName="h-[26px] rounded-full border border-border bg-secondary px-3 inline-flex items-center text-[11.5px] font-semibold text-secondary-foreground hover:bg-accent transition-colors cursor-pointer outline-none"
                      renderTrigger={({ open }) => (
                        <button
                          type="button"
                          onClick={open}
                          className="h-[26px] rounded-full border border-border bg-secondary px-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary-foreground hover:bg-accent transition-colors cursor-pointer outline-none"
                        >
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{formatNotionDate(startDate || dueDate, startDate ? dueDate : undefined) || "Definir prazo"}</span>
                        </button>
                      )}
                    />
                  </div>
                </div>

                {/* Card 4: Projeto / Módulo */}
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Projeto / Módulo</span>
                  </div>
                  <div className="mt-1.5">
                    <span
                      title={projectName || "Projeto atual"}
                      className="h-[26px] max-w-full rounded-full border border-primary/30 bg-primary/10 px-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary truncate"
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{projectName || "Projeto atual"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Responsável | Etiquetas | Estimativa */}
              <div className="grid grid-cols-1 sm:grid-cols-[1.18fr_1.68fr_1fr] gap-2">
                {/* Card 5: Responsável */}
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Responsável</span>
                  </div>
                  <div className="mt-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={isSavingAssignee || (Boolean(task) && !onChangeAssignee) || (!task && members.length === 0)}
                          title={
                            Boolean(task) && !onChangeAssignee
                              ? "Membros do projeto indisponíveis"
                              : members.length === 0
                                ? "Nenhum membro disponível neste projeto"
                                : "Alterar responsável"
                          }
                          className="w-full h-[28px] rounded-full border border-border bg-secondary pl-1.5 pr-3 flex items-center justify-between text-[11.5px] font-semibold text-secondary-foreground hover:bg-accent transition-colors cursor-pointer outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {assignee ? (
                              <span className="w-[20px] h-[20px] rounded-full overflow-hidden border border-border bg-background inline-flex items-center justify-center text-[10px] shrink-0">
                                <MemberAvatarContent name={assignee} src={assigneeAvatar} initialsLength={1} />
                              </span>
                            ) : (
                              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{assignee || "Sem responsável"}</span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-48 bg-popover border-border text-popover-foreground p-1"
                      >
                        {assigneeMenuItems}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Card 6: Etiquetas */}
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
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
                          className="h-[25px] w-[25px] rounded-[7px] border border-border bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer outline-none"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-48 p-2.5 bg-popover border-border text-popover-foreground"
                      >
                        <form onSubmit={handleAddTag} className="flex gap-1.5">
                          <Input
                            autoFocus
                            placeholder="Nova etiqueta..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            className="h-7 text-xs bg-background border-border text-foreground"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-7 px-2 text-xs cursor-pointer"
                          >
                            OK
                          </Button>
                        </form>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Card 7: Estimativa */}
                <div className="rounded-[11px] border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Estimativa</span>
                  </div>
                  <div className="mt-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-[26px] rounded-[7px] border border-border bg-secondary px-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-secondary-foreground hover:bg-accent transition-colors cursor-pointer outline-none"
                        >
                          <Flame className="w-3 h-3 text-muted-foreground" />
                          <span>{estimate || "Definir"}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-44 p-2.5 bg-popover border-border text-popover-foreground space-y-1.5"
                      >
                        <span className="text-[11px] text-muted-foreground font-medium block">
                          Tempo estimado
                        </span>
                        <Input
                          value={estimate}
                          onChange={(e) => {
                            setEstimate(e.target.value);
                            syncTaskField({ estimate: e.target.value });
                          }}
                          className="h-7 text-xs bg-background border-border text-foreground"
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
      <div className="px-6 pt-3 pb-3.5 border-b border-border">
        {/* Cabeçalho da descrição */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsDescOpen((prev) => !prev)}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left"
          >
            <AlignLeft className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[14px] font-bold text-foreground">Descrição</h3>
          </button>

          <button
            type="button"
            onClick={() => setIsDescOpen((prev) => !prev)}
            className="h-6 w-6 rounded-[6px] hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title={isDescOpen ? "Recolher descrição" : "Expandir descrição"}
          >
            {isDescOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Caixa de descrição */}
        {isDescOpen && (
          <div className="mt-2.5 rounded-[11px] border border-border bg-background/70 px-3.5 py-2.5 text-[13px] leading-[1.55] transition-colors focus-within:border-primary">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => syncTaskField({ description })}
              placeholder="Adicione uma descrição detalhada da tarefa..."
              rows={4}
              className="w-full bg-transparent border-0 p-0 text-[13px] leading-[1.55] text-foreground placeholder:text-muted-foreground focus-visible:ring-0 resize-none shadow-none"
            />
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. CHECKLIST & SUBTAREFAS SECTION                                   */}
      {/* =================================================================== */}
      <div className="px-6 pt-3.5 pb-4 border-b border-border">
        {/* Section Title + Progress Counter */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsChecklistOpen((prev) => !prev)}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer group text-left"
          >
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-[14px] font-bold text-foreground">
              Checklist & Subtarefas
            </h3>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-medium text-muted-foreground">
              {completedSubtasksCount} de {totalSubtasksCount} concluídas ({progressPercent}%)
            </span>
            <button
              type="button"
              onClick={() => setIsChecklistOpen((prev) => !prev)}
              className="h-6 w-6 rounded-[6px] hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
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

        {/* Progress Bar */}
        <div className="h-[9px] w-full rounded-full bg-secondary overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Conteúdo colapsável */}
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
                    className="rounded-[11px] border border-border bg-background/70 overflow-hidden"
                  >
                    {/* Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(groupName)}
                      className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-accent/40 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="text-[13px] font-bold text-foreground">
                          {groupName}
                        </span>
                      </div>

                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
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
                                <div className="px-3.5 py-1.5 border-t border-border/60 flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors group/mitem">
                                  <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.completed}
                                      onChange={() => handleToggleSubtask(item.id)}
                                      className="sr-only"
                                    />
                                    {hasSubtaskMeta ? (
                                      item.completed ? (
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                      ) : (
                                        <CircleDashed className="w-4 h-4 text-muted-foreground shrink-0" />
                                      )
                                    ) : item.completed ? (
                                      <span className="w-4 h-4 rounded-[4px] bg-primary border border-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-xs">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </span>
                                    ) : (
                                      <span className="w-4 h-4 rounded-[4px] border-[1.5px] border-muted-foreground/70 hover:border-foreground bg-transparent shrink-0 transition-colors" />
                                    )}

                                    <span
                                      className={cn(
                                        "text-[12.5px] truncate transition-colors",
                                        item.completed
                                          ? "line-through text-muted-foreground"
                                          : "text-foreground font-medium"
                                      )}
                                    >
                                      {item.title}
                                    </span>
                                  </label>

                                  {/* Ações / Metadados à Direita */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {hasSubtaskMeta ? (
                                      <div className="rounded-[5px] bg-muted/60 border border-border px-2 py-0.5 flex flex-col min-w-[148px] -my-0.5">
                                        <div className="flex items-center justify-between gap-2.5 text-[8.5px] text-muted-foreground pb-0.5 border-b border-border/70">
                                          <span>Data de vencimento</span>
                                          <span className="flex items-center gap-1">
                                            <span>Respons...</span>
                                            <button
                                              type="button"
                                              onClick={() => handleAddChildSubtaskItem(item.id, groupName)}
                                              className="w-2.5 h-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center justify-center text-[7.5px] font-bold cursor-pointer"
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
                                            onChange={({ startDate: pickedDate }) =>
                                              handleUpdateSubtaskMeta(item.id, {
                                                dueDate: pickedDate || undefined,
                                              })
                                            }
                                            renderTrigger={({ open }) => (
                                              <button
                                                type="button"
                                                onClick={open}
                                                className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                              >
                                                {formatNotionDate(item.dueDate) || "Definir data"}
                                              </button>
                                            )}
                                          />
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                type="button"
                                                className="p-0 border-0 bg-transparent cursor-pointer"
                                                title={item.assignee || "Sem responsável"}
                                              >
                                                <span className="w-4 h-4 rounded-full overflow-hidden border border-border bg-secondary inline-flex items-center justify-center text-[8px] font-semibold">
                                                  {item.assignee ? (
                                                    <MemberAvatarContent
                                                      name={item.assignee}
                                                      src={item.assigneeAvatar}
                                                      initialsLength={1}
                                                    />
                                                  ) : (
                                                    <User className="w-2.5 h-2.5 text-muted-foreground" />
                                                  )}
                                                </span>
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                              align="end"
                                              className="w-44 bg-popover border-border text-popover-foreground p-1"
                                            >
                                              {members.length === 0 ? (
                                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                  Nenhum membro disponível
                                                </div>
                                              ) : (
                                                members.map((member) => {
                                                  const memberName =
                                                    member.user.name || member.user.email;
                                                  return (
                                                    <DropdownMenuItem
                                                      key={member.userId}
                                                      onClick={() =>
                                                        handleUpdateSubtaskMeta(item.id, {
                                                          assignee: memberName,
                                                          assigneeAvatar:
                                                            member.user.avatarUrl || undefined,
                                                        })
                                                      }
                                                      className="text-xs gap-1.5 cursor-pointer"
                                                    >
                                                      <span className="w-4 h-4 rounded-full overflow-hidden bg-secondary inline-flex items-center justify-center text-[9px] shrink-0">
                                                        <MemberAvatarContent
                                                          name={memberName}
                                                          src={member.user.avatarUrl}
                                                          initialsLength={1}
                                                        />
                                                      </span>
                                                      <span className="truncate">{memberName}</span>
                                                    </DropdownMenuItem>
                                                  );
                                                })
                                              )}
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleUpdateSubtaskMeta(item.id, {
                                                    assignee: undefined,
                                                    assigneeAvatar: undefined,
                                                  })
                                                }
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
                                      <div className="opacity-0 group-hover/mitem:opacity-100 focus-within:opacity-100 flex items-center gap-1.5 transition-opacity">
                                        <NotionDatePicker
                                          startDate={item.dueDate}
                                          allowRange
                                          placeholder="+ Prazo"
                                          onChange={({ startDate: pickedDate }) =>
                                            handleUpdateSubtaskMeta(item.id, {
                                              dueDate: pickedDate || undefined,
                                            })
                                          }
                                          renderTrigger={({ open }) => (
                                            <button
                                              type="button"
                                              onClick={open}
                                              className="h-[20px] rounded border border-border bg-secondary px-1.5 inline-flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground hover:border-primary cursor-pointer"
                                            >
                                              <Calendar className="w-2.5 h-2.5" />
                                              <span>+ Prazo</span>
                                            </button>
                                          )}
                                        />
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              type="button"
                                              className="h-[20px] rounded border border-border bg-secondary px-1.5 inline-flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground hover:border-primary cursor-pointer"
                                            >
                                              <User className="w-2.5 h-2.5" />
                                              <span>+ Resp</span>
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent
                                            align="end"
                                            className="w-44 bg-popover border-border text-popover-foreground p-1"
                                          >
                                            {members.length === 0 ? (
                                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                Nenhum membro disponível
                                              </div>
                                            ) : (
                                              members.map((member) => {
                                                const memberName =
                                                  member.user.name || member.user.email;
                                                return (
                                                  <DropdownMenuItem
                                                    key={member.userId}
                                                    onClick={() =>
                                                      handleUpdateSubtaskMeta(item.id, {
                                                        assignee: memberName,
                                                        assigneeAvatar:
                                                          member.user.avatarUrl || undefined,
                                                      })
                                                    }
                                                    className="text-xs gap-1.5 cursor-pointer"
                                                  >
                                                    <span className="w-4 h-4 rounded-full overflow-hidden bg-secondary inline-flex items-center justify-center text-[9px] shrink-0">
                                                      <MemberAvatarContent
                                                        name={memberName}
                                                        src={member.user.avatarUrl}
                                                        initialsLength={1}
                                                      />
                                                    </span>
                                                    <span className="truncate">{memberName}</span>
                                                  </DropdownMenuItem>
                                                );
                                              })
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        <button
                                          type="button"
                                          onClick={() => handleAddChildSubtaskItem(item.id, groupName)}
                                          className="h-[20px] rounded border border-border bg-secondary px-1.5 inline-flex items-center text-[9.5px] text-muted-foreground hover:text-foreground hover:border-primary cursor-pointer"
                                        >
                                          + Sub
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSubtaskItem(item.id)}
                                          className="p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Sub-itens Filhos */}
                                {childItems.map((ch) => (
                                  <div
                                    key={ch.id}
                                    className="pl-9 pr-3.5 py-1.5 border-t border-border/50 bg-muted/30 flex items-center justify-between gap-2.5 hover:bg-accent/40 transition-colors group/mchild relative"
                                  >
                                    <div className="absolute left-[20px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] border-b-[2px] border-l-[2px] border-primary/50 rounded-bl-[4px] pointer-events-none" />
                                    <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={ch.completed}
                                        onChange={() => handleToggleSubtask(ch.id)}
                                        className="sr-only"
                                      />
                                      {ch.completed ? (
                                        <span className="w-3.5 h-3.5 rounded-[3px] bg-primary border border-primary flex items-center justify-center text-primary-foreground shadow-xs">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </span>
                                      ) : (
                                        <span className="w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-muted-foreground/70 hover:border-foreground bg-transparent shrink-0 transition-colors" />
                                      )}
                                      <span
                                        className={cn(
                                          "text-[12px] truncate",
                                          ch.completed
                                            ? "line-through text-muted-foreground"
                                            : "text-foreground"
                                        )}
                                      >
                                        {ch.title}
                                      </span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubtaskItem(ch.id)}
                                      className="opacity-0 group-hover/mchild:opacity-100 p-1 text-muted-foreground hover:text-destructive cursor-pointer"
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
                className="mt-2.5 rounded-[10px] border border-primary/60 bg-background/70 p-2.5 flex flex-wrap items-center gap-2"
              >
                <Input
                  autoFocus
                  placeholder="Digite o título do item..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 min-w-[200px] h-8 text-xs bg-background border-border text-foreground"
                />
                <select
                  value={newChecklistGroup}
                  onChange={(e) => setNewChecklistGroup(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none"
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
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  Adicionar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddChecklistItem(false)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </Button>
              </form>
            )}

            {/* Footer Buttons: + Adicionar item | ^ Recolher tudo */}
            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                disabled={!task}
                title={!task ? "Crie a tarefa antes de adicionar itens" : undefined}
                onClick={() => setShowAddChecklistItem((prev) => !prev)}
                className="h-[30px] px-3 rounded-[9px] border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar item</span>
              </button>

              <button
                type="button"
                onClick={handleCollapseOrExpandAll}
                className="h-[30px] px-3 rounded-[9px] border border-border bg-secondary hover:bg-accent text-secondary-foreground text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
      <div className="px-6 pt-3 pb-4 bg-muted/30">
        {/* Tabs Header */}
        <div className="flex items-center justify-between border-b border-border pb-1">
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
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Atividades</span>
              {bottomTab === "activities" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
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
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquareMore className="w-3.5 h-3.5 text-primary" />
              <span>Comentários</span>
              <span className="rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10.5px] font-bold">
                {activeComments.length}
              </span>
              {bottomTab === "comments" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
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
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Paperclip className="w-3.5 h-3.5 text-primary" />
              <span>Anexos</span>
              <span className="rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10.5px] font-bold">
                0
              </span>
              {bottomTab === "attachments" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsBottomOpen((prev) => !prev)}
            className="h-6 w-6 rounded-[6px] hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer mb-1"
            title={isBottomOpen ? "Recolher seção" : "Expandir seção"}
          >
            {isBottomOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Conteúdo da seção inferior */}
        {isBottomOpen && (
          <div className="mt-3">
            {bottomTab === "activities" && (
              <div className="py-1 text-xs text-muted-foreground">
                Histórico de atividades indisponível.
              </div>
            )}

            {bottomTab === "comments" && (
              <>
                {/* Comment Composer */}
                <form
                  onSubmit={handleSubmitComment}
                  className="flex items-center gap-2.5"
                >
                  <span className="w-7 h-7 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0">
                    <MemberAvatarContent
                      name={actorName}
                      src={currentUser?.avatarUrl}
                    />
                  </span>

                  <div className="flex-1 flex items-center rounded-[10px] border border-border bg-background pl-3 pr-1.5 py-1 focus-within:border-primary transition-colors">
                    <input
                      type="text"
                      disabled={!task}
                      placeholder={task ? "Adicionar um comentário..." : "Crie a tarefa antes de comentar"}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground outline-none"
                    />

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={!task}
                        title="Mencionar (@)"
                        onClick={() =>
                          setNewCommentText((prev) => `${prev}@${mentionTargetName} `)
                        }
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <AtSign className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="submit"
                        disabled={!task || !newCommentText.trim()}
                        aria-label="Enviar comentário"
                        className="w-6 h-6 rounded-[7px] bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-sm ml-1 transition-colors cursor-pointer disabled:opacity-40"
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
                      className="flex items-start gap-2.5"
                    >
                      <span className="w-7 h-7 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0 mt-0.5">
                        <MemberAvatarContent
                          name={comment.author}
                          src={comment.avatar}
                        />
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-bold text-foreground">
                            {comment.author}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {comment.timeAgo ||
                              (comment.createdAt
                                ? new Date(comment.createdAt).toLocaleString("pt-BR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "agora")}
                          </span>
                        </div>
                        <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {bottomTab === "attachments" && (
              <div className="border border-dashed border-border rounded-[10px] p-6 text-center text-muted-foreground bg-card/50">
                <Paperclip className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  Nenhum anexo adicionado ainda
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  O envio de anexos em tarefas ainda não está disponível nesta versão.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmação de Exclusão */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir tarefa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &quot;{title || "esta tarefa"}&quot;? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (task && onDelete) {
                  onDelete(task.id);
                  setIsDeleteConfirmOpen(false);
                  onClose();
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        className="w-[800px] max-w-[800px] max-h-[96vh] overflow-y-auto p-0 gap-0 bg-card border border-border rounded-[16px] shadow-2xl outline-none"
        style={{ width: "800px", maxWidth: "min(800px, 96vw)" }}
      >
        {props.isOpen && (
          <TaskModalContent
            key={props.task?.id ?? `${props.initialStatus}-new`}
            ref={contentRef}
            onClose={props.onClose}
            task={props.task}
            syncError={props.syncError}
            remoteConflictWarning={props.remoteConflictWarning}
            onReloadRemote={props.onReloadRemote}
            onDirtyChange={props.onDirtyChange}
            currentUser={props.currentUser}
            members={props.members}
            onChangeAssignee={props.onChangeAssignee}
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
