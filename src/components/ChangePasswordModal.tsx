import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../db/supabase';

interface ChangePasswordModalProps {
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      const { error: passError } = await supabase.auth.updateUser({ password });
      if (passError) {
        setError(passError.message);
        setSaving(false);
        return;
      }

      // Clear the must_change_password flag
      await supabase.auth.updateUser({
        data: { must_change_password: false },
      });

      onSuccess();
    } catch {
      setError('Error al cambiar la contraseña.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 text-center">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Cambiá tu contraseña</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Es tu primer inicio de sesión. Elegí una contraseña nueva.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};
