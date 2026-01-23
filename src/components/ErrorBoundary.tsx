import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep as console.error so it shows in the preview logs for debugging.
    console.error("UI crashed (ErrorBoundary):", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Ocorreu um erro na aplicação</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A interface travou ao executar uma ação. Você pode tentar novamente ou recarregar a página.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium"
            >
              Recarregar página
            </button>
          </div>

          {this.state.error?.message ? (
            <pre className="mt-6 max-h-64 overflow-auto rounded-md border border-border bg-muted p-4 text-xs text-foreground">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
