import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  CustomProjectView,
  CustomViewOpenMode,
  CustomViewType,
} from "@gestor-ide/core";
import { getDefaultProjectViews, sanitizeExternalUrl } from "@gestor-ide/core";

// Interface para garantir tipagem limpa do registro no banco
interface DbProjectViewRow {
  id: string;
  project_id: string;
  name: string;
  icon: string;
  url: string;
  open_mode: string;
  display_order: number;
  type: string;
  created_at: string;
  updated_at: string;
}

let dbInstance: any = null;
let fallbackMemoryStore: Map<string, CustomProjectView[]> = new Map();

function getDb() {
  if (dbInstance) return dbInstance;

  try {
    // Tenta carregar bun:sqlite nativo
    // @ts-ignore
    const { Database } = require("bun:sqlite");
    const dataDir = join(process.cwd(), "data");
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = join(dataDir, "project_views.sqlite");
    const db = new Database(dbPath);

    // Executa migração automática da tabela e índices
    db.run(`
      CREATE TABLE IF NOT EXISTS project_custom_views (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        url TEXT NOT NULL,
        open_mode TEXT NOT NULL DEFAULT 'auto',
        display_order INTEGER NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT 'custom',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_project_views_project_id 
      ON project_custom_views (project_id);
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_project_views_order 
      ON project_custom_views (project_id, display_order);
    `);

    dbInstance = db;
    return dbInstance;
  } catch {
    // Fallback gracioso para ambiente onde bun:sqlite não estiver disponível
    return null;
  }
}

export function listViewsForProject(projectId: string): CustomProjectView[] {
  if (!projectId) return [];
  const db = getDb();

  if (db) {
    try {
      const query = db.query(
        `SELECT * FROM project_custom_views WHERE project_id = ? ORDER BY display_order ASC`
      );
      const rows = query.all(projectId) as DbProjectViewRow[];

      if (rows.length > 0) {
        const mapped: CustomProjectView[] = rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          name: r.name,
          icon: r.icon,
          url: r.url,
          openMode: (r.open_mode as CustomViewOpenMode) || "auto",
          order: r.display_order,
          type: (r.type as CustomViewType) || "custom",
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));

        // Garantir que predefinidas estejam presentes
        const defaults = getDefaultProjectViews(projectId);
        const existingIds = new Set(mapped.map((m) => m.id));
        const merged: CustomProjectView[] = [...mapped];
        let hasNewDefault = false;

        for (const def of defaults) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
            hasNewDefault = true;
          }
        }

        if (hasNewDefault) {
          saveViewsForProject(projectId, merged);
        }

        merged.sort((a, b) => a.order - b.order);
        return merged;
      }

      // Se o projeto ainda não tiver registros, inicializa com as predefinidas
      const initialViews = getDefaultProjectViews(projectId);
      saveViewsForProject(projectId, initialViews);
      return initialViews;
    } catch {
      // continua para fallback
    }
  }

  // Fallback em memória
  const stored = fallbackMemoryStore.get(projectId);
  if (stored && stored.length > 0) {
    return stored;
  }
  const initial = getDefaultProjectViews(projectId);
  fallbackMemoryStore.set(projectId, initial);
  return initial;
}

export function saveViewsForProject(
  projectId: string,
  views: CustomProjectView[]
): CustomProjectView[] {
  if (!projectId) return [];
  const now = new Date().toISOString();

  const sanitized = views.map((v, idx) => ({
    ...v,
    projectId,
    order: typeof v.order === "number" ? v.order : idx,
    url: v.url ? sanitizeExternalUrl(v.url) : "",
    updatedAt: now,
  }));

  const db = getDb();
  if (db) {
    try {
      const deleteStmt = db.prepare(
        `DELETE FROM project_custom_views WHERE project_id = ?`
      );
      const insertStmt = db.prepare(`
        INSERT INTO project_custom_views 
        (id, project_id, name, icon, url, open_mode, display_order, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.transaction(() => {
        deleteStmt.run(projectId);
        for (const view of sanitized) {
          insertStmt.run(
            view.id,
            projectId,
            view.name,
            view.icon,
            view.url,
            view.openMode,
            view.order,
            view.type,
            view.createdAt || now,
            view.updatedAt || now
          );
        }
      })();
    } catch {
      // continua para atualizar fallback
    }
  }

  fallbackMemoryStore.set(projectId, sanitized);
  return sanitized;
}

export function deleteViewForProject(projectId: string, viewId: string): boolean {
  if (!projectId || !viewId) return false;

  const current = listViewsForProject(projectId);
  const target = current.find((v) => v.id === viewId);
  if (target?.type === "predefined") {
    throw new Error("Visualizações predefinidas não podem ser excluídas.");
  }

  const updated = current.filter((v) => v.id !== viewId);
  saveViewsForProject(projectId, updated);
  return true;
}
