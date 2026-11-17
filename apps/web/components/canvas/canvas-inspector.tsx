"use client";

import React, { useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  X,
  Trash2,
  Copy,
  Upload,
  Globe,
  CheckSquare,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ideCrmClient } from "@gestor-ide/sdk";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils";

interface CanvasInspectorProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  projectId: string;
  tasks: Task[];
  canEdit: boolean;
  onUpdateNodeData: (id: string, dataUpdates: Record<string, unknown>) => void;
  onUpdateEdgeData: (id: string, edgeUpdates: Partial<Edge>) => void;
  onDuplicateNode: (node: Node) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onOpenTask?: (taskId: string) => void;
  onClose: () => void;
}

export function CanvasInspector({
  selectedNode,
  selectedEdge,
  projectId,
  tasks = [],
  canEdit,
  onUpdateNodeData,
  onUpdateEdgeData,
  onDuplicateNode,
  onDeleteNode,
  onDeleteEdge,
  onOpenTask,
  onClose,
}: CanvasInspectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!selectedNode && !selectedEdge) return null;

  // Trata upload de screenshot privada
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Apenas arquivos JPG, PNG ou WEBP são permitidos.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("A imagem excede o tamanho limite de 5 MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await ideCrmClient.uploadCanvasAsset(projectId, file);
      onUpdateNodeData(selectedNode.id, {
        assetId: result.assetId,
        thumbnailUrl: result.url,
      });
    } catch (err: any) {
      setUploadError(err?.message || "Erro ao fazer upload da imagem");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="absolute right-3 top-16 bottom-3 z-20 flex w-80 flex-col rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl transition-all select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 p-3.5">
        <div className="flex flex-col truncate">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {selectedNode ? `Elemento: ${selectedNode.type}` : "Conexão"}
          </span>
          <h3 className="text-xs font-bold text-foreground truncate">
            Propriedades
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Fechar painel"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {selectedNode && (
          <>
            {/* Título Geral */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Título do Bloco
              </Label>
              <Input
                disabled={!canEdit}
                value={(selectedNode.data?.title as string) || ""}
                onChange={(e) =>
                  onUpdateNodeData(selectedNode.id, { title: e.target.value })
                }
                placeholder="Ex: Landing Page, Comprou..."
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Configurações Específicas por Tipo */}
            {selectedNode.type === "page" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3" />
                    <span>URL de Destino (Opcional)</span>
                  </Label>
                  <Input
                    disabled={!canEdit}
                    value={(selectedNode.data?.url as string) || ""}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { url: e.target.value })
                    }
                    placeholder="https://exemplo.com/pagina"
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>

                {/* Upload de Screenshot */}
                <div className="space-y-2 pt-1 border-t border-border/60">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="size-3" />
                    <span>Captura / Imagem da Tela</span>
                  </Label>

                  {selectedNode.data?.thumbnailUrl ? (
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedNode.data.thumbnailUrl as string}
                        alt="Preview"
                        className="size-full object-cover"
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateNodeData(selectedNode.id, {
                              assetId: null,
                              thumbnailUrl: null,
                            })
                          }
                          className="absolute right-1.5 top-1.5 rounded-md bg-destructive/90 p-1 text-destructive-foreground hover:bg-destructive shadow-sm transition-colors"
                          title="Remover imagem"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-3 text-center bg-muted/10">
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Envie uma imagem JPG, PNG ou WEBP (máx. 5 MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canEdit || isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs gap-1.5"
                      >
                        {isUploading ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Upload className="size-3" />
                        )}
                        <span>{isUploading ? "Enviando..." : "Selecionar Imagem"}</span>
                      </Button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[10px] font-medium text-destructive">
                      {uploadError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Anotações / Descrição
                  </Label>
                  <textarea
                    disabled={!canEdit}
                    value={(selectedNode.data?.notes as string) || ""}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { notes: e.target.value })
                    }
                    placeholder="Instruções para o time sobre esta página..."
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </>
            )}

            {selectedNode.type === "source" && (
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Ícone / Plataforma
                </Label>
                <select
                  disabled={!canEdit}
                  value={(selectedNode.data?.iconKey as string) || "instagram"}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { iconKey: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google Search</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="email">E-mail</option>
                  <option value="ads">Anúncio / Mídia</option>
                  <option value="direct">Acesso Direto</option>
                </select>
              </div>
            )}

            {selectedNode.type === "action" && (
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Tipo de Ação
                </Label>
                <select
                  disabled={!canEdit}
                  value={(selectedNode.data?.actionType as string) || "click"}
                  onChange={(e) =>
                    onUpdateNodeData(selectedNode.id, { actionType: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="click">Clique no Botão</option>
                  <option value="signup">Cadastro / Formulário</option>
                  <option value="buy">Compra Concluída</option>
                  <option value="download">Download</option>
                  <option value="zap">Webhook / Disparo</option>
                </select>
              </div>
            )}

            {selectedNode.type === "email" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Assunto do E-mail
                  </Label>
                  <Input
                    disabled={!canEdit}
                    value={(selectedNode.data?.subject as string) || ""}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { subject: e.target.value })
                    }
                    placeholder="Ex: Seu e-book chegou!"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Passo da Sequência
                  </Label>
                  <Input
                    type="number"
                    disabled={!canEdit}
                    value={(selectedNode.data?.sequenceStep as number) ?? 1}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, {
                        sequenceStep: Number(e.target.value),
                      })
                    }
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </>
            )}

            {selectedNode.type === "note" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Cor da Nota
                  </Label>
                  <div className="flex gap-2">
                    {(["amber", "blue", "emerald", "purple", "rose"] as const).map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onUpdateNodeData(selectedNode.id, { color: c })}
                          className={cn(
                            "size-5 rounded-full border transition-all",
                            c === "amber" && "bg-amber-400",
                            c === "blue" && "bg-blue-400",
                            c === "emerald" && "bg-emerald-400",
                            c === "purple" && "bg-purple-400",
                            c === "rose" && "bg-rose-400",
                            selectedNode.data?.color === c
                              ? "ring-2 ring-primary scale-110"
                              : "opacity-70 hover:opacity-100"
                          )}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Conteúdo
                  </Label>
                  <textarea
                    disabled={!canEdit}
                    value={(selectedNode.data?.text as string) || ""}
                    onChange={(e) =>
                      onUpdateNodeData(selectedNode.id, { text: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-sans"
                  />
                </div>
              </>
            )}

            {selectedNode.type === "task" && (
              <div className="space-y-3 pt-1 border-t border-border/60">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <CheckSquare className="size-4" />
                  <span>Tarefa Oficial do CRM</span>
                </div>

                {(() => {
                  const taskId = selectedNode.data?.taskId as string;
                  const task = tasks.find((t) => t.id === taskId);

                  if (!task) {
                    return (
                      <p className="text-xs text-destructive">
                        Tarefa ID {taskId} não encontrada no projeto.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground font-medium">Status:</span>
                        <span className="font-bold text-foreground">{task.status}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground font-medium">Prazo:</span>
                          <span className="font-mono text-foreground">
                            {task.dueDate.slice(0, 10)}
                          </span>
                        </div>
                      )}
                      {onOpenTask && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpenTask(task.id)}
                          className="w-full mt-2 h-7 text-xs gap-1.5"
                        >
                          <ExternalLink className="size-3" />
                          <span>Abrir Detalhe da Tarefa</span>
                        </Button>
                      )}
                    </div>
                  );
                })()}

                <p className="text-[10px] text-muted-foreground leading-normal">
                  Este nó lê informações em tempo real da API do CRM. Deletá-lo do
                  quadro não apaga a tarefa oficial.
                </p>
              </div>
            )}

            {/* Ações do Nó */}
            {canEdit && (
              <div className="flex items-center gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicateNode(selectedNode)}
                  className="flex-1 h-8 text-xs gap-1.5"
                >
                  <Copy className="size-3.5" />
                  <span>Duplicar</span>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteNode(selectedNode.id)}
                  className="h-8 text-xs gap-1.5 px-3"
                  title="Excluir elemento"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Inspeção de Aresta / Linha de Conexão */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Rótulo da Conexão
              </Label>
              <Input
                disabled={!canEdit}
                value={(selectedEdge.label as string) || ""}
                onChange={(e) =>
                  onUpdateEdgeData(selectedEdge.id, { label: e.target.value })
                }
                placeholder="Ex: Sim, Não, Sucesso..."
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Estilo do Conector
              </Label>
              <select
                disabled={!canEdit}
                value={selectedEdge.type || "bezier"}
                onChange={(e) =>
                  onUpdateEdgeData(selectedEdge.id, {
                    type: e.target.value as any,
                  })
                }
                className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="bezier">Curva Suave (Bézier)</option>
                <option value="straight">Linha Reta</option>
                <option value="step">Degrau Reto (Step)</option>
                <option value="smoothstep">Degrau Arredondado</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2.5">
              <span className="text-xs font-semibold text-foreground">
                Linha Animada (Fluxo)
              </span>
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={Boolean(selectedEdge.animated)}
                onChange={(e) =>
                  onUpdateEdgeData(selectedEdge.id, { animated: e.target.checked })
                }
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {canEdit && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDeleteEdge(selectedEdge.id)}
                className="w-full h-8 text-xs gap-1.5 mt-2"
              >
                <Trash2 className="size-3.5" />
                <span>Excluir Conexão</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
