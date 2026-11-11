"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  mapCrmTaskToGestorTask,
  mapGestorTaskToCrmCreateInput,
  mapGestorTaskToCrmUpdateInput,
  normalizeTaskStatus,
  normalizeTaskPriority,
  type AppModuleSection,
  type CrmCompany,
  type CrmContact,
  type CrmFinancialEntry,
  type CrmFinancialSummary,
  type CrmLead,
  type CrmProject,
  type CrmProjectManagement,
  type CrmProjectMember,
  type CrmProjectTask,
  type CrmUserProfile,
  type Task,
  type TaskFilter,
  type TaskStatus,
  type ViewMode,
  type TaskGroupBy,
  type GroupOrder,
} from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import {
  INITIAL_TASKS,
  INITIAL_MANAGEMENTS,
  INITIAL_PROJECTS,
} from "@/lib/initial-data";
import {
  getCachedManagements,
  setCachedManagements,
  getCachedProjects,
  setCachedProjects,
  getCachedTasks,
  setCachedTasks,
  updateCachedTask,
  addCachedTask,
  removeCachedTask,
  getCachedSession,
  setCachedSession,
  clearGestorCache,
} from "@/lib/gestor-cache";
import { Sidebar } from "@/components/sidebar";
import { AppHeader, type SubtaskDisplayMode } from "@/components/app-header";
import { ManagementsGridView } from "@/components/managements-grid-view";
import { ManagementProjectsView } from "@/components/management-projects-view";
import { TaskTable } from "@/components/task-table/task-table";
import { TaskKanban } from "@/components/task-kanban/task-kanban";
import { TaskModal } from "@/components/task-modal";
import { EmptyState } from "@/components/empty-state";
import { CrmConnectionDialog } from "@/components/crm-connection-dialog";
import { EnterpriseModulesView } from "@/components/enterprise-modules-view";
import { TaskTableSkeleton, TaskKanbanSkeleton } from "@/components/task-skeleton";
import { cn } from "@/lib/utils";

