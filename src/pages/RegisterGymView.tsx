import React, { useState } from 'react';
import { CheckCircle, Dumbbell, Mail, Lock, ArrowRight, ArrowLeft, Building2, Phone, MapPin } from 'lucide-react';
import { supabase } from '../db/supabase';
import { api } from '../services/api';

interface RegisterGymViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const RegisterGymView: React.FC<RegisterGymViewProps> = ({ onBack, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [gymName, setGymName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step < 2) {
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Supabase Auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error('No se pudo crear la cuenta.');

      // 2. Create gym + subscription in DB
      const gym = await api.subscriptions.createGym({ name: gymName, owner_email: email, owner_phone: phone });

      // 3. Link gym_id to the Supabase user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { gym_id: gym.gym_id, role: 'admin' },
      });
      if (updateError) throw new Error(updateError.message);

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Error al registrar el gimnasio. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-slate-800 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 transition-all duration-150";

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-sm text-center space-y-6 relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/40 mx-auto">
            <CheckCircle size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic">¡GYM REGISTRADO!</h1>
            <p className="text-slate-400 text-sm font-medium mt-3">
              <span className="text-white font-bold">{gymName}</span> fue creado con éxito.<br />
              Tenés 30 días de prueba gratuita para explorar todo.
            </p>
          </div>
          <button
            onClick={onSuccess}
            className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-cyan-500/25 text-sm"
          >
            Ir al panel
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-80px] w-[320px] h-[320px] bg-slate-800/60 rounded-full blur-3xl pointer-events-none" />

      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.025] pointer-events-none select-none">
        <Dumbbell size={480} className="text-white" strokeWidth={1} />
      </div>

      <div className="w-full max-w-sm space-y-7 relative z-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-white font-semibold transition-colors text-sm mx-auto"
          >
            <ArrowLeft size={16} />
            Volver al login
          </button>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-cyan-500 rounded-2xl shadow-2xl shadow-cyan-500/40 mx-auto mt-2">
            <Dumbbell size={26} className="text-slate-950 -rotate-45" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic leading-none">
              REGISTRÁ TU <span className="text-cyan-400">GYM</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Comenzá a gestionar tu negocio hoy.</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl shadow-black/60">

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= i ? 'bg-cyan-500' : 'bg-slate-800'}`} />
            ))}
          </div>

          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            {step === 1 ? 'Paso 1 — Tu gimnasio' : 'Paso 2 — Tu cuenta'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre del Gimnasio</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input className={inputClass} placeholder="Ej: Black Box Boxing" required value={gymName} onChange={(e) => setGymName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input className={inputClass} placeholder="Ej: Av. Santa Fe 1234, CABA" required value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input className={inputClass} placeholder="Ej: 11 2233-4455" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email del Admin</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input type="email" className={inputClass} placeholder="admin@gym.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input type="password" className={inputClass} placeholder="Mínimo 6 caracteres" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-cyan-500/25 mt-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  {step === 2 ? 'Creando tu cuenta...' : 'Procesando...'}
                </>
              ) : (
                <>
                  {step === 1 ? 'Siguiente' : 'Finalizar Registro'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {step === 2 && (
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="w-full text-xs text-slate-600 hover:text-slate-400 font-semibold text-center transition-colors py-1"
              >
                ← Volver al paso anterior
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
