import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
}

export class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="sharp-card border-[#F43F5E]/35 p-8 max-w-md mx-auto my-12 text-center space-y-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-[var(--text-main)]">
            Unable to load view module
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            A network or chunk-loading error occurred while opening this page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="sharp-btn-primary"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
