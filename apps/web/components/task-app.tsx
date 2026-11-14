"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  mapCrmTaskToGestorTask,
  mapGestorTaskToCrmCreateInput,
  mapGestorTaskToCrmUpdateInput,
  normalizeTaskStatus,
  normalizeTaskPriority,
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
} from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { CrmLoginView } from "@/components/crm-login-view";
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
  getLocalTaskPresentation,
  setLocalTaskPresentation,
  removeLocalTaskPresentation,
} from "@/lib/gestor-cache";
import { AppHeader, type SubtaskDisplayMode } from "@/components/app-header";
import { ManagementsGridView } from "@/components/managements-grid-view";
import { ManagementProjectsView } from "@/components/management-projects-view";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { NewManagementDialog } from "@/components/new-management-dialog";
import type { ListDisplayMode } from "@/lib/list-view-options";
import {
  applyBatchTaskDragAndDrop,
  applyTaskDragAndDrop,
  type TaskDropMode,
} from "@/lib/task-hierarchy";
import { canPerformProjectAction } from "@/lib/crm-permissions";
import { reconcileRemoteTasks } from "@/lib/task-sync";
import { MembersDialog, type TeamMemberItem } from "@/components/members-dialog";
import { TaskTable } from "@/components/task-table/task-table";
import { TaskKanban } from "@/components/task-kanban/task-kanban";
import { TaskAdditionalView } from "@/components/task-additional-view";
import { TaskModal } from "@/components/task-modal";
import { EmptyState } from "@/components/empty-state";
import { CrmConnectionDialog } from "@/components/crm-connection-dialog";
import { TaskTableSkeleton } from "@/components/task-skeleton";
import { cn } from "@/lib/utils";
import { useCalendarDialog } from "@/components/calendar-dialog-context";

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

