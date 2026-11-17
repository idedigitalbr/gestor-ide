// packages/core/src/canvas.ts — Tipos e DTOs oficiais do IDE Gestor Canvas v2

export type CanvasNodeType =
  | "page"
  | "source"
  | "action"
  | "email"
  | "decision"
  | "process"
  | "startEnd"
  | "note"
  | "group"
  | "task"
  | "database";

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasPageNodeData {
  title: string;
  url?: string;
  assetId?: string | null;
  thumbnailUrl?: string | null;
  notes?: string;
}

export interface CanvasSourceNodeData {
  title: string;
  iconKey?: string;
  category?: string;
  url?: string;
  notes?: string;
}

export interface CanvasActionNodeData {
  title: string;
  actionType?: string;
  notes?: string;
}

export interface CanvasEmailNodeData {
  title: string;
  subject?: string;
  sequenceStep?: number;
  notes?: string;
}

export interface CanvasDecisionNodeData {
  title: string;
  question?: string;
  notes?: string;
}

export interface CanvasProcessNodeData {
  title: string;
  description?: string;
  color?: string;
  notes?: string;
}

export interface CanvasStartEndNodeData {
  title: string;
  kind?: "start" | "end";
}

export interface CanvasNoteNodeData {
  text: string;
  color?: string;
  author?: string;
}

export interface CanvasDatabaseNodeData {
  title: string;
  systemName?: string;
  notes?: string;
}

export interface CanvasGroupNodeData {
  label: string;
  color?: string;
  width?: number;
  height?: number;
}

export interface CanvasTaskNodeData {
  taskId: string;
  titleSnapshot?: string;
  statusSnapshot?: string;
}

export type CanvasNodeDataMap = {
  page: CanvasPageNodeData;
  source: CanvasSourceNodeData;
  action: CanvasActionNodeData;
  email: CanvasEmailNodeData;
  decision: CanvasDecisionNodeData;
  process: CanvasProcessNodeData;
  startEnd: CanvasStartEndNodeData;
  note: CanvasNoteNodeData;
  database: CanvasDatabaseNodeData;
  group: CanvasGroupNodeData;
  task: CanvasTaskNodeData;
};

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  parentId?: string;
  width?: number;
  height?: number;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  type?: "default" | "straight" | "step" | "smoothstep" | "bezier";
  animated?: boolean;
}

export interface CanvasDocument {
  schemaVersion: 1;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
}

export interface CanvasSummary {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  templateKey?: string | null;
  revision: number;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface CanvasDetail extends CanvasSummary {
  document: CanvasDocument;
  canEdit: boolean;
}

export interface CanvasCreateInput {
  name: string;
  description?: string;
  templateKey?: string;
  document?: CanvasDocument;
}

export interface CanvasUpdateInput {
  expectedRevision: number;
  name?: string;
  description?: string;
  document?: CanvasDocument;
}

export interface CanvasDuplicateInput {
  name?: string;
}

export interface CanvasRevisionConflictPayload {
  code: "CANVAS_REVISION_CONFLICT";
  message: string;
  currentRevision: number;
  currentUpdatedAt?: string;
}
