import React from 'react';
import { RefreshCw } from 'lucide-react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto">
              <RefreshCw size={28} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Algo salió mal</h2>
              <p className="text-sm text-slate-400 mt-1">
                {this.state.message || 'Error inesperado en la aplicación.'}
              </p>
            </div>
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
    return <>{(this as any).props.children}</>;
  }
}
