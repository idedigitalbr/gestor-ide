"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
  onReset?: () => void;
  resetButtonText?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-xs">
            <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {this.props.title || "Ocorreu um problema ao renderizar esta exibição"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {this.props.description ||
                  this.state.error?.message ||
                  "Houve uma falha inesperada. Você pode tentar recarregar ou alternar para outra visualização."}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="size-3.5" />
                {this.props.resetButtonText || "Tentar novamente"}
              </Button>
              {this.props.secondaryAction && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={this.props.secondaryAction.onClick}
                  className="text-xs"
                >
                  {this.props.secondaryAction.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
