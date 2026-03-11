import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="border border-red-500/50 bg-[#020a02]/90 p-6 rounded-sm text-center">
          <AlertTriangle className="inline-block text-red-500 mb-2" size={32} />
          <h2 className="text-lg font-bold text-red-500 mb-2">ERROR DE MÓDULO</h2>
          <p className="text-sm text-[#008f11] font-mono mb-2">
            Un componente falló. Recargá la página.
          </p>
          <p className="text-xs text-red-400/80 font-mono">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
