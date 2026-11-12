import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("UI crashed (ErrorBoundary):", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      localStorage.removeItem('sb-tcsilyuzennytlhzfxmg-auth-token');
    } catch {
      // Ignore if localStorage is not available
    }
    window.location.reload();
  };

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoToLogin = () => {
    try {
      localStorage.removeItem('sb-tcsilyuzennytlhzfxmg-auth-token');
    } catch {
      // Ignore
    }
    window.location.href = '/login';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMessage = this.state.error?.message || '';
    const isAuthError = errorMessage.includes('aborted') || 
                        errorMessage.includes('refresh') ||
                        errorMessage.includes('token');
    
    // DOM manipulation errors - just try again automatically
    const isDOMError = errorMessage.includes('insertBefore') ||
                       errorMessage.includes('removeChild') ||
                       errorMessage.includes('appendChild');

    if (isDOMError) {
      // For DOM errors, auto-reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center space-y-4 p-8">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Recarregando...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white text-foreground">
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
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary"
              >
                Ir para Login
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={this.handleTryAgain}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary"
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
                >
                  Recarregar página
                </button>
              </>
            )}
          </div>

          {this.state.error && !isAuthError && (
            <pre className="mt-6 max-h-64 overflow-auto rounded-md border border-border bg-muted p-4 text-xs text-foreground">
              {this.state.error.message}
              {this.state.error.stack && (
                <>
                  {'\n\n'}
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </>
              )}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
