import React, { useState } from 'react';
import { Dumbbell, Lock, ArrowRight, Mail, Zap, Users, BarChart3, Calendar } from 'lucide-react';
import { supabase } from '../db/supabase';

interface LoginViewProps {
  onLogin: () => void;
  onRegisterClick: () => void;
  onRegisterPTClick?: () => void;
}

const SUPERADMIN_USERNAME = import.meta.env.VITE_SUPERADMIN_USER ?? '';
const SUPERADMIN_PASSWORD = import.meta.env.VITE_SUPERADMIN_PASS ?? '';
const DEMO_GYM_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_STUDENT_ID = 'bbbb0001-0000-0000-0000-000000000001';

// ── Test / demo credentials ───────────────────────────────────────────────────
// [DEMO]   user: test        / pass: test        → demo interactivo (página marketing)
// [TEST]   user: gymtest     / pass: gymtest      → vista dueño de gimnasio (datos demo)
// [TEST]   user: alumnotest  / pass: alumnotest   → vista alumno (datos demo)

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRegisterClick, onRegisterPTClick }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isDemoMode = window.location.search.includes('demo=1');

  const enterDemo = () => {
    sessionStorage.setItem('userRole', 'demo');
    sessionStorage.setItem('gymId', DEMO_GYM_ID);
    onLogin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // [DEMO] demo interactivo — usado en la página de marketing (?demo=1)
      if (email === 'test' && password === 'test') {
        enterDemo();
        return;
      }

      // [TEST] vista dueño de gimnasio con datos demo (sin demo tour)
      if (email === 'gymtest' && password === 'gymtest') {
        sessionStorage.setItem('userRole', 'gym_test');
        sessionStorage.setItem('gymId', DEMO_GYM_ID);
        onLogin();
        return;
      }

      // [TEST] vista alumno con datos demo
      if (email === 'alumnotest' && password === 'alumnotest') {
        sessionStorage.setItem('userRole', 'student_demo');
        sessionStorage.setItem('studentId', DEMO_STUDENT_ID);
        onLogin();
        return;
      }

      // Superadmin: hardcoded bypass (no Supabase account needed)
      if (email === SUPERADMIN_USERNAME && password === SUPERADMIN_PASSWORD) {
        sessionStorage.setItem('userRole', 'superadmin');
        sessionStorage.setItem('userId', SUPERADMIN_USERNAME);
        onLogin();
        return;
      }

      // Gym users: Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError('Credenciales incorrectas. Verificá tu email y contraseña.');
        return;
      }

      // Auth state change in App.tsx will handle the redirect automatically
      onLogin();
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-80px] w-[320px] h-[320px] bg-slate-800/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-60px] w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative dumbbell watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.025] pointer-events-none select-none">
        <Dumbbell size={480} className="text-white" strokeWidth={1} />
      </div>

      <div className="w-full max-w-sm space-y-7 relative z-10">

        {/* Brand header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500 rounded-2xl shadow-2xl shadow-cyan-500/40 mx-auto">
            <Dumbbell size={30} className="text-slate-950 -rotate-45" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white italic leading-none">
              entren<span className="text-cyan-400">App</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-2">
              Gestioná tu gimnasio como un profesional
            </p>
          </div>
        </div>

        {/* Demo CTA — shown when ?demo=1 in URL */}
        {isDemoMode && (
          <button
            onClick={enterDemo}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-slate-950 text-sm transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, rgb(6,182,212) 0%, rgb(34,211,238) 60%, rgb(99,240,255) 100%)',
              boxShadow: '0 8px 32px rgba(34,211,238,0.45), 0 0 0 1px rgba(34,211,238,0.3)',
            }}
          >
            <span style={{ fontSize: 18 }}>🏋️</span>
            Ver demo interactivo
            <span className="ml-1 px-2 py-0.5 bg-slate-950/20 rounded-full text-[10px] font-black uppercase tracking-wider">
              Gratis
            </span>
          </button>
        )}

        {/* Divider */}
        {isDemoMode && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs font-semibold text-slate-600">o ingresá con tu cuenta</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        )}

        {/* Form card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl shadow-black/60">

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="text"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 transition-all duration-150"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contraseña</label>
                <button type="button" className="text-xs font-semibold text-cyan-500 hover:text-cyan-400 transition-colors">
                  ¿Olvidaste tu clave?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 transition-all duration-150"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-cyan-500/25 mt-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  Entrar al Panel
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Register links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-600">
            ¿No tenés cuenta?{' '}
            <button
              onClick={onRegisterClick}
              className="font-bold text-white hover:text-cyan-400 transition-colors"
            >
              Registrá tu gimnasio
            </button>
          </p>
          {onRegisterPTClick && (
            <p className="text-sm text-slate-600">
              ¿Sos Personal Trainer?{' '}
              <button
                onClick={onRegisterPTClick}
                className="font-bold text-violet-400 hover:text-violet-300 transition-colors"
              >
                Registrate acá
              </button>
            </p>
          )}
        </div>

        {/* Features strip */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            { icon: <Users size={12} />, label: 'Alumnos' },
            { icon: <BarChart3 size={12} />, label: 'Pagos' },
            { icon: <Zap size={12} />, label: 'Rutinas' },
            { icon: <Calendar size={12} />, label: 'Turnos' },
          ].map(({ icon, label }) => (
            <span key={label} className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
              {icon}
              {label}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
};
