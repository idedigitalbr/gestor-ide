"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import { ideCrmClient } from "@gestor-ide/sdk";
import type { Task } from "@/types/task";
import type {
  CanvasDocument,
  CanvasNodeType,
  CanvasSummary,
  CanvasNode,
  CanvasEdge,
  CanvasViewport,
} from "@gestor-ide/core";
import { CanvasToolbar } from "./canvas-toolbar";
import { CanvasLibrary } from "./canvas-library";
import { CanvasInspector } from "./canvas-inspector";
import { CanvasEditor } from "./canvas-editor";
import { CANVAS_TEMPLATES } from "./templates";
import { useCanvasAutosave } from "./use-canvas-autosave";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectTasksCanvasProps {
  projectId: string;
  tasks: Task[];
  members?: unknown[];
  canWrite: boolean;
  onOpenTask?: (taskId: string) => void;
}

function toCanvasDocument(
  nodes: Node[],
  edges: Edge[],
  viewport?: CanvasViewport
): CanvasDocument {
  return {
    schemaVersion: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.type as CanvasNodeType) || "process",
      position: { x: n.position.x, y: n.position.y },
      data: (n.data as Record<string, unknown>) || {},
      parentId: n.parentId,
      width: n.measured?.width ?? n.width,
      height: n.measured?.height ?? n.height,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      label: typeof e.label === "string" ? e.label : undefined,
      type: (e.type as CanvasEdge["type"]) || "default",
      animated: Boolean(e.animated),
    })),
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
  };
}

function fromCanvasDocument(doc: CanvasDocument | null | undefined): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!doc) return { nodes: [], edges: [] };
  const nodes: Node[] = (doc.nodes || []).map((cn) => ({
    id: cn.id,
    type: cn.type,
    position: cn.position,
    data: cn.data || {},
    parentId: cn.parentId,
    width: cn.width,
    height: cn.height,
  }));
  const edges: Edge[] = (doc.edges || []).map((ce) => ({
    id: ce.id,
    source: ce.source,
    target: ce.target,
    sourceHandle: ce.sourceHandle,
    targetHandle: ce.targetHandle,
    label: ce.label,
    type: ce.type || "default",
    animated: Boolean(ce.animated),
  }));
  return { nodes, edges };
}

