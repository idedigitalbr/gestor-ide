"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ideCrmClient } from "@gestor-ide/sdk";
import type { CanvasDocument } from "@gestor-ide/core";

export type CanvasAutosaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

interface UseCanvasAutosaveOptions {
  projectId: string;
  canvasId: string | null;
  initialRevision: number;
  initialDocument: CanvasDocument;
  canEdit: boolean;
  debounceMs?: number;
  onRevisionUpdated?: (newRevision: number) => void;
  onConflict?: (currentRevision: number, currentUpdatedAt?: string) => void;
}

export function useCanvasAutosave({
  projectId,
  canvasId,
  initialRevision,
  initialDocument,
  canEdit,
  debounceMs = 1000,
  onRevisionUpdated,
  onConflict,
}: UseCanvasAutosaveOptions) {
  const [status, setStatus] = useState<CanvasAutosaveStatus>("idle");
  const [currentRevision, setCurrentRevision] = useState<number>(initialRevision);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controle de counters e estado de concorrência
  const currentDocRef = useRef<CanvasDocument>(initialDocument);
  const revisionRef = useRef<number>(initialRevision);
  const isSavingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localChangeCounterRef = useRef<number>(0);
  const sentChangeCounterRef = useRef<number>(0);

  // Sincroniza refs quando o canvasId ou revision externa mudar
  useEffect(() => {
    revisionRef.current = initialRevision;
    setCurrentRevision(initialRevision);
    currentDocRef.current = initialDocument;
    localChangeCounterRef.current = 0;
    sentChangeCounterRef.current = 0;
    setStatus("idle");
    setErrorMessage(null);
  }, [canvasId, initialRevision]);

  const performSave = useCallback(async () => {
    if (!canvasId || !canEdit || isSavingRef.current) return;

    // Se não houve alteração desde o último envio
    if (localChangeCounterRef.current === sentChangeCounterRef.current) {
      setStatus("saved");
      return;
    }

    const docToSave = currentDocRef.current;
    const expectedRevision = revisionRef.current;
    const currentCounter = localChangeCounterRef.current;

    isSavingRef.current = true;
    sentChangeCounterRef.current = currentCounter;
    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await ideCrmClient.updateProjectCanvas(projectId, canvasId, {
        expectedRevision,
        document: docToSave,
      });

      // Sucesso: atualiza revisão
      revisionRef.current = response.revision;
      setCurrentRevision(response.revision);
      setLastSavedAt(new Date(response.updatedAt));
      onRevisionUpdated?.(response.revision);

      isSavingRef.current = false;

      // Se o usuário fez novas alterações durante o voo da requisição
      if (localChangeCounterRef.current > currentCounter) {
        setStatus("dirty");
        // Agenda novo salvamento com a nova revisão obtida
        timerRef.current = setTimeout(() => {
          void performSave();
        }, debounceMs);
      } else {
        setStatus("saved");
      }
    } catch (err: any) {
      isSavingRef.current = false;

      // Conflito de versão (409)
      if (err?.status === 409 || err?.payload?.code === "CANVAS_REVISION_CONFLICT") {
        const remoteRev = Number(err?.payload?.currentRevision ?? expectedRevision + 1);
        setStatus("conflict");
        setErrorMessage(
          err?.payload?.message || "O quadro foi alterado em outra sessão ou navegador."
        );
        onConflict?.(remoteRev, err?.payload?.currentUpdatedAt);
        return;
      }

      // Falha 5xx ou rede
      setStatus("error");
      setErrorMessage(
        err?.message || "Falha ao salvar quadro na API CRM. Suas alterações continuam seguras na tela."
      );
    }
  }, [canvasId, canEdit, projectId, debounceMs, onRevisionUpdated, onConflict]);

  /**
   * Chamado a cada modificação de nós, conexões ou viewport
   */
  const markDirty = useCallback(
    (newDocument: CanvasDocument) => {
      if (!canEdit || !canvasId) return;

      currentDocRef.current = newDocument;
      localChangeCounterRef.current += 1;
      setStatus("dirty");

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void performSave();
      }, debounceMs);
    },
    [canEdit, canvasId, debounceMs, performSave]
  );

  /**
   * Força salvamento imediato (flush manual)
   */
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    await performSave();
  }, [performSave]);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    status,
    currentRevision,
    lastSavedAt,
    errorMessage,
    markDirty,
    saveNow,
  };
}
