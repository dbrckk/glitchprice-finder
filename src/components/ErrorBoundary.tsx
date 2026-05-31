import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error.message || "Une erreur inconnue est survenue." };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GlitchPrice runtime error", { error, errorInfo });
  }

  private reloadApplication = () => {
    window.location.reload();
  };

  render() {
    if (this.state.errorMessage) {
      return (
        <main className="app-shell app-shell--centered" role="alert">
          <section className="fallback-panel">
            <p className="eyebrow">GlitchPrice Finder • recovery</p>
            <h1>Le cockpit a intercepté une erreur.</h1>
            <p>
              L'interface est protégée par un garde-fou runtime. Recharge la session pour repartir d'un état propre sans
              perdre les corrections de code livrées.
            </p>
            <pre>{this.state.errorMessage}</pre>
            <button type="button" onClick={this.reloadApplication}>
              Recharger l'application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