function ProjectTasksCanvasContent({
  projectId,
  tasks = [],
  canWrite,
  onOpenTask,
}: ProjectTasksCanvasProps) {
  const { zoomIn, zoomOut, fitView, screenToFlowPosition, getViewport } = useReactFlow();

  // Estados de lista e seleção de quadros
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isLoadingCanvases, setIsLoadingCanvases] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados dos elementos do fluxo
  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentRevision, setCurrentRevision] = useState<number>(1);

  // Seleção e visibilidade de painéis
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);

  // Histórico para Undo / Redo
  const undoStackRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const redoStackRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [, setHistoryVersion] = useState(0);

  const pushHistory = useCallback((nodesToSave: Node[], edgesToSave: Edge[]) => {
    undoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodesToSave)),
      edges: JSON.parse(JSON.stringify(edgesToSave)),
    });
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  // Documento inicial para o hook
  const initialDoc = useMemo(
    () => toCanvasDocument(rawNodes, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCanvasId]
  );

  // Autosave hook
  const {
    status: autosaveStatus,
    currentRevision: syncedRevision,
    errorMessage: autosaveError,
    markDirty,
    saveNow,
  } = useCanvasAutosave({
    projectId,
    canvasId: activeCanvasId,
    initialRevision: currentRevision,
    initialDocument: initialDoc,
    canEdit: canWrite,
    debounceMs: 800,
    onRevisionUpdated: (newRev) => {
      setCurrentRevision(newRev);
    },
    onConflict: (remoteRev) => {
      console.warn(`[Canvas] Conflito de concorrência detectado: revisão remota é ${remoteRev}`);
    },
  });

  // Notifica o autosave sempre que nós ou arestas mudam
  const notifyDocumentChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      if (!canWrite) return;
      const vp = getViewport();
      markDirty(toCanvasDocument(nextNodes, nextEdges, vp));
    },
    [canWrite, getViewport, markDirty]
  );

  // Carrega lista de quadros do projeto
  const loadCanvasesList = useCallback(
    async (selectIdAfter?: string) => {
      if (!projectId) return;
      setIsLoadingCanvases(true);
      setLoadError(null);

      try {
        const res = await ideCrmClient.listProjectCanvases(projectId);
        const list = res.canvases || [];
        setCanvases(list);

        if (list.length > 0) {
          const targetId =
            selectIdAfter && list.some((c) => c.id === selectIdAfter)
              ? selectIdAfter
              : activeCanvasId && list.some((c) => c.id === activeCanvasId)
              ? activeCanvasId
              : list[0].id;

          setActiveCanvasId(targetId);
        } else {
          // Se não houver nenhum quadro, cria o quadro inicial padrão com template Funil Básico
          if (canWrite) {
            const initialTpl =
              CANVAS_TEMPLATES.find((t) => t.key === "funnel-basic") || CANVAS_TEMPLATES[0];
            const created = await ideCrmClient.createProjectCanvas(projectId, {
              name: "Quadro Principal",
              document: initialTpl.createDocument(),
            });
            await loadCanvasesList(created.id);
          } else {
            setActiveCanvasId(null);
          }
        }
      } catch (err: any) {
        console.error("Falha ao listar quadros canvas:", err);
        setLoadError(err?.message || "Não foi possível carregar os quadros do projeto.");
      } finally {
        setIsLoadingCanvases(false);
      }
    },
    [activeCanvasId, canWrite, projectId]
  );

  useEffect(() => {
    void loadCanvasesList();
  }, [projectId]);

  // Carrega detalhes do quadro ativo
  const loadCanvasDetail = useCallback(
    async (canvasId: string) => {
      if (!projectId || !canvasId) return;
      setIsLoadingDetail(true);
      setLoadError(null);

      try {
        const detail = await ideCrmClient.getProjectCanvas(projectId, canvasId);
        const { nodes: parsedNodes, edges: parsedEdges } = fromCanvasDocument(detail.document);

        setRawNodes(parsedNodes);
        setEdges(parsedEdges);
        setCurrentRevision(detail.revision);

        undoStackRef.current = [];
        redoStackRef.current = [];
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      } catch (err: any) {
        console.error("Falha ao carregar detalhe do canvas:", err);
        setLoadError(err?.message || "Não foi possível carregar os nós deste quadro.");
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (activeCanvasId) {
      void loadCanvasDetail(activeCanvasId);
    }
  }, [activeCanvasId, loadCanvasDetail]);

  // Hidratação viva dos nós de tarefas CRM
  const hydratedNodes = useMemo(() => {
    const taskMap = new Map<string, Task>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
    }

    return rawNodes.map((node) => {
      if (node.type === "task") {
        const taskId = (node.data as any)?.taskId;
        const liveTask = taskId ? taskMap.get(taskId) : undefined;
        return {
          ...node,
          data: {
            ...node.data,
            task: liveTask,
            onOpenTask,
          },
        };
      }
      return node;
    });
  }, [rawNodes, tasks, onOpenTask]);

  // Manipuladores de nós e arestas com controle de histórico
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setRawNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        notifyDocumentChange(next, edges);
        return next;
      });
    },
    [edges, notifyDocumentChange]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        notifyDocumentChange(rawNodes, next);
        return next;
      });
    },
    [notifyDocumentChange, rawNodes]
  );

  const handleConnect: OnConnect = useCallback(
    (params: Connection) => {
      pushHistory(rawNodes, edges);
      const newEdge: Edge = {
        ...params,
        id: `e-${params.source}-${params.sourceHandle || ""}-${params.target}-${params.targetHandle || ""}-${Date.now()}`,
        type: "default",
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => {
        const next = addEdge(newEdge, eds);
        notifyDocumentChange(rawNodes, next);
        return next;
      });
    },
    [edges, notifyDocumentChange, pushHistory, rawNodes]
  );

  // Adiciona nó via biblioteca ou drag & drop
  const handleDropNode = useCallback(
    (
      type: CanvasNodeType,
      data: Record<string, unknown>,
      position: { x: number; y: number }
    ) => {
      pushHistory(rawNodes, edges);

      const newNodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          ...data,
          title: data.title || (type === "page" ? "Nova Página" : "Novo Elemento"),
        },
      };

      const nextNodes = [...rawNodes, newNode];
      setRawNodes(nextNodes);
      setSelectedNodeId(newNodeId);
      setSelectedEdgeId(null);
      setIsInspectorOpen(true);
      notifyDocumentChange(nextNodes, edges);
    },
    [edges, notifyDocumentChange, pushHistory, rawNodes]
  );

  const handleAddLibraryItem = useCallback(
    (type: CanvasNodeType, data: Record<string, unknown>) => {
      // Posiciona no centro aproximado da tela
      const centerPos = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      handleDropNode(type, data, centerPos);
    },
    [handleDropNode, screenToFlowPosition]
  );

  // Atualização pelo inspetor
  const handleUpdateNodeData = useCallback(
    (id: string, dataUpdates: Record<string, unknown>) => {
      setRawNodes((nds) => {
        const next = nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                ...dataUpdates,
              },
            };
          }
          return n;
        });
        notifyDocumentChange(next, edges);
        return next;
      });
    },
    [edges, notifyDocumentChange]
  );

  const handleUpdateEdgeData = useCallback(
    (id: string, edgeUpdates: Partial<Edge>) => {
      setEdges((eds) => {
        const next = eds.map((e) => {
          if (e.id === id) {
            return {
              ...e,
              ...edgeUpdates,
            };
          }
          return e;
        });
        notifyDocumentChange(rawNodes, next);
        return next;
      });
    },
    [notifyDocumentChange, rawNodes]
  );

  const handleDuplicateNode = useCallback(
    (node: Node) => {
      pushHistory(rawNodes, edges);
      const newId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const duplicated: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 30,
          y: node.position.y + 30,
        },
        data: {
          ...node.data,
          title: `${(node.data?.title as string) || "Elemento"} (Cópia)`,
        },
      };

      const nextNodes = [...rawNodes, duplicated];
      setRawNodes(nextNodes);
      setSelectedNodeId(newId);
      notifyDocumentChange(nextNodes, edges);
    },
    [edges, notifyDocumentChange, pushHistory, rawNodes]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      pushHistory(rawNodes, edges);
      const nextNodes = rawNodes.filter((n) => n.id !== id);
      const nextEdges = edges.filter((e) => e.source !== id && e.target !== id);

      setRawNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      notifyDocumentChange(nextNodes, nextEdges);
    },
    [edges, notifyDocumentChange, pushHistory, rawNodes]
  );

  const handleDeleteEdge = useCallback(
    (id: string) => {
      pushHistory(rawNodes, edges);
      const nextEdges = edges.filter((e) => e.id !== id);

      setEdges(nextEdges);
      setSelectedEdgeId(null);
      notifyDocumentChange(rawNodes, nextEdges);
    },
    [edges, notifyDocumentChange, pushHistory, rawNodes]
  );

  // Operações de Undo / Redo
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(rawNodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    setRawNodes(previous.nodes);
    setEdges(previous.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    notifyDocumentChange(previous.nodes, previous.edges);
    setHistoryVersion((v) => v + 1);
  }, [edges, notifyDocumentChange, rawNodes]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(rawNodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    setRawNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    notifyDocumentChange(next.nodes, next.edges);
    setHistoryVersion((v) => v + 1);
  }, [edges, notifyDocumentChange, rawNodes]);

  // Atalhos de teclado (Ctrl+Z, Ctrl+Shift+Z, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT" ||
        (activeEl as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y")
      ) {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isInput && canWrite) {
        if (selectedNodeId) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          handleDeleteEdge(selectedEdgeId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canWrite,
    handleDeleteEdge,
    handleDeleteNode,
    handleRedo,
    handleUndo,
    selectedEdgeId,
    selectedNodeId,
  ]);

  // Gestão de Quadros (Criar, Renomear, Duplicar, Arquivar)
  const handleCreateCanvas = useCallback(
    async (name: string, templateKey: string) => {
      const tpl =
        CANVAS_TEMPLATES.find((t) => t.key === templateKey) || CANVAS_TEMPLATES[0];
      const created = await ideCrmClient.createProjectCanvas(projectId, {
        name,
        templateKey,
        document: tpl.createDocument(),
      });
      await loadCanvasesList(created.id);
    },
    [loadCanvasesList, projectId]
  );

  const handleRenameCanvas = useCallback(
    async (canvasId: string, newName: string) => {
      await ideCrmClient.updateProjectCanvas(projectId, canvasId, {
        name: newName,
        expectedRevision: currentRevision,
      });
      await loadCanvasesList(canvasId);
    },
    [currentRevision, loadCanvasesList, projectId]
  );

  const handleDuplicateCanvas = useCallback(
    async (canvasId: string) => {
      const duplicated = await ideCrmClient.duplicateProjectCanvas(projectId, canvasId);
      await loadCanvasesList(duplicated.id);
    },
    [loadCanvasesList, projectId]
  );

  const handleArchiveCanvas = useCallback(
    async (canvasId: string) => {
      await ideCrmClient.archiveProjectCanvas(projectId, canvasId);
      await loadCanvasesList();
    },
    [loadCanvasesList, projectId]
  );

  const handleExportJson = useCallback(() => {
    const docData = toCanvasDocument(rawNodes, edges, getViewport());
    const jsonStr = JSON.stringify(docData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-${projectId}-${activeCanvasId || "export"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeCanvasId, edges, getViewport, projectId, rawNodes]);

  // Elementos selecionados para o inspetor
  const selectedNode = useMemo(
    () => rawNodes.find((n) => n.id === selectedNodeId) || null,
    [rawNodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) || null,
    [edges, selectedEdgeId]
  );

  if (isLoadingCanvases) {
    return (
      <div className="flex h-[75vh] w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Carregando ambiente Canvas v2...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[75vh] w-full flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-card p-6 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">Falha ao carregar o Canvas</h3>
          <p className="text-xs text-muted-foreground max-w-md">{loadError}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadCanvasesList()}
          className="text-xs"
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-[82vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      {/* Barra de Ferramentas Superior */}
      <CanvasToolbar
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onSelectCanvas={(id) => setActiveCanvasId(id)}
        onCreateCanvas={handleCreateCanvas}
        onRenameCanvas={handleRenameCanvas}
        onDuplicateCanvas={handleDuplicateCanvas}
        onArchiveCanvas={handleArchiveCanvas}
        canEdit={canWrite}
        autosaveStatus={autosaveStatus}
        currentRevision={syncedRevision}
        autosaveError={autosaveError}
        onRetryAutosave={() => void saveNow()}
        onReloadRemote={() => activeCanvasId && void loadCanvasDetail(activeCanvasId)}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen((v) => !v)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((v) => !v)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStackRef.current.length > 0}
        canRedo={redoStackRef.current.length > 0}
        onZoomIn={() => zoomIn({ duration: 250 })}
        onZoomOut={() => zoomOut({ duration: 250 })}
        onFitView={() => fitView({ padding: 0.2, duration: 350 })}
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap((v) => !v)}
        onExportJson={handleExportJson}
      />

      {/* Área Central: Biblioteca lateral, Motor ReactFlow e Inspetor lateral */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Painel Biblioteca / Paleta */}
        <CanvasLibrary
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onAddItem={handleAddLibraryItem}
          tasks={tasks}
          canEdit={canWrite}
        />

        {/* Motor Interativo */}
        {isLoadingDetail ? (
          <div className="flex flex-1 items-center justify-center bg-background">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <CanvasEditor
            nodes={hydratedNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={(node) => {
              setSelectedNodeId(node?.id || null);
              if (node) setIsInspectorOpen(true);
            }}
            onSelectEdge={(edge) => {
              setSelectedEdgeId(edge?.id || null);
              if (edge) setIsInspectorOpen(true);
            }}
            onDropNode={handleDropNode}
            showMinimap={showMinimap}
            canEdit={canWrite}
            screenToFlowPosition={screenToFlowPosition}
          />
        )}

        {/* Painel Inspetor de Propriedades */}
        {isInspectorOpen && (
          <CanvasInspector
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            projectId={projectId}
            tasks={tasks}
            canEdit={canWrite}
            onUpdateNodeData={handleUpdateNodeData}
            onUpdateEdgeData={handleUpdateEdgeData}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onOpenTask={onOpenTask}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export function ProjectTasksCanvas(props: ProjectTasksCanvasProps) {
  return (
    <ReactFlowProvider>
      <ProjectTasksCanvasContent {...props} />
    </ReactFlowProvider>
  );
}
export default ProjectTasksCanvas;
