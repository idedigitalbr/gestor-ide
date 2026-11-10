"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  mapCrmTaskToGestorTask,
  mapGestorTaskToCrmCreateInput,
  mapGestorTaskToCrmUpdateInput,
  type AppModuleSection,
  type CrmCompany,
  type CrmContact,
  type CrmFinancialEntry,
  type CrmFinancialSummary,
  type CrmLead,
  type CrmProject,
  type CrmProjectManagement,
  type CrmProjectMember,
  type CrmUserProfile,
  type Task,
  type TaskFilter,
  type TaskStatus,
  type ViewMode,
} from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { INITIAL_TASKS } from "@/lib/initial-data";
import { Sidebar } from "@/components/sidebar";
import { AppHeader } from "@/components/app-header";
import { TaskTable } from "@/components/task-table/task-table";
import { TaskKanban } from "@/components/task-kanban/task-kanban";
import { TaskModal } from "@/components/task-modal";
import { EmptyState } from "@/components/empty-state";
import { CrmConnectionDialog } from "@/components/crm-connection-dialog";
import { EnterpriseModulesView } from "@/components/enterprise-modules-view";

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
  const initialView: ViewMode =
    searchParams.get("view") === "table" ? "table" : "kanban";
  const initialModal = searchParams.get("modal");

  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [activeModule, setActiveModule] = useState<AppModuleSection>("tasks");

  // Barra lateral retrátil (shadcn/ui Sidebar): PADRÃO FECHADA (false) conforme solicitado
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estado de Integração com a API Central do IDE CRM
  const [isApiReachable, setIsApiReachable] = useState(false);
  const [isConnectedCrm, setIsConnectedCrm] = useState(false);
  const [currentUser, setCurrentUser] = useState<CrmUserProfile | null>(null);
  const [isCrmModalOpen, setIsCrmModalOpen] = useState(false);

  // Dados sincronizados do IDE CRM
  const [managements, setManagements] = useState<CrmProjectManagement[]>([]);
  const [selectedManagementId, setSelectedManagementId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gestor_selected_management_id") || null;
    }
    return null;
  });
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [financeSummary, setFinanceSummary] = useState<CrmFinancialSummary | null>(null);
  const [financeEntries, setFinanceEntries] = useState<CrmFinancialEntry[]>([]);
  const [members, setMembers] = useState<CrmProjectMember[]>([]);

  // Monotonic collision-free code counter initialized above existing tasks
  const nextCodeNumberRef = useRef(getHighestCodeNumber(INITIAL_TASKS) + 1);

  // Filters state
  const [filters, setFilters] = useState<TaskFilter>({
    search: "",
    status: "Todos",
    priority: "Todas",
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialModal));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    if (initialModal && initialModal !== "new") {
      const found = INITIAL_TASKS.find((t) => t.code === initialModal);
      return found ? found.id : INITIAL_TASKS[1]?.id ?? null;
    }
    return null;
  });
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>("A Fazer");

  const syncWithIdeCrm = useCallback(
    async (projectIdFilter?: string | null) => {
      try {
        const health = await ideCrmClient.health().catch(() => null);
        setIsApiReachable(Boolean(health?.status === "ok"));

        const session = await ideCrmClient.getSession();
        if (!session.authenticated || !session.user) {
          setIsConnectedCrm(false);
          setCurrentUser(null);
          return;
        }

        setIsConnectedCrm(true);
        setCurrentUser(session.user);

        const [
          managementsRes,
          projectsRes,
          tasksRes,
          contactsRes,
          companiesRes,
          leadsRes,
          finSummaryRes,
          finEntriesRes,
          membersRes,
        ] = await Promise.all([
          ideCrmClient.listManagements().catch(() => ({ managements: [] })),
          ideCrmClient.listProjects().catch(() => ({ projects: [] })),
          ideCrmClient
            .listTasks({
              projectId: projectIdFilter ?? undefined,
            })
            .catch(() => null),
          ideCrmClient.listContacts().catch(() => ({ contacts: [] })),
          ideCrmClient.listCompanies().catch(() => ({ companies: [] })),
          ideCrmClient.listLeads().catch(() => ({ leads: [] })),
          ideCrmClient.getFinanceSummary().catch(() => null),
          ideCrmClient.listFinanceEntries().catch(() => ({ entries: [] })),
          ideCrmClient
            .listProjectMembers(projectIdFilter ?? undefined)
            .catch(() => ({ members: [] })),
        ]);

        setManagements(managementsRes.managements ?? []);
        setProjects(projectsRes.projects ?? []);
        if (tasksRes && Array.isArray(tasksRes.tasks)) {
          const mapped = tasksRes.tasks.map((t, idx) =>
            mapCrmTaskToGestorTask(t, idx)
          );
          setTasks(mapped);
          nextCodeNumberRef.current = getHighestCodeNumber(mapped) + 1;
        }
        setContacts(contactsRes.contacts ?? []);
        setCompanies(companiesRes.companies ?? []);
        setLeads(leadsRes.leads ?? []);
        setFinanceSummary(finSummaryRes);
        setFinanceEntries(finEntriesRes.entries ?? []);
        setMembers(membersRes.members ?? []);
      } catch {
        // Permanece em modo local caso a API não esteja ativa no momento
      }
    },
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncWithIdeCrm(selectedProjectId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [syncWithIdeCrm, selectedProjectId]);

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

  function handleSelectManagement(managementId: string | null) {
    setSelectedManagementId(managementId);
    if (typeof window !== "undefined") {
      if (managementId) {
        localStorage.setItem("gestor_selected_management_id", managementId);
      } else {
        localStorage.removeItem("gestor_selected_management_id");
      }
    }
    // Se o projeto selecionado não pertencer à nova gestão, volta para ver todos daquela gestão
    if (managementId && selectedProjectId) {
      const p = projects.find((item) => item.id === selectedProjectId);
      if (p && p.projectManagementId !== managementId) {
        setSelectedProjectId(null);
      }
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
  }

  // Active selected task derived reactively from current tasks state
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [tasks, selectedTaskId]);

  const currentManagement = useMemo(() => {
    if (!selectedManagementId) return null;
    return managements.find((m) => m.id === selectedManagementId) ?? null;
  }, [managements, selectedManagementId]);

  const currentProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  // Filtered tasks computation respeitando a Hierarquia: Gestão -> Projeto -> Filtros
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Filtro por Projeto Ativo
      if (selectedProjectId) {
        if (task.projectId && task.projectId !== selectedProjectId) {
          return false;
        }
      } else if (selectedManagementId) {
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

      if (filters.status !== "Todos" && task.status !== filters.status) {
        return false;
      }

      if (filters.priority !== "Todas" && task.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [tasks, filters, selectedProjectId, selectedManagementId, projects]);

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

    if (isConnectedCrm && targetProjectId) {
      void ideCrmClient
        .createTask(mapGestorTaskToCrmCreateInput(data, targetProjectId))
        .then((res) => {
          if (res?.task) {
            const synced = mapCrmTaskToGestorTask(res.task, 0);
            setTasks((prev) =>
              prev.map((t) =>
                t.id === tempId ? { ...synced, code: newTask.code } : t
              )
            );
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
      if (!targetTaskId) {
        return [...withoutDragged, updatedDragged];
      }
      const targetIndex = withoutDragged.findIndex((t) => t.id === targetTaskId);
      if (targetIndex === -1) {
        return [...withoutDragged, updatedDragged];
      }
      const next = [...withoutDragged];
      next.splice(targetIndex, 0, updatedDragged);
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
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks, updatedAt: new Date().toISOString() }
          : t
      )
    );

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
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            tag: taskData.tag,
            estimate: taskData.estimate,
            subtasks: t.subtasks ?? [],
            comments: t.comments ?? [],
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

  function handleOpenNewTask(initialStatus: TaskStatus = "A Fazer") {
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
    });
  }

  const isFiltered = Boolean(
    filters.search || filters.status !== "Todos" || filters.priority !== "Todas"
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Retrátil (Padrão: Fechada) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        managements={managements}
        selectedManagementId={selectedManagementId}
        onSelectManagement={handleSelectManagement}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        isConnectedCrm={isConnectedCrm}
        onOpenCrmModal={() => setIsCrmModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          currentManagementName={currentManagement?.name}
          currentProjectName={currentProject?.name}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFilterChange={setFilters}
          onOpenNewTaskModal={() => handleOpenNewTask("A Fazer")}
          onOpenCrmModal={() => setIsCrmModalOpen(true)}
          isConnectedCrm={isConnectedCrm}
          totalTasks={filteredTasks.length}
        />

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5">
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
              onRefresh={() => void syncWithIdeCrm(selectedProjectId)}
              onOpenConnectModal={() => setIsCrmModalOpen(true)}
            />
          ) : filteredTasks.length === 0 && tasks.length === 0 ? (
            <EmptyState onAddTask={() => handleOpenNewTask("A Fazer")} />
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
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenDetails={handleOpenDetails}
              onAddTask={handleAddTask}
              onUpdateSubtasks={handleUpdateTaskSubtasks}
              onReorderTasks={handleReorderTask}
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
        onSuccessConnect={() => syncWithIdeCrm(selectedProjectId)}
        onDisconnect={handleDisconnectCrm}
      />
    </div>
  );
}
