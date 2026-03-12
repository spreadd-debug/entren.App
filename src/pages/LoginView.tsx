
import React, { useState } from 'react';
import { Dumbbell, Mail, Lock, ArrowRight, User } from 'lucide-react';
import { Card, Input, Button } from '../components/UI';

interface LoginViewProps {
  onLogin: () => void;
  onRegisterClick: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRegisterClick }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Superadmin check
    setTimeout(() => {
      if (username === 'Dhitrent4' && password === '42338474asdasd') {
        onLogin();
      } else {
        setError('Credenciales incorrectas. Verificá tu usuario y contraseña.');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-slate-900 dark:bg-white rounded-3xl flex items-center justify-center text-white dark:text-slate-900 text-4xl font-black italic mx-auto shadow-2xl shadow-slate-200 dark:shadow-slate-900 mb-6">
            G
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white italic">entrenApp</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestioná tu gimnasio como un profesional.</p>
        </div>

        <Card className="p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <Input
                  type="text"
                  placeholder="Usuario Superadmin"
                  className="pl-12"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contraseña</label>
                <button type="button" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">¿Olvidaste tu clave?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={loading}
              className="gap-2 shadow-xl shadow-emerald-100"
            >
              {loading ? 'Iniciando...' : 'Entrar al Panel'}
              {!loading && <ArrowRight size={20} />}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ¿No tenés cuenta? <button onClick={onRegisterClick} className="font-bold text-slate-900 dark:text-white hover:underline">Registrá tu gimnasio</button>
          </p>
        </div>
      </div>
    </div>
  );
};
