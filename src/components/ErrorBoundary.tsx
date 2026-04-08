import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Props { children: React.ReactNode; fallbackLabel?: string; }
interface State { hasError: boolean; message: string; componentStack: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '', componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const label = this.props.fallbackLabel ?? 'global';
    console.error(`[ErrorBoundary:${label}] caught:`, error);
    console.error(`[ErrorBoundary:${label}] componentStack:`, info.componentStack);
    this.setState({ componentStack: info.componentStack || '' });
  }

  render() {
    if (this.state.hasError) {
      // Compact inline fallback for section-level boundaries
      if (this.props.fallbackLabel) {
        return (
          <div style={{ padding: 12, margin: 4, border: '2px solid #f43f5e', borderRadius: 12, background: '#fff1f2', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <p style={{ fontWeight: 'bold', color: '#e11d48', marginBottom: 4 }}>
              Error en: {this.props.fallbackLabel}
            </p>
            <p style={{ color: '#881337', marginBottom: 4 }}>{String(this.state.message)}</p>
            {this.state.componentStack && (
              <pre style={{ fontSize: 10, color: '#4a044e', maxHeight: 120, overflow: 'auto' }}>
                {String(this.state.componentStack)}
              </pre>
            )}
          </div>
        );
      }

      // Full-screen fallback for the global boundary
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto">
              <RefreshCw size={28} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Algo salió mal</h2>
              <p className="text-sm text-slate-400 mt-1">
                {String(this.state.message || 'Error inesperado en la aplicación.')}
              </p>
            </div>
            {this.state.componentStack && (
              <pre className="text-left text-[10px] text-slate-500 bg-slate-900 rounded-xl p-3 overflow-x-auto max-h-60 overflow-y-auto border border-slate-800">
                {String(this.state.componentStack)}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}
