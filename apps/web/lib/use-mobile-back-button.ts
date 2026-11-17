"use client";

import { useEffect, useRef } from "react";

type BackHandler = () => boolean | void;

interface StackItem {
  id: string;
  handler: BackHandler;
  priority: number;
}

const backStack: StackItem[] = [];
let fallbackHandler: (() => boolean) | null = null;
let isListenerInitialized = false;

function initGlobalBackListeners() {
  if (typeof window === "undefined" || isListenerInitialized) return;
  isListenerInitialized = true;

  // 1. Escuta padrão de navegação do navegador / Android WebView
  window.addEventListener("popstate", () => {
    if (backStack.length > 0) {
      const top = backStack.pop();
      if (top) {
        top.handler();
      }
    } else if (fallbackHandler) {
      fallbackHandler();
    }
  });

  // 2. Ponte direta para o runtime Tauri / Kotlin (MainActivity.kt)
  (window as unknown as { __handleAndroidBack?: () => boolean }).__handleAndroidBack = () => {
    if (backStack.length > 0) {
      const top = backStack.pop();
      if (top) {
        const res = top.handler();
        // Se o handler não retornou false explícito, consideramos tratado
        return res !== false;
      }
    }
    if (fallbackHandler) {
      return fallbackHandler();
    }
    return false;
  };
}

/**
 * Registra um callback no topo da pilha de retorno (ex: fechar modal, gaveta, menu).
 * Ao registrar, adiciona um ponto no histórico para que gestos nativos de voltar funcionem.
 */
export function registerBackHandler(
  handler: BackHandler,
  options: { id?: string; priority?: number; pushHistory?: boolean } = {}
): () => void {
  if (typeof window === "undefined") return () => {};
  initGlobalBackListeners();

  const id = options.id || `back_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const priority = options.priority ?? 10;
  const shouldPush = options.pushHistory ?? true;

  const item: StackItem = { id, handler, priority };
  backStack.push(item);
  backStack.sort((a, b) => a.priority - b.priority);

  if (shouldPush) {
    try {
      window.history.pushState({ ideBackTarget: id }, "");
    } catch {}
  }

  return () => {
    const idx = backStack.findIndex((i) => i.id === id);
    if (idx !== -1) {
      backStack.splice(idx, 1);
    }
  };
}

/**
 * Registra o manipulador de fallback quando a pilha de modais estiver vazia.
 * Por exemplo: deselecionar projeto ou voltar para a lista de gestões.
 */
export function setGlobalFallbackBackHandler(handler: (() => boolean) | null) {
  fallbackHandler = handler;
  initGlobalBackListeners();
}

/**
 * Hook utilitário para modais e gavetas:
 * Enquanto o modal estiver aberto (`isOpen: true`), intercepta o botão de voltar do celular
 * para fechar o modal (`onClose`) em vez de fechar o aplicativo.
 */
export function useMobileBackButton({
  isOpen,
  onClose,
  priority = 10,
}: {
  isOpen: boolean;
  onClose: () => void;
  priority?: number;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackHandler(
      () => {
        onCloseRef.current();
        return true;
      },
      { priority, pushHistory: true }
    );

    return () => {
      unregister();
    };
  }, [isOpen, priority]);
}
