import { describe, expect, it, beforeEach } from "bun:test";
import {
  registerBackHandler,
  setGlobalFallbackBackHandler,
} from "./use-mobile-back-button";

describe("use-mobile-back-button", () => {
  beforeEach(() => {
    if (typeof globalThis.window === "undefined") {
      const listeners: Record<string, ((e: unknown) => void)[]> = {};
      (globalThis as unknown as { window: unknown }).window = {
        addEventListener: (event: string, fn: (e: unknown) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(fn);
        },
        removeEventListener: (event: string, fn: (e: unknown) => void) => {
          if (!listeners[event]) return;
          listeners[event] = listeners[event].filter((f) => f !== fn);
        },
        history: {
          pushState: () => {},
        },
      };
    }
  });

  it("executa o handler do topo quando __handleAndroidBack é invocado", () => {
    let closedModalA = false;
    let closedModalB = false;

    const unregisterA = registerBackHandler(() => {
      closedModalA = true;
    }, { priority: 1, pushHistory: false });

    const unregisterB = registerBackHandler(() => {
      closedModalB = true;
    }, { priority: 2, pushHistory: false });

    const handleBack = (globalThis.window as unknown as { __handleAndroidBack?: () => boolean }).__handleAndroidBack;
    expect(typeof handleBack).toBe("function");

    // Modal B tem maior prioridade / foi registrado por último
    const handledFirst = handleBack!();
    expect(handledFirst).toBe(true);
    expect(closedModalB).toBe(true);
    expect(closedModalA).toBe(false);

    // Segundo toque deve fechar Modal A
    const handledSecond = handleBack!();
    expect(handledSecond).toBe(true);
    expect(closedModalA).toBe(true);

    unregisterA();
    unregisterB();
  });

  it("chama o fallback handler quando a pilha de modais estiver vazia", () => {
    let fallbackCalled = false;
    setGlobalFallbackBackHandler(() => {
      fallbackCalled = true;
      return true;
    });

    const handleBack = (globalThis.window as unknown as { __handleAndroidBack?: () => boolean }).__handleAndroidBack;
    expect(typeof handleBack).toBe("function");

    const handled = handleBack!();
    expect(handled).toBe(true);
    expect(fallbackCalled).toBe(true);

    setGlobalFallbackBackHandler(null);
  });

  it("retorna false quando nada tratou o clique de voltar", () => {
    setGlobalFallbackBackHandler(null);

    const handleBack = (globalThis.window as unknown as { __handleAndroidBack?: () => boolean }).__handleAndroidBack;
    expect(typeof handleBack).toBe("function");

    const handled = handleBack!();
    expect(handled).toBe(false);
  });
});