function getHighestCodeNumber(list: Task[]): number {
  let max = 100;
  for (const task of list) {
    const match = task.code?.match(/(?:IDE|PLAN)-(\d+)/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return max;
}

export function TaskApp() {
  const searchParams = useSearchParams();
  const initialModal = searchParams.get("modal");

  // Estados de gestão e projeto com persistência
  const [selectedManagementId, setSelectedManagementId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("gestor_selected_management_id") || null;
    } catch {
      return null;
    }
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("gestor_selected_project_id") || null;
    } catch {
      return null;
    }
  });

  // Renderização instantânea (0ms no F5): inicializa direto do cache
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const cached = getCachedTasks(selectedProjectId);
      if (cached && cached.length > 0) return cached;
    } catch {}
    return [];
  });

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeModule, setActiveModule] = useState<AppModuleSection>("tasks");

  // Estados de visualização ClickUp: subtarefas, tarefas fechadas e campos
  const [subtaskMode, setSubtaskMode] = useState<SubtaskDisplayMode>("collapsed");
  const [showClosedTasks, setShowClosedTasks] = useState(true);
  const [showClosedSubtasks, setShowClosedSubtasks] = useState(true);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);

  // Barra lateral retrátil (shadcn/ui Sidebar): PADRÃO FECHADA (false) conforme solicitado
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estado de Integração com a API Central do IDE CRM
  const [isApiReachable, setIsApiReachable] = useState(false);
  const [isConnectedCrm, setIsConnectedCrm] = useState<boolean>(() => {
    return Boolean(getCachedSession());
  });
  const [currentUser, setCurrentUser] = useState<CrmUserProfile | null>(() => {
    return getCachedSession();
  });
  const [isCrmModalOpen, setIsCrmModalOpen] = useState(false);

  // Se já temos tarefas ou gestões em cache, NÃO mostramos skeleton no F5!
  const [isSyncingTasks, setIsSyncingTasks] = useState<boolean>(() => {
    try {
      const cached = getCachedTasks(selectedProjectId);
      if (cached && cached.length > 0) return false;
      if (!selectedProjectId && !selectedManagementId && getCachedManagements()) return false;
    } catch {}
    return true;
  });

  // Dados sincronizados do IDE CRM (carregados do cache primeiro)
  const [managements, setManagements] = useState<CrmProjectManagement[]>(() => {
    return getCachedManagements() || [];
  });
  const [projects, setProjects] = useState<CrmProject[]>(() => {
    return getCachedProjects() || [];
  });

  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [financeSummary, setFinanceSummary] = useState<CrmFinancialSummary | null>(null);
  const [financeEntries, setFinanceEntries] = useState<CrmFinancialEntry[]>([]);
  const [members, setMembers] = useState<CrmProjectMember[]>([]);

  // Contador de requisições ativas para cancelar/ignorar respostas obsoletas (race condition)
  const activeRequestIdRef = useRef(0);

  // Monotonic collision-free code counter initialized above existing tasks
  const nextCodeNumberRef = useRef(getHighestCodeNumber(INITIAL_TASKS) + 1);

  // Filters state
  const [filters, setFilters] = useState<TaskFilter>({
    search: "",
    status: "Todos",
    priority: "Todas",
    statuses: [],
    assignees: [],
    priorities: [],
    tags: [],
    dueDateCategory: "all",
    taskType: "all",
  });

  // Agrupamento: Padrão é "Nenhum" ("none") conforme solicitado
  const [groupBy, setGroupBy] = useState<TaskGroupBy>("none");
  const [groupOrder, setGroupOrder] = useState<GroupOrder>("asc");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialModal));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    if (initialModal && initialModal !== "new") {
      const found = INITIAL_TASKS.find((t) => t.code === initialModal);
      return found ? found.id : INITIAL_TASKS[1]?.id ?? null;
    }
    return null;
  });
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>("PENDENTE");

  // Busca direcionada e rápida de tarefas baseada no projeto ou gestão selecionados (com SWR)
  const loadTasks = useCallback(
    async (
      projectIdFilter: string | null,
      managementIdFilter: string | null,
      availableProjects?: CrmProject[],
      silent = false
    ) => {
      const currentRequestId = ++activeRequestIdRef.current;
      const cached = getCachedTasks(projectIdFilter);

      // Se não há cache e não é silencioso, exibe o skeleton estrutural
      if (!silent && (!cached || cached.length === 0)) {
        setIsSyncingTasks(true);
      }

      try {
        let loadedTasks: CrmProjectTask[] = [];

        if (projectIdFilter) {
          // Busca direcionada para o projeto selecionado
          const res = await ideCrmClient.listTasks({ projectId: projectIdFilter });
          if (currentRequestId !== activeRequestIdRef.current) return;
          loadedTasks = res.tasks ?? [];
        } else if (managementIdFilter) {
          // Busca as tarefas dos projetos daquela gestão
          const currentProjects = availableProjects ?? projects;
          const mgmtProjects = currentProjects.filter(
            (p) => p.projectManagementId === managementIdFilter
          );

          if (mgmtProjects.length === 1 && mgmtProjects[0]?.id) {
            const res = await ideCrmClient.listTasks({ projectId: mgmtProjects[0].id });
            if (currentRequestId !== activeRequestIdRef.current) return;
            loadedTasks = res.tasks ?? [];
          } else if (mgmtProjects.length > 1) {
            const responses = await Promise.all(
              mgmtProjects.map((p) =>
                ideCrmClient.listTasks({ projectId: p.id }).catch(() => ({ tasks: [] }))
              )
            );
            if (currentRequestId !== activeRequestIdRef.current) return;
            loadedTasks = responses.flatMap((r) => r.tasks ?? []);
          } else {
            const res = await ideCrmClient.listTasks();
            if (currentRequestId !== activeRequestIdRef.current) return;
            loadedTasks = res.tasks ?? [];
          }
        } else {
          // Todas as gestões
          const res = await ideCrmClient.listTasks();
          if (currentRequestId !== activeRequestIdRef.current) return;
          loadedTasks = res.tasks ?? [];
        }

        const mapped = loadedTasks.map((t, idx) => mapCrmTaskToGestorTask(t, idx));
        const finalTasks = mapped.length > 0 ? mapped : INITIAL_TASKS;
        setTasks(finalTasks);
        setCachedTasks(projectIdFilter, finalTasks);
        nextCodeNumberRef.current = getHighestCodeNumber(finalTasks) + 1;
      } catch {
        if (currentRequestId !== activeRequestIdRef.current) return;
        setTasks((prev) => (prev.length > 0 ? prev : INITIAL_TASKS));
      } finally {
        if (currentRequestId === activeRequestIdRef.current) {
          setIsSyncingTasks(false);
        }
      }
    },
    [projects]
  );

  // Carregamento lazy dos módulos enterprise (contatos, leads, financeiro)
  // para NÃO bloquear a abertura do quadro de tarefas no F5 ou navegação
  const loadEnterpriseData = useCallback(async () => {
    try {
      const [
        contactsRes,
        companiesRes,
        leadsRes,
        finSummaryRes,
        finEntriesRes,
      ] = await Promise.all([
        ideCrmClient.listContacts().catch(() => null),
        ideCrmClient.listCompanies().catch(() => null),
        ideCrmClient.listLeads().catch(() => null),
        ideCrmClient.getFinanceSummary().catch(() => null),
        ideCrmClient.listFinanceEntries().catch(() => null),
      ]);

      if (contactsRes?.contacts) setContacts(contactsRes.contacts);
      if (companiesRes?.companies) setCompanies(companiesRes.companies);
      if (leadsRes?.leads) setLeads(leadsRes.leads);
      if (finSummaryRes) setFinanceSummary(finSummaryRes);
      if (finEntriesRes?.entries) setFinanceEntries(finEntriesRes.entries);
    } catch {}
  }, []);

  // Dispara o carregamento enterprise apenas quando o usuário entra em uma aba empresarial
  useEffect(() => {
    if (activeModule !== "tasks" && isConnectedCrm) {
      void loadEnterpriseData();
    }
  }, [activeModule, isConnectedCrm, loadEnterpriseData]);

  // Sincronização global ultra-otimizada (paralela e sem travar a UI)
  const syncWithIdeCrm = useCallback(
    async (
      projectIdFilter?: string | null,
      managementIdFilter?: string | null
    ) => {
      try {
        const session = await ideCrmClient.getSession().catch(() => null);
        if (!session || !session.authenticated || !session.user) {
          setIsApiReachable(Boolean(session));
          setIsConnectedCrm(false);
          setCurrentUser(null);
          setCachedSession(null);
          setTasks((prev) => (prev.length > 0 ? prev : INITIAL_TASKS));
          setIsSyncingTasks(false);
          return;
        }

        setIsApiReachable(true);
        setIsConnectedCrm(true);
        setCurrentUser(session.user);
        setCachedSession(session.user);

        // Dispara em paralelo sem waterfalls bloqueantes:
        // 1) Gestões
        // 2) Projetos
        // 3) Membros
        // 4) Tarefas do projeto atual (em modo silencioso se já houver cache)
        const hasCached = Boolean(getCachedTasks(projectIdFilter ?? null)?.length);
        const [managementsRes, projectsRes, membersRes] = await Promise.all([
          ideCrmClient.listManagements().catch(() => null),
          ideCrmClient.listProjects().catch(() => null),
          ideCrmClient.listProjectMembers(projectIdFilter ?? undefined).catch(() => null),
          loadTasks(
            projectIdFilter ?? null,
            managementIdFilter ?? null,
            undefined,
            hasCached // Se já tiver cache, roda silenciosamente (0ms de tela preta)
          ),
        ]);

        const loadedManagements = managementsRes?.managements ?? [];
        const loadedProjects = projectsRes?.projects ?? [];

        if (loadedManagements.length > 0) {
          setManagements(loadedManagements);
          setCachedManagements(loadedManagements);
        }
        if (loadedProjects.length > 0) {
          setProjects(loadedProjects);
          setCachedProjects(loadedProjects);
        }
        if (membersRes?.members) {
          setMembers(membersRes.members);
        }
      } catch {
        setTasks((prev) => (prev.length > 0 ? prev : INITIAL_TASKS));
        setIsSyncingTasks(false);
      }
    },
    [loadTasks]
  );

  useEffect(() => {
    void syncWithIdeCrm(selectedProjectId, selectedManagementId);
    // Executa apenas uma vez na montagem inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atalho de teclado: Ctrl+B ou Cmd+B para abrir/fechar a barra lateral
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const effectiveManagements = useMemo(() => {
    return managements.length > 0 ? managements : INITIAL_MANAGEMENTS;
  }, [managements]);

  const effectiveProjects = useMemo(() => {
    return projects.length > 0 ? projects : INITIAL_PROJECTS;
  }, [projects]);

  function handleSelectManagement(managementId: string | null) {
    setSelectedManagementId(managementId);
    setSelectedProjectId(null); // Ao selecionar ou trocar de gestão, exibe os projetos da gestão (Nível 2)
    try {
      if (managementId) {
        localStorage.setItem("gestor_selected_management_id", managementId);
      } else {
        localStorage.removeItem("gestor_selected_management_id");
      }
      localStorage.removeItem("gestor_selected_project_id");
    } catch {}

    const cached = getCachedTasks(null);
    if (cached && cached.length > 0) {
      setTasks(cached);
      setIsSyncingTasks(false);
      void loadTasks(null, managementId, undefined, true);
    } else {
      void loadTasks(null, managementId, undefined, false);
    }
  }

  function handleSelectProject(projectId: string | null) {
    setSelectedProjectId(projectId);
    try {
      if (projectId) {
        localStorage.setItem("gestor_selected_project_id", projectId);
      } else {
        localStorage.removeItem("gestor_selected_project_id");
      }
    } catch {}

    if (projectId) {
      const proj = effectiveProjects.find((p) => p.id === projectId);
      if (proj && proj.projectManagementId && proj.projectManagementId !== selectedManagementId) {
        setSelectedManagementId(proj.projectManagementId);
        try {
          localStorage.setItem("gestor_selected_management_id", proj.projectManagementId);
        } catch {}
      }
    }

    // Transição instantânea (0ms): se o projeto já está em cache, exibe imediatamente
    const cached = getCachedTasks(projectId);
    if (cached && cached.length > 0) {
      setTasks(cached);
      setIsSyncingTasks(false);
      // Revalida em background sem tela preta / skeleton
      void loadTasks(projectId, selectedManagementId, undefined, true);
    } else {
      setIsSyncingTasks(true);
      void loadTasks(projectId, selectedManagementId, undefined, false);
    }
  }

  async function handleDisconnectCrm() {
    await ideCrmClient.logout();
    setIsConnectedCrm(false);
    setCurrentUser(null);
    setManagements([]);
    setSelectedManagementId(null);
    setProjects([]);
    setSelectedProjectId(null);
    setTasks(INITIAL_TASKS);
    clearGestorCache();
  }

  // Active selected task derived reactively from current tasks state
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return (
      tasks.find((t) => t.id === selectedTaskId) ??
      INITIAL_TASKS.find((t) => t.id === selectedTaskId || t.code === selectedTaskId) ??
      null
    );
  }, [tasks, selectedTaskId]);

  const currentManagement = useMemo(() => {
    if (!selectedManagementId) return null;
    return effectiveManagements.find((m) => m.id === selectedManagementId) ?? null;
  }, [effectiveManagements, selectedManagementId]);

  const currentProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return effectiveProjects.find((p) => p.id === selectedProjectId) ?? null;
  }, [effectiveProjects, selectedProjectId]);

  // Filtered tasks computation respeitando a Hierarquia: Gestão -> Projeto -> Filtros
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Filtro por Projeto Ativo (só filtra quando os projetos do CRM já carregaram ou quando a tarefa já possui projectId correspondente)
      if (selectedProjectId && projects.length > 0) {
        if (task.projectId && task.projectId !== selectedProjectId) {
          return false;
        }
      } else if (selectedManagementId && projects.length > 0) {
        // Se estiver em "Todos os Projetos" de uma Gestão específica,
        // exibe apenas tarefas cujos projetos pertençam àquela gestão
        const allowedProjectIds = new Set(
          projects
            .filter((p) => p.projectManagementId === selectedManagementId)
            .map((p) => p.id)
        );
        if (task.projectId && !allowedProjectIds.has(task.projectId)) {
          return false;
        }
      }

      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesCode = task.code?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCode) return false;
      }

      // Filtro de Status
      if (
        filters.status !== "Todos" &&
        normalizeTaskStatus(task.status) !== normalizeTaskStatus(filters.status)
      ) {
        return false;
      }
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(task.status)) {
          return false;
        }
      }

      // Filtro de Prioridade
      if (
        filters.priority !== "Todas" &&
        normalizeTaskPriority(task.priority) !== normalizeTaskPriority(filters.priority)
      ) {
        return false;
      }
      if (filters.priorities && filters.priorities.length > 0) {
        if (!filters.priorities.includes(task.priority)) {
          return false;
        }
      }

      // Filtro de Responsável
      if (filters.assignees && filters.assignees.length > 0) {
        const isUnassigned = !task.assignee || !task.assignee.trim();
        const matchesAssignee = isUnassigned
          ? filters.assignees.includes("unassigned")
          : filters.assignees.includes(task.assignee!);
        if (!matchesAssignee) return false;
      }

      // Filtro de Etiquetas
      if (filters.tags && filters.tags.length > 0) {
        const isUntagged =
          (!task.tag || !task.tag.trim()) &&
          (!task.tags || task.tags.length === 0);
        if (isUntagged) {
          if (!filters.tags.includes("untagged")) return false;
        } else {
          const taskTags = [task.tag, ...(task.tags || [])].filter(Boolean);
          const hasMatchingTag = taskTags.some((t) =>
            filters.tags!.includes(t!)
          );
          if (!hasMatchingTag) return false;
        }
      }

      // Filtro de Data de Vencimento
      if (filters.dueDateCategory && filters.dueDateCategory !== "all") {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (filters.dueDateCategory === "no_date") {
          if (task.dueDate) return false;
        } else if (filters.dueDateCategory === "has_date") {
          if (!task.dueDate) return false;
        } else if (filters.dueDateCategory === "overdue") {
          if (
            !task.dueDate ||
            task.dueDate.slice(0, 10) >= todayStr ||
            task.status === "CONCLUÍDO" ||
            task.status === "Concluído"
          ) {
            return false;
          }
        } else if (filters.dueDateCategory === "today") {
          if (!task.dueDate || task.dueDate.slice(0, 10) !== todayStr)
            return false;
        } else if (filters.dueDateCategory === "this_week") {
          if (!task.dueDate) return false;
          const taskDate = task.dueDate.slice(0, 10);
          const inSevenDays = new Date(Date.now() + 7 * 86400000)
            .toISOString()
            .slice(0, 10);
          if (taskDate < todayStr || taskDate > inSevenDays) return false;
        }
      }

      // Filtro de Tipo de Tarefa
      if (filters.taskType && filters.taskType !== "all") {
        const subtasksCount = task.subtasks?.length ?? 0;
        if (filters.taskType === "with_subtasks" && subtasksCount === 0)
          return false;
        if (filters.taskType === "simple" && subtasksCount > 0) return false;
      }

      // Filtro de Tarefas Fechadas (ClickUp "Mostrar rapidamente tarefas fechadas")
      if (!showClosedTasks) {
        const canonical = normalizeTaskStatus(task.status);
        if (canonical === "CONCLUÍDO") return false;
      }

      return true;
    });
  }, [tasks, filters, selectedProjectId, selectedManagementId, projects, showClosedTasks]);

  function generateTaskId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `task-${crypto.randomUUID()}`;
    }
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  function generateTaskCode(): string {
    const num = nextCodeNumberRef.current++;
    return `IDE-${num}`;
  }

  // Task actions (Otimista + Sincronização com a API do IDE CRM quando conectado)
  function handleAddTask(
    data: Omit<Task, "id" | "createdAt" | "code"> & { code?: string }
  ) {
    const tempId = generateTaskId();
    const targetProjectId =
      selectedProjectId ||
      (selectedManagementId
        ? projects.find((p) => p.projectManagementId === selectedManagementId)?.id
        : null) ||
      projects[0]?.id;
    const newTask: Task = {
      ...data,
      id: tempId,
      code: data.code || generateTaskCode(),
      projectId: targetProjectId,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    addCachedTask(newTask);

    if (isConnectedCrm && targetProjectId) {
      void ideCrmClient
        .createTask(mapGestorTaskToCrmCreateInput(data, targetProjectId))
        .then((res) => {
          if (res?.task) {
            const synced = mapCrmTaskToGestorTask(res.task, 0);
            const finalTask = { ...synced, code: newTask.code };
            setTasks((prev) =>
              prev.map((t) =>
                t.id === tempId ? finalTask : t
              )
            );
            updateCachedTask(finalTask);
          }
        })
        .catch(() => {
          // Mantém estado local caso falhe
        });
    }
  }

  function handleUpdateTask(updatedTask: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    updateCachedTask(updatedTask);

    if (isConnectedCrm && !updatedTask.id.startsWith("task-")) {
      void ideCrmClient
        .updateTask(updatedTask.id, mapGestorTaskToCrmUpdateInput(updatedTask))
        .catch(() => {
          // Mantém atualização otimista
        });
    }
  }

  function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    removeCachedTask(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setIsModalOpen(false);
    }

    if (isConnectedCrm && !id.startsWith("task-")) {
      void ideCrmClient.deleteTask(id).catch(() => {
        // Silencia erro de rede se já removido
      });
    }
  }

  function handleReorderTask(
    draggedTaskId: string,
    targetTaskId: string | null,
    targetStatus: TaskStatus
  ) {
    const dragged = tasks.find((t) => t.id === draggedTaskId);
    if (!dragged) return;

    const updatedDragged: Task = {
      ...dragged,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };

    setTasks((prev) => {
      const withoutDragged = prev.filter((t) => t.id !== draggedTaskId);
      let next: Task[];
      if (!targetTaskId) {
        next = [...withoutDragged, updatedDragged];
      } else {
        const targetIndex = withoutDragged.findIndex((t) => t.id === targetTaskId);
        if (targetIndex === -1) {
          next = [...withoutDragged, updatedDragged];
        } else {
          next = [...withoutDragged];
          next.splice(targetIndex, 0, updatedDragged);
        }
      }
      setCachedTasks(selectedProjectId, next);
      return next;
    });

    if (
      isConnectedCrm &&
      !draggedTaskId.startsWith("task-") &&
      dragged.status !== targetStatus
    ) {
      void ideCrmClient
        .updateTask(
          draggedTaskId,
          mapGestorTaskToCrmUpdateInput(updatedDragged)
        )
        .catch(() => null);
    }
  }

  function handleUpdateTaskSubtasks(taskId: string, subtasks: Task["subtasks"]) {
    const previousTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks, updatedAt: new Date().toISOString() }
          : t
      );
      setCachedTasks(selectedProjectId, next);
      return next;
    });

    if (isConnectedCrm && !taskId.startsWith("task-") && subtasks) {
      const prevItems = previousTask?.subtasks ?? [];
      // Detecta criação de novo item
      if (subtasks.length > prevItems.length) {
        const added = subtasks.find(
          (item) => !prevItems.some((p) => p.id === item.id)
        );
        if (added) {
          void ideCrmClient
            .createChecklistItem(taskId, added.title)
            .then((res) => {
              if (res?.item?.id) {
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === taskId
                      ? {
                          ...t,
                          subtasks: (t.subtasks ?? []).map((s) =>
                            s.id === added.id ? { ...s, id: res.item.id } : s
                          ),
                        }
                      : t
                  )
                );
              }
            })
            .catch(() => null);
        }
      } else if (subtasks.length < prevItems.length) {
        const removed = prevItems.find(
          (p) => !subtasks.some((item) => item.id === p.id)
        );
        if (removed && !removed.id.startsWith("st-")) {
          void ideCrmClient
            .deleteChecklistItem(taskId, removed.id)
            .catch(() => null);
        }
      } else {
        const toggled = subtasks.find((item) => {
          const prev = prevItems.find((p) => p.id === item.id);
          return prev && (prev.completed !== item.completed || prev.title !== item.title);
        });
        if (toggled && !toggled.id.startsWith("st-")) {
          void ideCrmClient
            .updateChecklistItem(taskId, toggled.id, {
              completed: toggled.completed,
              title: toggled.title,
            })
            .catch(() => null);
        }
      }
    }
  }

  function handleAddTaskComment(
    taskId: string,
    comment: NonNullable<Task["comments"]>[number]
  ) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              comments: [...(t.comments ?? []), comment],
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    if (isConnectedCrm && !taskId.startsWith("task-")) {
      void ideCrmClient
        .createTaskComment(taskId, comment.content)
        .catch(() => null);
    }
  }

  function handleSaveFromModal(
    taskData: Omit<Task, "id" | "createdAt" | "code"> & {
      id?: string;
      code?: string;
    }
  ) {
    if (taskData.id) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskData.id) return t;
          const merged: Task = {
            ...t,
            title: taskData.title,
            subtitle: taskData.subtitle ?? t.subtitle,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            tag: taskData.tag,
            tags: taskData.tags ?? t.tags,
            estimate: taskData.estimate,
            projectName: taskData.projectName ?? t.projectName,
            assignee: taskData.assignee ?? t.assignee,
            assigneeAvatar: taskData.assigneeAvatar ?? t.assigneeAvatar,
            coverUrl: taskData.coverUrl !== undefined ? taskData.coverUrl : t.coverUrl,
            icon: taskData.icon !== undefined ? taskData.icon : t.icon,
            subtasks: taskData.subtasks ?? t.subtasks ?? [],
            comments: taskData.comments ?? t.comments ?? [],
            updatedAt: new Date().toISOString(),
          };
          if (isConnectedCrm && !merged.id.startsWith("task-")) {
            void ideCrmClient
              .updateTask(merged.id, mapGestorTaskToCrmUpdateInput(merged))
              .catch(() => null);
          }
          return merged;
        })
      );
    } else {
      handleAddTask(taskData);
    }
    setIsModalOpen(false);
  }

  function handleOpenNewTask(initialStatus: TaskStatus = "PENDENTE") {
    setSelectedTaskId(null);
    setModalInitialStatus(initialStatus);
    setIsModalOpen(true);
  }

  function handleOpenDetails(task: Task) {
    setSelectedTaskId(task.id);
    setIsModalOpen(true);
  }

  function handleClearFilters() {
    setFilters({
      search: "",
      status: "Todos",
      priority: "Todas",
      statuses: [],
      assignees: [],
      priorities: [],
      tags: [],
      dueDateCategory: "all",
      taskType: "all",
    });
  }

  const isFiltered = Boolean(
    filters.search ||
      filters.status !== "Todos" ||
      filters.priority !== "Todas" ||
      (filters.statuses && filters.statuses.length > 0) ||
      (filters.assignees && filters.assignees.length > 0) ||
      (filters.priorities && filters.priorities.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.dueDateCategory && filters.dueDateCategory !== "all") ||
      (filters.taskType && filters.taskType !== "all")
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Main Content Area (Sidebar desativada conforme solicitado) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          managements={effectiveManagements}
          projects={effectiveProjects}
          currentManagementName={currentManagement?.name}
          currentProjectName={currentProject?.name}
          selectedManagementId={selectedManagementId}
          selectedProjectId={selectedProjectId}
          onSelectManagement={handleSelectManagement}
          onSelectProject={handleSelectProject}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFilterChange={setFilters}
          onOpenNewTaskModal={() => handleOpenNewTask("A Fazer")}
          totalTasks={filteredTasks.length}
          groupBy={groupBy}
          groupOrder={groupOrder}
          onGroupByChange={setGroupBy}
          onGroupOrderChange={setGroupOrder}
          tasks={tasks}
          currentUser={currentUser}
          members={members}
          subtaskMode={subtaskMode}
          onSubtaskModeChange={setSubtaskMode}
          showClosedTasks={showClosedTasks}
          onToggleShowClosedTasks={setShowClosedTasks}
          showClosedSubtasks={showClosedSubtasks}
          onToggleShowClosedSubtasks={setShowClosedSubtasks}
          onOpenFieldsModal={() => setIsFieldsModalOpen(true)}
        />

        {/* View Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            selectedProjectId && viewMode === "table" ? "px-3 pt-1 pb-6" : "p-4 md:p-5"
          )}
        >
          {activeModule !== "tasks" ? (
            <EnterpriseModulesView
              section={activeModule}
              isConnected={isConnectedCrm}
              contacts={contacts}
              companies={companies}
              leads={leads}
              financeSummary={financeSummary}
              financeEntries={financeEntries}
              members={members}
              onRefresh={() => void syncWithIdeCrm(selectedProjectId, selectedManagementId)}
              onOpenConnectModal={() => setIsCrmModalOpen(true)}
            />
          ) : selectedManagementId === null ? (
            /* Nível 1: Cards de Todas as Gestões */
            <ManagementsGridView
              managements={effectiveManagements}
              onSelectManagement={(id) => handleSelectManagement(id)}
              onOpenCreateManagement={() => setIsCrmModalOpen(true)}
            />
          ) : selectedProjectId === null && currentManagement ? (
            /* Nível 2: Cards dos Projetos da Gestão Selecionada */
            <ManagementProjectsView
              management={currentManagement}
              projects={effectiveProjects}
              tasks={tasks}
              onBack={() => handleSelectManagement(null)}
              onSelectProject={(id) => handleSelectProject(id)}
              onOpenNewProject={() => handleOpenNewTask("A Fazer")}
            />
          ) : isSyncingTasks ? (
            <TaskTableSkeleton />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              onAddTask={() => handleOpenNewTask("A Fazer")}
              isFiltered={isFiltered}
              onClearFilters={handleClearFilters}
            />
          ) : viewMode === "kanban" ? (
            <TaskKanban
              tasks={filteredTasks}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenDetails={handleOpenDetails}
              onQuickAdd={handleOpenNewTask}
            />
          ) : (
            <TaskTable
              tasks={filteredTasks}
              groupBy={groupBy}
              groupOrder={groupOrder}
              onGroupByChange={setGroupBy}
              onGroupOrderChange={setGroupOrder}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenDetails={handleOpenDetails}
              onAddTask={handleAddTask}
              onUpdateSubtasks={handleUpdateTaskSubtasks}
              onReorderTasks={handleReorderTask}
              isFieldsModalOpen={isFieldsModalOpen}
              onOpenFieldsModal={() => setIsFieldsModalOpen(true)}
              onCloseFieldsModal={() => setIsFieldsModalOpen(false)}
              subtaskMode={subtaskMode}
              showClosedSubtasks={showClosedSubtasks}
            />
          )}
        </main>
      </div>

      {/* Task Creation & Inspection Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        initialStatus={modalInitialStatus}
        onSave={handleSaveFromModal}
        onUpdateTask={handleUpdateTask}
        onDelete={handleDeleteTask}
        onUpdateSubtasks={handleUpdateTaskSubtasks}
        onAddComment={handleAddTaskComment}
      />

      {/* Modal de Conexão e Sincronização com o IDE CRM */}
      <CrmConnectionDialog
        isOpen={isCrmModalOpen}
        onClose={() => setIsCrmModalOpen(false)}
        isConnected={isConnectedCrm}
        isApiReachable={isApiReachable}
        currentUser={currentUser}
        onSuccessConnect={() => syncWithIdeCrm(selectedProjectId, selectedManagementId)}
        onDisconnect={handleDisconnectCrm}
      />
    </div>
  );
}
