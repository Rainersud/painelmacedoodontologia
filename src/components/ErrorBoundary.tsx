import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep as console.error so it shows in the preview logs for debugging.
    console.error("UI crashed (ErrorBoundary):", error, info);
    this.setState({ errorInfo: info });
  }

  private handleReload = () => {
    // Clear any stale session data that might be causing issues
    try {
      localStorage.removeItem('sb-tcsilyuzennytlhzfxmg-auth-token');
    } catch {
      // Ignore if localStorage is not available
    }
    window.location.reload();
  };

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoToLogin = () => {
    // Clear auth and redirect to login
    try {
      localStorage.removeItem('sb-tcsilyuzennytlhzfxmg-auth-token');
    } catch {
      // Ignore
    }
    window.location.href = '/login';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isAuthError = this.state.error?.message?.includes('aborted') || 
                        this.state.error?.message?.includes('refresh') ||
                        this.state.error?.message?.includes('token');

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isAuthError ? 'Sessão expirada' : 'Ocorreu um erro na aplicação'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {isAuthError 
              ? 'Sua sessão expirou ou foi encerrada. Por favor, faça login novamente.'
              : 'A interface travou ao executar uma ação. Você pode tentar novamente ou recarregar a página.'
            }
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {isAuthError ? (
              <button
                type="button"
                onClick={this.handleGoToLogin}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Ir para Login
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>

          {this.state.error?.message && !isAuthError ? (
            <pre className="mt-6 max-h-64 overflow-auto rounded-md border border-border bg-muted p-4 text-xs text-foreground">
              {this.state.error.message}
              {this.state.error.stack && (
                <>
                  {'\n\n'}
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </>
              )}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
