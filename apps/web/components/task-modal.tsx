"use client";

import React, {
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import type { Task, TaskPriority, TaskStatus, Subtask, TaskComment } from "@/types/task";
import { StatusIcon } from "./task-status-icon";
import { PriorityIcon } from "./task-priority-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  CheckSquare,
  Plus,
  X,
  MessageSquare,
  Send,
  Timer,
  AlertCircle,
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
  onSave: (task: Omit<Task, "id" | "createdAt" | "code"> & { id?: string; code?: string }) => void;
  onDelete?: (id: string) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onAddComment?: (taskId: string, comment: TaskComment) => void;
}

interface TaskModalContentProps {
  task: Task | null;
  initialStatus?: TaskStatus;
  onClose: () => void;
  onSave: (task: Omit<Task, "id" | "createdAt" | "code"> & { id?: string; code?: string }) => void;
  onDelete?: (id: string) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onAddComment?: (taskId: string, comment: TaskComment) => void;
}

const TaskModalContent = forwardRef<TaskModalContentHandle, TaskModalContentProps>(
  function TaskModalContent(
    {
      task,
      initialStatus = "A Fazer",
      onClose,
      onSave,
      onDelete,
      onUpdateSubtasks,
      onAddComment,
    },
    ref
  ) {
    const isEditing = Boolean(task);

    // Editable form draft state
    const [title, setTitle] = useState(task?.title ?? "");
    const [description, setDescription] = useState(task?.description ?? "");
    const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus);
    const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Média");
    const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
    const [tag, setTag] = useState(task?.tag ?? "");
    const [estimate, setEstimate] = useState(task?.estimate ?? "");

    // Local state for subtasks and comments ONLY when drafting a new task
    const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>([]);
    const [localComments, setLocalComments] = useState<TaskComment[]>([]);

    // Inputs for subtasks and comments
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [newCommentText, setNewCommentText] = useState("");

    // Discard confirmation state for uncommitted form field modifications
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const bannerRef = useRef<HTMLDivElement | null>(null);
    const keepEditingBtnRef = useRef<HTMLButtonElement | null>(null);

    // Scroll ate o banner de descarte e focar no botao de continuar editando ao disparar
    useEffect(() => {
      if (showDiscardConfirm) {
        const container = document.getElementById("task-modal-content");
        if (container) {
          container.scrollTop = 0;
        }
        keepEditingBtnRef.current?.focus({ preventScroll: true });
      }
    }, [showDiscardConfirm]);

    // Single source of truth for subtasks and comments:
    // If editing existing task, read directly from task prop (updated reactively from central state).
    // If creating new task, read from local draft state.
    const activeSubtasks = isEditing ? task?.subtasks ?? [] : localSubtasks;
    const activeComments = isEditing ? task?.comments ?? [] : localComments;

    // Detect if editable form fields have uncommitted changes
    const isDirty = useMemo(() => {
      if (!task) {
        return Boolean(
          title.trim() ||
            description.trim() ||
            tag.trim() ||
            estimate.trim() ||
            dueDate ||
            status !== initialStatus ||
            priority !== "Média" ||
            newSubtaskTitle.trim() ||
            newCommentText.trim() ||
            localSubtasks.length > 0 ||
            localComments.length > 0
        );
      }
      return (
        title !== (task.title ?? "") ||
        description !== (task.description ?? "") ||
        status !== (task.status ?? initialStatus) ||
        priority !== (task.priority ?? "Média") ||
        dueDate !== (task.dueDate ?? "") ||
        tag !== (task.tag ?? "") ||
        estimate !== (task.estimate ?? "") ||
        Boolean(newSubtaskTitle.trim()) ||
        Boolean(newCommentText.trim())
      );
    }, [
      task,
      title,
      description,
      status,
      priority,
      dueDate,
      tag,
      estimate,
      initialStatus,
      newSubtaskTitle,
      newCommentText,
      localSubtasks.length,
      localComments.length,
    ]);

    function handleRequestClose(e?: React.MouseEvent | React.KeyboardEvent) {
      e?.preventDefault();
      e?.stopPropagation();
      if (isDirty) {
        setShowDiscardConfirm(true);
        const container = document.getElementById("task-modal-content");
        if (container) {
          container.scrollTop = 0;
        }
      } else {
        onClose();
      }
    }

    useImperativeHandle(ref, () => ({
      requestClose: handleRequestClose,
    }));

    function handleConfirmDiscard() {
      setShowDiscardConfirm(false);
      onClose();
    }

    function handleCancelDiscard() {
      setShowDiscardConfirm(false);
    }

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      const trimmed = title.trim();
      if (!trimmed) return;

      onSave({
        id: task?.id,
        code: task?.code,
        title: trimmed,
        description: description.trim(),
        status,
        priority,
        tag: tag.trim() || undefined,
        dueDate: dueDate || undefined,
        estimate: estimate.trim() || undefined,
        subtasks: activeSubtasks,
        comments: activeComments,
      });
      onClose();
    }

    function handleDelete() {
      if (task && onDelete) {
        if (window.confirm(`Tem certeza que deseja excluir "${task.title}"?`)) {
          onDelete(task.id);
          onClose();
        }
      }
    }

    // Subtasks handlers: immediate update to central tasks state if task exists
    function handleToggleSubtask(id: string) {
      const updated = activeSubtasks.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s
      );
      if (task && onUpdateSubtasks) {
        onUpdateSubtasks(task.id, updated);
      } else {
        setLocalSubtasks(updated);
      }
    }

    function handleAddSubtask() {
      const trimmed = newSubtaskTitle.trim();
      if (!trimmed) return;
      const newSt: Subtask = {
        id: `st-${Date.now()}`,
        title: trimmed,
        completed: false,
      };
      const updated = [...activeSubtasks, newSt];
      if (task && onUpdateSubtasks) {
        onUpdateSubtasks(task.id, updated);
      } else {
        setLocalSubtasks(updated);
      }
      setNewSubtaskTitle("");
    }

    function handleDeleteSubtask(id: string) {
      const updated = activeSubtasks.filter((s) => s.id !== id);
      if (task && onUpdateSubtasks) {
        onUpdateSubtasks(task.id, updated);
      } else {
        setLocalSubtasks(updated);
      }
    }

    // Comment handler: immediate update to central tasks state if task exists
    function handleAddComment(e: React.FormEvent) {
      e.preventDefault();
      const trimmed = newCommentText.trim();
      if (!trimmed) return;

      const newComment: TaskComment = {
        id: `c-${Date.now()}`,
        author: "Will (Você)",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      if (task && onAddComment) {
        onAddComment(task.id, newComment);
      } else {
        setLocalComments((prev) => [...prev, newComment]);
      }
      setNewCommentText("");
    }

    const completedCount = activeSubtasks.filter((s) => s.completed).length;

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-muted-foreground">
            <span>{task?.code || "NOVA TAREFA"}</span>
            {task?.estimate && (
              <span className="flex items-center gap-1 text-[11px] text-text-icon bg-surface-subtle px-1.5 py-0.2 rounded border border-border-subtle">
                <Timer className="w-3 h-3" />
                <span>{task.estimate}</span>
              </span>
            )}
            {isDirty && (
              <Badge
                variant="subtle"
                className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-500 bg-amber-500/10"
              >
                Edições não salvas
              </Badge>
            )}
          </div>
          <DialogTitle className="text-sm font-semibold text-foreground">
            {isEditing ? "Detalhes da Tarefa" : "Criar Nova Tarefa"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Edite as propriedades, checklist e visualize atividades sincronizadas imediatamente."
              : "Preencha as informações para adicionar a tarefa ao Quadro e à Tabela."}
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-border" />

        {/* Discard confirmation banner for uncommitted form field modifications (prominently visible at top, sticky when scrolled) */}
        {showDiscardConfirm && (
          <div
            ref={bannerRef}
            role="alert"
            tabIndex={-1}
            className="sticky top-0 z-20 rounded-lg border border-amber-500/40 bg-card/95 backdrop-blur-md p-3 text-xs text-foreground space-y-2 shadow-sm animate-in fade-in duration-150 outline-none"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Alterações não salvas nos campos
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Você modificou propriedades desta tarefa. Se descartar, as alterações nos campos (título, descrição, status ou prioridade) não serão salvas. Ações concluídas (subtarefas e comentários locais) permanecem preservadas na sessão.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleConfirmDiscard}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Descartar edições
              </Button>
              <Button
                ref={keepEditingBtnRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelDiscard}
                className="h-7 text-xs border-border bg-sidebar hover:bg-surface-hover text-foreground cursor-pointer focus-visible:ring-1 focus-visible:ring-ring"
              >
                Continuar editando
              </Button>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="modal-task-title"
            className="text-xs font-semibold text-foreground/80 uppercase tracking-wider"
          >
            Título *
          </label>
          <Input
            id="modal-task-title"
            required
            autoFocus
            placeholder="Descreva a tarefa..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-xs bg-sidebar border-border text-foreground focus-visible:ring-ring"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="modal-task-desc"
            className="text-xs font-semibold text-foreground/80 uppercase tracking-wider"
          >
            Descrição ou Critérios
          </label>
          <Textarea
            id="modal-task-desc"
            rows={3}
            placeholder="Notas adicionais, contexto ou links..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-xs bg-sidebar border-border text-foreground focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Properties Grid: Status, Priority, Due Date, Tag, Estimate */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as TaskStatus)}
            >
              <SelectTrigger className="h-8 text-xs bg-sidebar border-border text-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <StatusIcon status={status} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A Fazer">A Fazer</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Em Revisão">Em Revisão</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Prioridade
            </label>
            <Select
              value={priority}
              onValueChange={(val) => setPriority(val as TaskPriority)}
            >
              <SelectTrigger className="h-8 text-xs bg-sidebar border-border text-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <PriorityIcon priority={priority} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimate */}
          <div className="space-y-1">
            <label
              htmlFor="modal-task-estimate"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Estimativa
            </label>
            <Input
              id="modal-task-estimate"
              placeholder="Ex.: 3d, 4h"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              className="h-8 text-xs bg-sidebar border-border text-foreground font-mono"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label
              htmlFor="modal-task-date"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Prazo
            </label>
            <Input
              id="modal-task-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-xs bg-sidebar border-border text-foreground"
            />
          </div>

          {/* Tag */}
          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="modal-task-tag"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Tag / Módulo
            </label>
            <Input
              id="modal-task-tag"
              placeholder="Ex.: frontend, kanban, api"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="h-8 text-xs bg-sidebar border-border text-foreground"
            />
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Checklist / Subtarefas (observado na referência) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5 text-text-icon" />
              <span>Checklist & Subtarefas</span>
            </div>
            {activeSubtasks.length > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {completedCount}/{activeSubtasks.length} concluídas
              </span>
            )}
          </div>

          {/* Subtasks list */}
          {activeSubtasks.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {activeSubtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-surface-subtle group text-xs transition-colors border border-transparent hover:border-border-subtle"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="w-3.5 h-3.5 rounded border-border bg-sidebar text-foreground accent-emerald-500 cursor-pointer"
                    />
                    <span
                      className={cn(
                        "truncate transition-all",
                        st.completed
                          ? "line-through text-muted-foreground/60"
                          : "text-foreground"
                      )}
                    >
                      {st.title}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                    title="Remover item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add subtask input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Adicionar subtarefa... (Pressione Enter)"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              className="h-7 text-xs bg-sidebar border-border text-foreground"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Adicionar</span>
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Comentários / Atividade (Demonstração Local Honesta) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5 text-text-icon" />
              <span>Atividade & Comentários</span>
            </div>
            <Badge
              variant="subtle"
              className="text-[10px] px-1.5 py-0 h-4 border-border text-text-icon"
            >
              Demonstração local — não enviados a servidor
            </Badge>
          </div>

          {/* Comments stream */}
          {activeComments.length > 0 ? (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {activeComments.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded bg-surface-subtle border border-border-subtle text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-secondary text-[9px] font-bold text-foreground flex items-center justify-center">
                        {c.author.charAt(0)}
                      </span>
                      <span className="font-semibold text-foreground">
                        {c.author}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 font-mono">
                        (local)
                      </span>
                    </div>
                    <span>
                      {new Date(c.createdAt).toLocaleDateString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-foreground/90 pl-5.5 leading-relaxed">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-text-icon py-1">
              Nenhum comentário registrado nesta sessão (demonstração local em memória).
            </div>
          )}

          {/* Add comment box */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Escrever comentário demonstrativo local... (Enter)"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddComment(e);
                }
              }}
              className="h-7 text-xs bg-sidebar border-border text-foreground"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Adicionar (local)</span>
            </Button>
          </div>
        </div>

        <Separator className="bg-border mt-3" />

        <DialogFooter className="flex items-center justify-between pt-2">
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-red-300 hover:bg-destructive/10 gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRequestClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-white font-medium shadow-2xs cursor-pointer"
            >
              {isEditing ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    );
  }
);

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
        className="max-w-lg max-h-[88vh] overflow-y-auto bg-card border-border"
      >
        {props.isOpen && (
          <TaskModalContent
            key={props.task?.id ?? `${props.initialStatus}-new`}
            ref={contentRef}
            onClose={props.onClose}
            task={props.task}
            initialStatus={props.initialStatus}
            onSave={props.onSave}
            onDelete={props.onDelete}
            onUpdateSubtasks={props.onUpdateSubtasks}
            onAddComment={props.onAddComment}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