export function TaskApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSecondaryPage = pathname !== "/";
  const isCalendarPage = pathname === "/projects/calendar";
  const {
    openCreateDialog,
    canCreate: canCreateCalendarEvent,
  } = useCalendarDialog();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewManagementOpen, setIsNewManagementOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [onlyMyManagements, setOnlyMyManagements] = useState(() => {
    try { return localStorage.getItem("gestor_only_my_managements") !== "false"; } catch { return true; }
  });
  const [onlyMyProjects, setOnlyMyProjects] = useState(() => {
    try { return localStorage.getItem("gestor_only_my_projects") !== "false"; } catch { return true; }
  });
  const [onlyMyTasks, setOnlyMyTasks] = useState(() => {
    try { return localStorage.getItem("gestor_only_my_tasks") === "true"; } catch { return false; }
  });
  const [membershipRetry, setMembershipRetry] = useState(0);
  const [projectMembership, setProjectMembership] = useState<{
    userId: string;
    projectIds: Set<string> | null;
    error: boolean;
  } | null>(null);
  const [managementVisibility, setManagementVisibility] = useState("all");
  const [projectStatus, setProjectStatus] = useState("all");
  const [managementViewMode, setManagementViewMode] = useState<ListDisplayMode>("cards");
  const [projectViewMode, setProjectViewMode] = useState<ListDisplayMode>("cards");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
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
      const cached = selectedManagementId && !selectedProjectId ? null : getCachedTasks(selectedProjectId);
      if (cached && cached.length > 0) return cached;
    } catch {}
    return [];
  });

  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Estados de visualização ClickUp: subtarefas, tarefas fechadas e campos
  const [subtaskMode, setSubtaskMode] = useState<SubtaskDisplayMode>("collapsed");
  const [showClosedTasks, setShowClosedTasks] = useState(true);
  const [showClosedSubtasks] = useState(true);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);

  // Estado de Integração com a API Central do IDE CRM
  const [isApiReachable, setIsApiReachable] = useState(false);
  const [isConnectedCrm, setIsConnectedCrm] = useState<boolean>(() => {
    return Boolean(getCachedSession());
  });
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => {
    return !(getCachedSession() && getCachedManagements());
  });
  const [currentUser, setCurrentUser] = useState<CrmUserProfile | null>(() => {
    return getCachedSession();
  });
  const [isCrmModalOpen, setIsCrmModalOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Se já temos tarefas ou gestões em cache, NÃO mostramos skeleton no F5!
  const [isSyncingTasks, setIsSyncingTasks] = useState<boolean>(() => {
    try {
      const cached = selectedManagementId && !selectedProjectId ? null : getCachedTasks(selectedProjectId);
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

  const [projectMembers, setProjectMembers] = useState<{
    projectId: string;
    members: CrmProjectMember[];
  } | null>(null);

  useEffect(() => {
    if (!selectedProjectId || !isConnectedCrm) return;
    let cancelled = false;
    void ideCrmClient.listProjectMembers(selectedProjectId).then((result) => {
      if (!cancelled) setProjectMembers({ projectId: selectedProjectId, members: result.members });
    }).catch(() => {
      if (!cancelled) {
        setProjectMembers(null);
        setSyncError("Não foi possível carregar os membros deste projeto.");
      }
    });
    return () => { cancelled = true; };
  }, [selectedProjectId, isConnectedCrm]);

  // Contador de requisições ativas para cancelar/ignorar respostas obsoletas (race condition)
  const activeRequestIdRef = useRef(0);
  const taskUpdateVersionsRef = useRef(new Map<string, number>());
  const pendingTaskCountsRef = useRef(new Map<string, number>());
  const pendingTaskIdsRef = useRef(new Set<string>());
  const lastBackgroundSyncRef = useRef(0);

  const trackPendingTask = useCallback((taskId: string) => {
    const next = (pendingTaskCountsRef.current.get(taskId) ?? 0) + 1;
    pendingTaskCountsRef.current.set(taskId, next);
    pendingTaskIdsRef.current.add(taskId);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = (pendingTaskCountsRef.current.get(taskId) ?? 1) - 1;
      if (current <= 0) {
        pendingTaskCountsRef.current.delete(taskId);
        pendingTaskIdsRef.current.delete(taskId);
      } else {
        pendingTaskCountsRef.current.set(taskId, current);
      }
    };
  }, []);

  // Monotonic collision-free code counter initialized above existing tasks
  const nextCodeNumberRef = useRef(100);

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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialModal));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    if (initialModal && initialModal !== "new") {
      const found = tasks.find(
        (t) => t.id === initialModal || t.code === initialModal
      );
      return found ? found.id : null;
    }
    return null;
  });
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>("PENDENTE");
  const [hasModalRemoteConflict, setHasModalRemoteConflict] = useState(false);
  const [isProjectMembersOpen, setIsProjectMembersOpen] = useState(false);
  const isModalDirtyRef = useRef(false);
  const isModalOpenRef = useRef(isModalOpen);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
    if (!isModalOpen) {
      isModalDirtyRef.current = false;
    }
  }, [isModalOpen]);

  const selectedTaskIdRef = useRef(selectedTaskId);
  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  const handledInitialModalRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialModal || handledInitialModalRef.current === initialModal) return;
    if (initialModal === "new") {
      handledInitialModalRef.current = initialModal;
      return;
    }
    const found = tasks.find((t) => t.id === initialModal || t.code === initialModal);
    if (found) {
      handledInitialModalRef.current = initialModal;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTaskId(found.id);
      setIsModalOpen(true);
    }
  }, [initialModal, tasks]);

  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const isConnectedCrmRef = useRef(isConnectedCrm);
  useEffect(() => {
    isConnectedCrmRef.current = isConnectedCrm;
  }, [isConnectedCrm]);

  const selectedManagementIdRef = useRef(selectedManagementId);
  useEffect(() => {
    selectedManagementIdRef.current = selectedManagementId;
  }, [selectedManagementId]);

  const selectedProjectIdRef = useRef(selectedProjectId);
  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  useEffect(() => {
    function handleAccountUpdated(event: Event) {
      const detail = (
        event as CustomEvent<{
          name?: string | null;
          email?: string;
          avatarUrl?: string | null;
        }>
      ).detail;
      if (!detail) return;
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const next: CrmUserProfile = {
          ...prev,
          name: detail.name !== undefined ? detail.name : prev.name,
          email: detail.email ?? prev.email,
          avatarUrl: detail.avatarUrl !== undefined ? detail.avatarUrl : prev.avatarUrl,
        };
        setCachedSession(next);
        return next;
      });
    }
    window.addEventListener("gestor:account-updated", handleAccountUpdated);
    return () => window.removeEventListener("gestor:account-updated", handleAccountUpdated);
  }, []);

  // Busca direcionada e rápida de tarefas baseada no projeto ou gestão selecionados (com SWR)
  const loadTasks = useCallback(
    async (
      projectIdFilter: string | null,
      managementIdFilter: string | null,
      availableProjects?: CrmProject[],
      silent = false
    ) => {
      if (!isConnectedCrmRef.current) {
        setIsSyncingTasks(false);
        return;
      }

      const currentRequestId = ++activeRequestIdRef.current;
      const cached = managementIdFilter && !projectIdFilter ? null : getCachedTasks(projectIdFilter);

      // Se não há cache e não é silencioso, exibe o skeleton estrutural
      if (!silent && (!cached || cached.length === 0)) {
        setIsSyncingTasks(true);
      }

      try {
        setSyncError(null);
        let loadedTasks: CrmProjectTask[] = [];

        if (projectIdFilter) {
          // Busca direcionada para o projeto selecionado
          const res = await ideCrmClient.listTasks({ projectId: projectIdFilter });
          if (currentRequestId !== activeRequestIdRef.current) return;
          loadedTasks = res.tasks ?? [];
        } else if (managementIdFilter) {
          // Busca as tarefas dos projetos daquela gestão
          const currentProjects = availableProjects ?? projectsRef.current;
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
                ideCrmClient.listTasks({ projectId: p.id })
              )
            );
            if (currentRequestId !== activeRequestIdRef.current) return;
            loadedTasks = responses.flatMap((r) => r.tasks ?? []);
          } else {
            loadedTasks = [];
          }
        } else {
          // Todas as gestões
          const res = await ideCrmClient.listTasks();
          if (currentRequestId !== activeRequestIdRef.current) return;
          loadedTasks = res.tasks ?? [];
        }

        const mapped = loadedTasks.map((t, idx) => ({
          ...mapCrmTaskToGestorTask(t, idx),
          ...getLocalTaskPresentation(t.id),
        }));
        const syncOptions = {
          editingTaskId: isModalOpenRef.current ? selectedTaskIdRef.current : null,
          isModalDirty: isModalDirtyRef.current,
          pendingTaskIds: pendingTaskIdsRef.current,
        };
        const previewReconcile = reconcileRemoteTasks(tasksRef.current, mapped, syncOptions);
        setHasModalRemoteConflict(previewReconcile.hasEditingConflict);
        setTasks((prevLocal) => {
          const reconciled = reconcileRemoteTasks(prevLocal, mapped, syncOptions);
          if (projectIdFilter || !managementIdFilter) {
            setCachedTasks(projectIdFilter, reconciled.tasks);
          }
          nextCodeNumberRef.current = getHighestCodeNumber(reconciled.tasks) + 1;
          return reconciled.tasks;
        });
        lastBackgroundSyncRef.current = Date.now();
      } catch {
        if (currentRequestId !== activeRequestIdRef.current) return;
        if (!silent) {
          setTasks(cached ?? []);
          setSyncError("Não foi possível atualizar as tarefas do CRM. Tente novamente.");
        }
      } finally {
        if (currentRequestId === activeRequestIdRef.current) {
          setIsSyncingTasks(false);
        }
      }
    },
    []
  );

  // Sincronização global ultra-otimizada (paralela e sem travar a UI)
  const syncWithIdeCrm = useCallback(
    async (
      projectIdFilter?: string | null,
      managementIdFilter?: string | null
    ) => {
      try {
        const session = await ideCrmClient.getSession();
        if (!session || !session.authenticated || !session.user) {
          clearGestorCache();
          setManagements([]);
          setProjects([]);
          setIsApiReachable(Boolean(session));
          isConnectedCrmRef.current = false;
          setIsConnectedCrm(false);
          setCurrentUser(null);
          setCachedSession(null);
          setTasks([]);
          setSelectedManagementId(null);
          setSelectedProjectId(null);
          try {
            localStorage.removeItem("gestor_selected_management_id");
            localStorage.removeItem("gestor_selected_project_id");
          } catch {}
          setIsSyncingTasks(false);
          setIsBootstrapping(false);
          return;
        }

        const previousUser = getCachedSession();
        if (previousUser && previousUser.id !== session.user.id) {
          clearGestorCache();
          setManagements([]);
          setProjects([]);
          setTasks([]);
        }

        // Dispara em paralelo sem waterfalls bloqueantes:
        // 1) Gestões
        // 2) Projetos
        // 3) Membros
        // 4) Tarefas do projeto atual (em modo silencioso se já houver cache)
        const hasCached = !managementIdFilter || Boolean(projectIdFilter)
          ? Boolean(getCachedTasks(projectIdFilter ?? null)?.length)
          : false;
        const [managementsRes, projectsRes, membersRes] = await Promise.all([
          ideCrmClient.listManagements().catch(() => null),
          ideCrmClient.listProjects().catch(() => null),
          ideCrmClient.listProjectMembers(projectIdFilter ?? undefined).catch(() => null),
        ]);

        const loadedManagements = managementsRes?.managements ?? [];
        const loadedProjects = projectsRes?.projects ?? [];

        setIsApiReachable(true);
        isConnectedCrmRef.current = true;
        setIsConnectedCrm(true);
        setCurrentUser(session.user);
        setCachedSession(session.user);

        if (managementsRes) {
          setManagements(loadedManagements);
          setCachedManagements(loadedManagements);
          if (
            selectedManagementIdRef.current &&
            !loadedManagements.some((m) => m.id === selectedManagementIdRef.current)
          ) {
            setSelectedManagementId(null);
            setSelectedProjectId(null);
            try {
              localStorage.removeItem("gestor_selected_management_id");
              localStorage.removeItem("gestor_selected_project_id");
            } catch {}
          }
        }
        if (projectsRes) {
          setProjects(loadedProjects);
          setCachedProjects(loadedProjects);
          if (
            selectedProjectIdRef.current &&
            !loadedProjects.some((p) => p.id === selectedProjectIdRef.current)
          ) {
            setSelectedProjectId(null);
            try {
              localStorage.removeItem("gestor_selected_project_id");
            } catch {}
          }
        }
        if (membersRes?.members) {
          if (!projectIdFilter) {
            const uid = session.user.id;
            setProjectMembership({
              userId: uid,
              projectIds: new Set(
                membersRes.members
                  .filter((member) => member.userId === uid)
                  .map((member) => member.projectId)
              ),
              error: false,
            });
          }
        }
        setIsBootstrapping(false);

        if (managementIdFilter && !projectIdFilter && !projectsRes) {
          setSyncError("Não foi possível carregar os projetos da gestão. Tente novamente.");
          setIsSyncingTasks(false);
        } else {
          await loadTasks(projectIdFilter ?? null, managementIdFilter ?? null, loadedProjects, hasCached);
          if (!managementsRes || !projectsRes) {
            setSyncError("Não foi possível atualizar todas as gestões e projetos do CRM.");
          }
        }
      } catch {
        setIsApiReachable(false);
        isConnectedCrmRef.current = false;
        setIsConnectedCrm(false);
        setSyncError("Não foi possível conectar ao CRM. Verifique a conexão e atualize os dados.");
        setIsSyncingTasks(false);
        setIsBootstrapping(false);
      }
    },
    [loadTasks]
  );

  useEffect(() => {
    // A sessão vem de uma API externa e só pode ser validada no cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncWithIdeCrm(selectedProjectId, selectedManagementId);
    // Executa apenas uma vez na montagem inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isConnectedCrm || isSecondaryPage) return;

    const triggerBackgroundSync = (minAgeMs: number) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (pendingTaskIdsRef.current.size > 0) return;
      if (Date.now() - lastBackgroundSyncRef.current < minAgeMs) return;
      lastBackgroundSyncRef.current = Date.now();
      void loadTasks(
        selectedProjectIdRef.current,
        selectedManagementIdRef.current,
        undefined,
        true
      );
    };

    const intervalId = window.setInterval(() => triggerBackgroundSync(25_000), 30_000);
    const onVisibilityOrFocus = () => triggerBackgroundSync(15_000);

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [isConnectedCrm, isSecondaryPage, loadTasks]);

  const effectiveManagements = managements;
  const effectiveProjects = projects;

  useEffect(() => {
    if ((!onlyMyProjects && !onlyMyManagements) || !isConnectedCrm || !currentUser?.id) return;
    const userId = currentUser.id;
    let cancelled = false;
    void ideCrmClient.listProjectMembers().then(({ members: projectMemberList }) => {
      if (!cancelled) setProjectMembership({ userId, projectIds: new Set(projectMemberList.filter((member) => member.userId === userId).map((member) => member.projectId)), error: false });
    }).catch(() => {
      if (!cancelled) setProjectMembership({ userId, projectIds: null, error: true });
    });
    return () => { cancelled = true; };
  }, [onlyMyProjects, onlyMyManagements, isConnectedCrm, currentUser?.id, projects, membershipRetry]);

  const membershipForCurrentUser = projectMembership?.userId === currentUser?.id ? projectMembership : null;
  const membershipPending = (onlyMyProjects || onlyMyManagements) && isConnectedCrm && Boolean(currentUser?.id) && !membershipForCurrentUser;

  const myManagementIds = useMemo(() => {
    if (!currentUser?.id) return new Set<string>();
    const uid = currentUser.id;
    const ids = new Set<string>();
    for (const m of effectiveManagements) {
      const isDirectMember = Boolean(
        m.members?.some((mem) => mem.userId === uid || mem.user?.id === uid)
      );
      if (isDirectMember) {
        ids.add(m.id);
        continue;
      }
      const hasProject = effectiveProjects.some(
        (p) =>
          p.projectManagementId === m.id &&
          (membershipForCurrentUser?.projectIds?.has(p.id) ||
            p.members?.some((pm) => pm.userId === uid))
      );
      if (hasProject) {
        ids.add(m.id);
      }
    }
    return ids;
  }, [currentUser?.id, effectiveManagements, effectiveProjects, membershipForCurrentUser]);

  const visibleManagements = useMemo(() => {
    if (!onlyMyManagements || !isConnectedCrm || !currentUser?.id) return effectiveManagements;
    return effectiveManagements.filter((m) => myManagementIds.has(m.id));
  }, [onlyMyManagements, isConnectedCrm, currentUser?.id, effectiveManagements, myManagementIds]);

  const visibleProjects = useMemo(() => {
    if (!onlyMyProjects || !isConnectedCrm || !currentUser?.id) return effectiveProjects;
    const projectIds = membershipForCurrentUser?.projectIds;
    return projectIds ? effectiveProjects.filter((project) => projectIds.has(project.id)) : [];
  }, [onlyMyProjects, isConnectedCrm, currentUser?.id, effectiveProjects, membershipForCurrentUser]);

  function updateOnlyMyManagements(value: boolean) {
    setOnlyMyManagements(value);
    try { localStorage.setItem("gestor_only_my_managements", String(value)); } catch {}
  }

  function updateOnlyMyProjects(value: boolean) {
    setOnlyMyProjects(value);
    try { localStorage.setItem("gestor_only_my_projects", String(value)); } catch {}
  }

  function updateOnlyMyTasks(value: boolean) {
    setOnlyMyTasks(value);
    try { localStorage.setItem("gestor_only_my_tasks", String(value)); } catch {}
  }

  function handleSelectManagement(managementId: string | null) {
    setListSearch("");
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

    if (!isConnectedCrm) {
      setIsSyncingTasks(false);
      return;
    }

    const cached = managementId ? null : getCachedTasks(null);
    if (cached && cached.length > 0) {
      setTasks(cached);
      setIsSyncingTasks(false);
      void loadTasks(null, managementId, undefined, true);
    } else {
      void loadTasks(null, managementId, undefined, false);
    }
  }

  function handleSelectProject(projectId: string | null) {
    setListSearch("");
    setViewMode("table");
    setSelectedProjectId(projectId);
    try {
      if (projectId) {
        localStorage.setItem("gestor_selected_project_id", projectId);
      } else {
        localStorage.removeItem("gestor_selected_project_id");
      }
    } catch {}

    let resolvedManagementId = selectedManagementId;
    if (projectId) {
      const proj = effectiveProjects.find((p) => p.id === projectId);
      if (proj && proj.projectManagementId && proj.projectManagementId !== selectedManagementId) {
        resolvedManagementId = proj.projectManagementId;
        setSelectedManagementId(proj.projectManagementId);
        try {
          localStorage.setItem("gestor_selected_management_id", proj.projectManagementId);
        } catch {}
      }
    }

    if (!isConnectedCrm) {
      setIsSyncingTasks(false);
      return;
    }

    // Transição instantânea (0ms): se o projeto já está em cache, exibe imediatamente
    const cached = !projectId && resolvedManagementId ? null : getCachedTasks(projectId);
    if (cached && cached.length > 0) {
      setTasks(cached);
      setIsSyncingTasks(false);
      // Revalida em background sem tela preta / skeleton
      void loadTasks(projectId, resolvedManagementId, undefined, true);
    } else {
      setIsSyncingTasks(true);
      void loadTasks(projectId, resolvedManagementId, undefined, false);
    }
  }

  async function handleDisconnectCrm() {
    try {
      await ideCrmClient.logout();
    } catch {
      // O SDK limpa o token local mesmo quando o CRM está indisponível.
    }
    isConnectedCrmRef.current = false;
    setIsConnectedCrm(false);
    setIsSyncingTasks(false);
    setCurrentUser(null);
    setManagements([]);
    setSelectedManagementId(null);
    setProjects([]);
    setSelectedProjectId(null);
    setTasks([]);
    clearGestorCache();
  }

  // Active selected task derived reactively from current tasks state
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId || t.code === selectedTaskId) ?? null;
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
      if (onlyMyTasks && (!currentUser?.id || !(task.assigneeIds ?? (task.assigneeId ? [task.assigneeId] : [])).includes(currentUser.id))) return false;
      // 1. Filtro por Projeto Ativo (só filtra quando os projetos já carregaram ou quando a tarefa já possui projectId correspondente)
      if (selectedProjectId && effectiveProjects.length > 0) {
        if (task.projectId && task.projectId !== selectedProjectId) {
          return false;
        }
      } else if (selectedManagementId && effectiveProjects.length > 0) {
        // Se estiver em "Todos os Projetos" de uma Gestão específica,
        // exibe apenas tarefas cujos projetos pertençam àquela gestão
        const allowedProjectIds = new Set(
          effectiveProjects
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
        const todayStr = new Date(currentTime).toISOString().slice(0, 10);
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
          const inSevenDays = new Date(currentTime + 7 * 86400000)
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
  }, [tasks, filters, selectedProjectId, selectedManagementId, effectiveProjects, showClosedTasks, currentTime, onlyMyTasks, currentUser]);

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
        ? effectiveProjects.find((p) => p.projectManagementId === selectedManagementId)?.id
        : null) ||
      effectiveProjects[0]?.id;
    if (isConnectedCrm && !targetProjectId) {
      setSyncError("Selecione um projeto antes de criar uma tarefa no CRM.");
      return;
    }
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
            const presentation = { itemType: newTask.itemType, customGroup: newTask.customGroup };
            setLocalTaskPresentation(synced.id, presentation);
            const finalTask = {
              ...synced,
              ...presentation,
              ...(res.task.assignees === undefined ? { assigneeId: newTask.assigneeId, assignee: newTask.assignee, assigneeAvatar: newTask.assigneeAvatar } : {}),
              code: newTask.code,
            };
            setTasks((prev) =>
              prev.map((t) =>
                t.id === tempId ? finalTask : t
              )
            );
            removeCachedTask(tempId);
            addCachedTask(finalTask);
          }
        })
        .catch(() => {
          setTasks((prev) => prev.filter((t) => t.id !== tempId));
          removeCachedTask(tempId);
          setSyncError("A tarefa não foi salva no CRM. Tente novamente.");
        });
    }
  }

  function handleUpdateTask(updatedTask: Task) {
    const previousTask = tasks.find((task) => task.id === updatedTask.id);
    const presentationChanged =
      previousTask &&
      (updatedTask.itemType !== previousTask.itemType ||
        updatedTask.customGroup !== previousTask.customGroup);
    if (presentationChanged) {
      setLocalTaskPresentation(updatedTask.id, {
        itemType: updatedTask.itemType,
        customGroup: updatedTask.customGroup,
      });
    }

    const version = (taskUpdateVersionsRef.current.get(updatedTask.id) ?? 0) + 1;
    taskUpdateVersionsRef.current.set(updatedTask.id, version);
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    updateCachedTask(updatedTask);

    if (isConnectedCrm && !updatedTask.id.startsWith("task-")) {
      const fullPayload = mapGestorTaskToCrmUpdateInput(updatedTask);
      const prevPayload = previousTask ? mapGestorTaskToCrmUpdateInput(previousTask) : null;
      const changedPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fullPayload)) {
        if (!prevPayload || JSON.stringify(prevPayload[key]) !== JSON.stringify(value)) {
          changedPayload[key] = value;
        }
      }
      if (previousTask?.startDate && !updatedTask.startDate) changedPayload.startDate = null;
      if (previousTask?.dueDate && !updatedTask.dueDate) changedPayload.dueDate = null;

      if (Object.keys(changedPayload).length === 0) {
        return;
      }

      const releasePending = trackPendingTask(updatedTask.id);
      void ideCrmClient
        .updateTask(updatedTask.id, changedPayload)
        .catch(() => {
          if (previousTask && taskUpdateVersionsRef.current.get(updatedTask.id) === version) {
            setTasks((current) =>
              current.map((task) => (task.id === updatedTask.id ? previousTask : task))
            );
            updateCachedTask(previousTask);
          }
          setSyncError("A alteração não foi salva no CRM. Atualize os dados antes de tentar novamente.");
        })
        .finally(releasePending);
    }
  }

  async function handleChangeAssignee(taskId: string, member: CrmProjectMember | null): Promise<boolean> {
    if (!isConnectedCrm || taskId.startsWith("task-")) return false;
    const releasePending = trackPendingTask(taskId);
    try {
      await ideCrmClient.setTaskAssignees(taskId, member ? [member.userId] : []);
      const existing = tasks.find((task) => task.id === taskId);
      const patch = {
        assigneeId: member?.userId,
        assigneeIds: member ? [member.userId] : [],
        assignee: member?.user.name || member?.user.email || undefined,
        assigneeAvatar: member?.user.avatarUrl || undefined,
      };
      setTasks((previous) => previous.map((task) => task.id === taskId ? { ...task, ...patch } : task));
      if (existing) updateCachedTask({ ...existing, ...patch });
      return true;
    } catch {
      setSyncError("Não foi possível salvar o responsável no CRM. Tente novamente.");
      return false;
    } finally {
      releasePending();
    }
  }

  function handleDeleteTask(id: string) {
    const deletedIndex = tasks.findIndex((t) => t.id === id);
    const deletedTask = deletedIndex >= 0 ? tasks[deletedIndex] : undefined;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    removeCachedTask(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setIsModalOpen(false);
    }

    if (isConnectedCrm && !id.startsWith("task-")) {
      void ideCrmClient
        .deleteTask(id)
        .then(() => removeLocalTaskPresentation(id))
        .catch(() => {
          if (deletedTask) {
            setTasks((prev) => {
              if (prev.some((t) => t.id === deletedTask.id)) return prev;
              const next = [...prev];
              next.splice(Math.min(deletedIndex, next.length), 0, deletedTask);
              return next;
            });
            addCachedTask(deletedTask);
          }
          setSyncError("Não foi possível excluir a tarefa no CRM. Tente novamente.");
        });
    }
  }

  function handleReorderTask(
    draggedTaskId: string,
    targetTaskId: string | null,
    targetStatus: TaskStatus,
    options?: { mode?: TaskDropMode; customGroup?: string }
  ) {
    const mode = options?.mode ?? "before";
    const preview = applyTaskDragAndDrop(tasks, {
      draggedTaskId,
      targetTaskId,
      targetStatus,
      mode,
      customGroup: options?.customGroup,
    });
    if (!preview.updatedDragged) return;

    const updatedDragged = preview.updatedDragged;
    if (options?.customGroup !== undefined || preview.changedParent) {
      setLocalTaskPresentation(updatedDragged.id, {
        itemType: updatedDragged.itemType,
        customGroup: updatedDragged.customGroup,
      });
    }

    setTasks((prev) => {
      const applied = applyTaskDragAndDrop(prev, {
        draggedTaskId,
        targetTaskId,
        targetStatus,
        mode,
        customGroup: options?.customGroup,
      });
      if (selectedProjectId || !selectedManagementId) {
        setCachedTasks(selectedProjectId, applied.nextTasks);
      }
      return applied.nextTasks;
    });

    if (
      isConnectedCrm &&
      !draggedTaskId.startsWith("task-") &&
      (preview.changedStatus || preview.changedParent)
    ) {
      const payload: Record<string, unknown> = {};
      if (preview.changedStatus) {
        payload.status = mapGestorTaskToCrmUpdateInput({ status: updatedDragged.status }).status;
      }
      if (preview.changedParent) {
        payload.parentTaskId = updatedDragged.parentTaskId ?? null;
      }
      const releasePending = trackPendingTask(draggedTaskId);
      void ideCrmClient
        .updateTask(draggedTaskId, payload)
        .catch(() =>
          setSyncError("Não foi possível salvar a movimentação no CRM. Atualize os dados para conferir.")
        )
        .finally(releasePending);
    }
  }

  function handleBatchReorderTask(
    draggedTaskIds: string[],
    targetTaskId: string | null,
    targetStatus: TaskStatus,
    options?: { mode?: TaskDropMode; customGroup?: string }
  ) {
    const mode = options?.mode ?? "before";
    const preview = applyBatchTaskDragAndDrop(tasks, {
      draggedTaskIds,
      targetTaskId,
      targetStatus,
      mode,
      customGroup: options?.customGroup,
    });
    if (preview.updatedTasks.length === 0) return;

    for (const movedTask of preview.updatedTasks) {
      if (options?.customGroup !== undefined || preview.changedParentIds.has(movedTask.id)) {
        setLocalTaskPresentation(movedTask.id, {
          itemType: movedTask.itemType,
          customGroup: movedTask.customGroup,
        });
      }
    }

    setTasks((prev) => {
      const applied = applyBatchTaskDragAndDrop(prev, {
        draggedTaskIds,
        targetTaskId,
        targetStatus,
        mode,
        customGroup: options?.customGroup,
      });
      if (selectedProjectId || !selectedManagementId) {
        setCachedTasks(selectedProjectId, applied.nextTasks);
      }
      return applied.nextTasks;
    });

    if (isConnectedCrm) {
      for (const movedTask of preview.updatedTasks) {
        if (movedTask.id.startsWith("task-")) continue;
        const statusChanged = preview.changedStatusIds.has(movedTask.id);
        const parentChanged = preview.changedParentIds.has(movedTask.id);
        if (!statusChanged && !parentChanged) continue;

        const payload: Record<string, unknown> = {};
        if (statusChanged) {
          payload.status = mapGestorTaskToCrmUpdateInput({ status: movedTask.status }).status;
        }
        if (parentChanged) {
          payload.parentTaskId = movedTask.parentTaskId ?? null;
        }
        const releasePending = trackPendingTask(movedTask.id);
        void ideCrmClient
          .updateTask(movedTask.id, payload)
          .catch(() =>
            setSyncError("Não foi possível salvar a movimentação em lote no CRM. Atualize os dados para conferir.")
          )
          .finally(releasePending);
      }
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
      if (selectedProjectId || !selectedManagementId) {
        setCachedTasks(selectedProjectId, next);
      }
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
                setTasks((prev) => {
                  const next = prev.map((t) =>
                    t.id === taskId
                      ? {
                          ...t,
                          subtasks: (t.subtasks ?? []).map((s) =>
                            s.id === added.id ? { ...s, id: res.item.id } : s
                          ),
                        }
                      : t
                  );
                  const updatedTarget = next.find((t) => t.id === taskId);
                  if (updatedTarget) updateCachedTask(updatedTarget);
                  return next;
                });
              }
            })
            .catch(() => setSyncError("Não foi possível criar o item de checklist no CRM."));
        }
      } else if (subtasks.length < prevItems.length) {
        const removed = prevItems.find(
          (p) => !subtasks.some((item) => item.id === p.id)
        );
        if (removed && !removed.id.startsWith("st-")) {
          void ideCrmClient
            .deleteChecklistItem(taskId, removed.id)
            .catch(() => setSyncError("Não foi possível excluir o item de checklist no CRM."));
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
            .catch(() => setSyncError("Não foi possível atualizar o item de checklist no CRM."));
        }
      }
    }
  }

  function handleAddTaskComment(
    taskId: string,
    comment: NonNullable<Task["comments"]>[number]
  ) {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              comments: [...(t.comments ?? []), comment],
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      const updatedTarget = next.find((t) => t.id === taskId);
      if (updatedTarget) updateCachedTask(updatedTarget);
      return next;
    });

    if (isConnectedCrm && !taskId.startsWith("task-")) {
      void ideCrmClient
        .createTaskComment(taskId, comment.content)
        .then((res) => {
          if (res?.comment) {
            setTasks((prev) => {
              const next = prev.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      comments: (t.comments ?? []).map((c) =>
                        c.id === comment.id
                          ? {
                              ...c,
                              id: res.comment.id,
                              author:
                                res.comment.user?.name ||
                                res.comment.user?.email ||
                                c.author,
                              avatar: res.comment.user?.avatarUrl ?? c.avatar,
                              createdAt: res.comment.createdAt || c.createdAt,
                            }
                          : c
                      ),
                    }
                  : t
              );
              const updatedTarget = next.find((t) => t.id === taskId);
              if (updatedTarget) updateCachedTask(updatedTarget);
              return next;
            });
          }
        })
        .catch(() => {
          setTasks((prev) => {
            const next = prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    comments: (t.comments ?? []).filter((c) => c.id !== comment.id),
                  }
                : t
            );
            const updatedTarget = next.find((t) => t.id === taskId);
            if (updatedTarget) updateCachedTask(updatedTarget);
            return next;
          });
          setSyncError("Não foi possível salvar o comentário no CRM.");
        });
    }
  }

  function handleSaveFromModal(
    taskData: Omit<Task, "id" | "createdAt" | "code"> & {
      id?: string;
      code?: string;
    }
  ) {
    if (taskData.id) {
      const t = tasks.find((task) => task.id === taskData.id);
      if (t) {
        const merged: Task = {
            ...t,
            title: taskData.title,
            subtitle: taskData.subtitle ?? t.subtitle,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            startDate: taskData.startDate,
            dueDate: taskData.dueDate,
            tag: taskData.tag,
            tags: taskData.tags ?? t.tags,
            estimate: taskData.estimate,
            projectId: taskData.projectId ?? t.projectId,
            projectName: taskData.projectName ?? t.projectName,
            assigneeId: taskData.assigneeId !== undefined ? taskData.assigneeId : t.assigneeId,
            assigneeIds: taskData.assigneeIds !== undefined ? taskData.assigneeIds : t.assigneeIds,
            assignee: taskData.assignee ?? t.assignee,
            assigneeAvatar: taskData.assigneeAvatar ?? t.assigneeAvatar,
            coverUrl: taskData.coverUrl !== undefined ? taskData.coverUrl : t.coverUrl,
            icon: taskData.icon !== undefined ? taskData.icon : t.icon,
            subtasks: taskData.subtasks ?? t.subtasks ?? [],
            comments: taskData.comments ?? t.comments ?? [],
            updatedAt: new Date().toISOString(),
        };
        handleUpdateTask(merged);
      }
    } else {
      handleAddTask(taskData);
    }
    setIsModalOpen(false);
  }

  const canWriteProjects = canPerformProjectAction(
    currentUser,
    isConnectedCrm,
    "projects.write"
  );

  const canManageProjectMembers = canPerformProjectAction(
    currentUser,
    isConnectedCrm,
    "projects.members"
  );

  function handleOpenNewTask(initialStatus: TaskStatus = "PENDENTE") {
    if (!canWriteProjects) return;
    isModalDirtyRef.current = false;
    setHasModalRemoteConflict(false);
    setSelectedTaskId(null);
    setModalInitialStatus(initialStatus);
    setIsModalOpen(true);
  }

  function handleOpenDetails(task: Task) {
    isModalDirtyRef.current = false;
    setHasModalRemoteConflict(false);
    setSelectedTaskId(task.id);
    setIsModalOpen(true);
  }

  const activeProjectMembers = useMemo<CrmProjectMember[]>(() => {
    if (projectMembers?.projectId && projectMembers.projectId === selectedProjectId) {
      return projectMembers.members;
    }
    return [];
  }, [projectMembers, selectedProjectId]);

  const projectDialogMembers = useMemo<TeamMemberItem[]>(() => {
    const byUserId = new Map<string, TeamMemberItem>();
    for (const m of activeProjectMembers) {
      byUserId.set(m.userId, {
        userId: m.userId,
        name: m.user?.name,
        email: m.user?.email,
        avatarUrl: m.user?.avatarUrl,
        role: m.role,
      });
    }
    for (const m of currentProject?.members ?? []) {
      const uid = m.userId ?? m.user?.id;
      if (uid && !byUserId.has(uid)) {
        byUserId.set(uid, {
          userId: uid,
          name: m.user?.name,
          email: m.user?.email,
          avatarUrl: m.user?.avatarUrl,
          role: m.role,
        });
      }
    }
    return Array.from(byUserId.values());
  }, [activeProjectMembers, currentProject]);

  function handleClearFilters() {
    updateOnlyMyTasks(false);
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
    onlyMyTasks || filters.search ||
      filters.status !== "Todos" ||
      filters.priority !== "Todas" ||
      (filters.statuses && filters.statuses.length > 0) ||
      (filters.assignees && filters.assignees.length > 0) ||
      (filters.priorities && filters.priorities.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.dueDateCategory && filters.dueDateCategory !== "all") ||
      (filters.taskType && filters.taskType !== "all")
  );

  if (isBootstrapping) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verificando sessão com o IDE CRM...</p>
        </div>
      </div>
    );
  }

  if (!isConnectedCrm) {
    return (
      <CrmLoginView
        isApiReachable={isApiReachable}
        onSuccessConnect={async () => {
          await syncWithIdeCrm(selectedProjectId, selectedManagementId);
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      {/* Main Content Area (Sidebar desativada conforme solicitado) */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full overflow-hidden">
        <AppHeader
          isProjectPage={isSecondaryPage}
          isCalendarPage={isCalendarPage}
          onOpenNewEvent={() => openCreateDialog()}
          canCreateCalendarEvent={canCreateCalendarEvent}
          onHome={() => { if (isSecondaryPage) router.push("/"); }}
          managements={effectiveManagements}
          selectableManagements={visibleManagements}
          projects={effectiveProjects}
          selectableProjects={visibleProjects}
          onlyMyManagements={onlyMyManagements}
          onOnlyMyManagementsChange={updateOnlyMyManagements}
          onlyMyProjects={onlyMyProjects}
          onOnlyMyProjectsChange={updateOnlyMyProjects}
          onlyMyTasks={onlyMyTasks}
          onOnlyMyTasksChange={updateOnlyMyTasks}
          currentManagementName={currentManagement?.name}
          currentProjectName={currentProject?.name}
          selectedManagementId={selectedManagementId}
          selectedProjectId={selectedProjectId}
          onSelectManagement={(id) => { handleSelectManagement(id); if (isSecondaryPage) router.push("/"); }}
          onSelectProject={(id) => { handleSelectProject(id); if (isSecondaryPage) router.push("/"); }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFilterChange={(next) => { setFilters(next); if (isSecondaryPage) router.push("/"); }}
          onOpenNewTaskModal={() => handleOpenNewTask("PENDENTE")}
          listSearch={listSearch}
          onListSearchChange={(value) => { setListSearch(value); if (isSecondaryPage) router.push("/"); }}
          listDisplayMode={selectedManagementId ? projectViewMode : managementViewMode}
          onListDisplayModeChange={selectedManagementId ? setProjectViewMode : setManagementViewMode}
          listFilter={selectedManagementId ? projectStatus : managementVisibility}
          onListFilterChange={selectedManagementId ? setProjectStatus : setManagementVisibility}
          onOpenNewProject={() => setIsNewProjectOpen(true)}
          onOpenNewManagement={() => setIsNewManagementOpen(true)}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          tasks={tasks}
          currentUser={currentUser}
          onLogout={() => void handleDisconnectCrm()}
          subtaskMode={subtaskMode}
          onSubtaskModeChange={setSubtaskMode}
          showClosedTasks={showClosedTasks}
          onToggleShowClosedTasks={setShowClosedTasks}
          onOpenFieldsModal={() => setIsFieldsModalOpen(true)}
          canWrite={canWriteProjects}
          projectMembersCount={projectDialogMembers.length}
          onOpenProjectMembers={
            selectedProjectId ? () => setIsProjectMembersOpen(true) : undefined
          }
          onRefreshSync={() => void syncWithIdeCrm(selectedProjectId, selectedManagementId)}
          isSyncing={isSyncingTasks}
        />

        {/* View Content */}
        {isNewProjectOpen && <NewProjectDialog
          open={isNewProjectOpen}
          onOpenChange={setIsNewProjectOpen}
          managements={effectiveManagements}
          selectedManagementId={selectedManagementId}
          connected={isConnectedCrm}
          onCreated={() => syncWithIdeCrm(selectedProjectId, selectedManagementId)}
        />}
        {isNewManagementOpen && <NewManagementDialog
          onClose={() => setIsNewManagementOpen(false)}
          connected={isConnectedCrm}
          onCreated={() => syncWithIdeCrm(selectedProjectId, selectedManagementId)}
        />}
        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden",
            !isSecondaryPage && selectedProjectId && viewMode === "table" ? "px-3 pt-1 pb-6" : "p-4 md:p-5"
          )}
        >
          {syncError && (
            <div role="alert" className="mb-4 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">
              {syncError}
              <button type="button" className="ml-2 underline" onClick={() => void syncWithIdeCrm(selectedProjectId, selectedManagementId)}>
                Atualizar dados
              </button>
            </div>
          )}
          {!isSecondaryPage && (onlyMyProjects || onlyMyManagements) && membershipForCurrentUser?.error && (
            <div role="alert" className="mb-4 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">
              Não foi possível verificar suas gestões e projetos. <button type="button" className="underline" onClick={() => setMembershipRetry((value) => value + 1)}>Tentar novamente</button>
            </div>
          )}
          {isSecondaryPage ? (
            children
          ) : isBootstrapping ? (
            <TaskTableSkeleton />
          ) : selectedManagementId === null ? (
            /* Nível 1: Cards de Todas as Gestões */
            <ManagementsGridView
              search={listSearch}
              onSearchChange={setListSearch}
              visibilityFilter={managementVisibility}
              onVisibilityFilterChange={setManagementVisibility}
              viewMode={managementViewMode}
              managements={visibleManagements}
              onSelectManagement={(id) => handleSelectManagement(id)}
            />
          ) : selectedManagementId && membershipPending ? (
            <p role="status" className="text-sm text-muted-foreground">Carregando seus projetos...</p>
          ) : selectedManagementId && onlyMyManagements && isConnectedCrm && !myManagementIds.has(selectedManagementId) ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Esta gestão não está entre as suas gestões. <button type="button" className="text-primary underline" onClick={() => updateOnlyMyManagements(false)}>Ver todas as gestões</button>
            </div>
          ) : selectedManagementId && onlyMyProjects && membershipForCurrentUser?.error ? null
          : selectedProjectId && onlyMyProjects && isConnectedCrm && membershipForCurrentUser?.projectIds && !membershipForCurrentUser.projectIds.has(selectedProjectId) ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Este projeto não está entre os seus projetos. <button type="button" className="text-primary underline" onClick={() => updateOnlyMyProjects(false)}>Ver todos os projetos</button>
            </div>
          ) : selectedProjectId === null && currentManagement ? (
            /* Nível 2: Cards dos Projetos da Gestão Selecionada */
            <ManagementProjectsView
              search={listSearch}
              statusFilter={projectStatus}
              viewMode={projectViewMode}
              management={currentManagement}
              projects={visibleProjects}
              tasks={tasks}
              isConnectedCrm={isConnectedCrm}
              canWrite={canWriteProjects}
              canManageMembers={canManageProjectMembers}
              onCreateProject={() => setIsNewProjectOpen(true)}
              onBack={() => handleSelectManagement(null)}
              onSelectProject={(id) => handleSelectProject(id)}
            />
          ) : isSyncingTasks ? (
            <TaskTableSkeleton />
          ) : filteredTasks.length === 0 && (viewMode !== "table" || isFiltered) ? (
            <EmptyState
              onAddTask={() => handleOpenNewTask("PENDENTE")}
              isFiltered={isFiltered}
              onClearFilters={handleClearFilters}
            />
          ) : viewMode === "calendar" || viewMode === "gantt" || viewMode === "workload" ? (
            <TaskAdditionalView
              mode={viewMode}
              tasks={filteredTasks}
              members={activeProjectMembers}
              onOpen={handleOpenDetails}
              onUpdateTask={canWriteProjects ? handleUpdateTask : undefined}
              onChangeAssignee={canWriteProjects ? handleChangeAssignee : undefined}
            />
          ) : viewMode === "kanban" ? (
            <TaskKanban
              tasks={filteredTasks}
              members={activeProjectMembers}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onChangeAssignee={canWriteProjects ? handleChangeAssignee : undefined}
              onOpenDetails={handleOpenDetails}
              onQuickAdd={handleOpenNewTask}
            />
          ) : (
            <div className="w-full overflow-x-auto">
            <TaskTable
              onChangeAssignee={handleChangeAssignee}
              canCreate={canWriteProjects}
              connected={isConnectedCrm}
              key={`${currentUser?.id ?? "anon"}:${selectedProjectId ?? "all"}`}
              projectId={selectedProjectId}
              projectMembers={activeProjectMembers}
              membersLoaded={Boolean(selectedProjectId && projectMembers?.projectId === selectedProjectId)}
              tasks={filteredTasks}
              groupBy={groupBy}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onOpenDetails={handleOpenDetails}
              onAddTask={handleAddTask}
              onUpdateSubtasks={handleUpdateTaskSubtasks}
              onReorderTasks={handleReorderTask}
              onBatchReorderTasks={handleBatchReorderTask}
              isFieldsModalOpen={isFieldsModalOpen}
              onOpenFieldsModal={() => setIsFieldsModalOpen(true)}
              onCloseFieldsModal={() => setIsFieldsModalOpen(false)}
              subtaskMode={subtaskMode}
              showClosedSubtasks={showClosedSubtasks}
            />
            </div>
          )}
        </main>
      </div>

      {/* Task Creation & Inspection Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          isModalDirtyRef.current = false;
          setHasModalRemoteConflict(false);
          setIsModalOpen(false);
        }}
        task={selectedTask}
        syncError={syncError}
        remoteConflictWarning={hasModalRemoteConflict}
        onReloadRemote={() => {
          isModalDirtyRef.current = false;
          setHasModalRemoteConflict(false);
          void loadTasks(selectedProjectId, selectedManagementId, undefined, true);
        }}
        onDirtyChange={(dirty) => {
          isModalDirtyRef.current = dirty;
        }}
        currentUser={currentUser}
        members={
          projectMembers &&
          (selectedTask?.projectId ?? selectedProjectId) &&
          projectMembers.projectId === (selectedTask?.projectId ?? selectedProjectId)
            ? projectMembers.members
            : []
        }
        onChangeAssignee={
          projectMembers &&
          selectedTask &&
          projectMembers.projectId === selectedTask.projectId
            ? handleChangeAssignee
            : undefined
        }
        initialStatus={modalInitialStatus}
        onSave={handleSaveFromModal}
        onUpdateTask={handleUpdateTask}
        onDelete={handleDeleteTask}
        onUpdateSubtasks={handleUpdateTaskSubtasks}
        onAddComment={handleAddTaskComment}
      />

      {currentProject && (
        <MembersDialog
          open={isProjectMembersOpen}
          onOpenChange={setIsProjectMembersOpen}
          title={`Membros de ${currentProject.name}`}
          description="Participantes vinculados a este projeto no IDE CRM."
          members={projectDialogMembers}
          loading={Boolean(isConnectedCrm && selectedProjectId && projectMembers?.projectId !== selectedProjectId)}
          canManageMembers={canManageProjectMembers}
        />
      )}

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
