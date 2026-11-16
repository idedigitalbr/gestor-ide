import { NextResponse } from "next/server";
import {
  listViewsForProject,
  saveViewsForProject,
  deleteViewForProject,
} from "@/lib/project-views-store";
import type { CustomProjectView } from "@gestor-ide/core";
import { sanitizeExternalUrl } from "@gestor-ide/core";

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "ID do projeto não fornecido." }, { status: 400 });
  }

  const views = listViewsForProject(projectId);
  return NextResponse.json({ views });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "ID do projeto não fornecido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const icon = typeof body?.icon === "string" ? body.icon : "Globe";
    const url = typeof body?.url === "string" ? sanitizeExternalUrl(body.url) : "";
    const openMode = body?.openMode || "auto";

    if (!name) {
      return NextResponse.json({ error: "O nome da visualização é obrigatório." }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json(
        { error: "Uma URL HTTPS válida é obrigatória." },
        { status: 400 }
      );
    }

    const currentViews = listViewsForProject(projectId);
    const newView: CustomProjectView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      name,
      icon,
      url,
      openMode,
      order: currentViews.length,
      type: "custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextViews = [...currentViews, newView];
    saveViewsForProject(projectId, nextViews);

    return NextResponse.json({ view: newView, views: nextViews }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Erro ao criar visualização.") },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "ID do projeto não fornecido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const views = Array.isArray(body?.views) ? (body.views as CustomProjectView[]) : null;

    if (!views) {
      return NextResponse.json(
        { error: "Lista 'views' é obrigatória no corpo da requisição." },
        { status: 400 }
      );
    }

    const updated = saveViewsForProject(projectId, views);
    return NextResponse.json({ views: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Erro ao salvar visualizações.") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const reqUrl = new URL(request.url);
  const viewId = reqUrl.searchParams.get("viewId");

  if (!projectId || !viewId) {
    return NextResponse.json(
      { error: "ID do projeto e 'viewId' são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    deleteViewForProject(projectId, viewId);
    const updated = listViewsForProject(projectId);
    return NextResponse.json({ ok: true, views: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Erro ao excluir visualização.") },
      { status: 400 }
    );
  }
}
