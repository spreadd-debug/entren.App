import React, { useEffect, useState } from 'react';
import { Zap, Phone, User, CheckCircle2, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { CheckInService, CheckInStudent, DeviceStudent } from '../services/CheckInService';

interface CheckInViewProps {
  gymId: string;
}

type Step =
  | 'loading'
  | 'phone-input'
  | 'confirm-student'
  | 'quick-confirm'
  | 'processing'
  | 'success'
  | 'already-checked-in'
  | 'not-found';

const CheckInView: React.FC<CheckInViewProps> = ({ gymId }) => {
  const [step, setStep] = useState<Step>('loading');
  const [phone, setPhone] = useState('');
  const [foundStudent, setFoundStudent] = useState<CheckInStudent | null>(null);
  const [deviceStudent, setDeviceStudent] = useState<DeviceStudent | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = CheckInService.getDeviceStudent(gymId);
    if (saved) {
      setDeviceStudent(saved);
      setStep('quick-confirm');
    } else {
      setStep('phone-input');
    }
  }, [gymId]);

  const handlePhoneSearch = async () => {
    if (!phone.trim()) return;
    setError(null);
    setStep('processing');

    try {
      const student = await CheckInService.findStudentByPhone(gymId, phone);
      if (!student) {
        setStep('not-found');
        return;
      }
      setFoundStudent(student);
      setStep('confirm-student');
    } catch {
      setError('Error al buscar. Intentá de nuevo.');
      setStep('phone-input');
    }
  };

  const handleConfirmCheckIn = async (student: { id: string; name: string }) => {
    setStep('processing');
    try {
      const result = await CheckInService.registerCheckIn(gymId, student.id);
      if (result.alreadyCheckedIn) {
        setCheckedInAt(result.checkedInAt);
        setStep('already-checked-in');
        return;
      }
      CheckInService.saveDeviceStudent(gymId, { id: student.id, name: student.name });
      localStorage.setItem('studentPortalId', student.id);
      setStep('success');
      setTimeout(() => {
        window.location.href = '/portal';
      }, 1500);
    } catch {
      setError('Error al registrar. Intentá de nuevo.');
      setStep(foundStudent ? 'confirm-student' : 'quick-confirm');
    }
  };

  const handleForgetDevice = () => {
    CheckInService.clearDeviceStudent(gymId);
    setDeviceStudent(null);
    setFoundStudent(null);
    setPhone('');
    setStep('phone-input');
  };

  const handleRetryPhone = () => {
    setPhone('');
    setFoundStudent(null);
    setError(null);
    setStep('phone-input');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Zap size={22} className="text-slate-950" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-black text-white tracking-tight">entrenApp</span>
      </div>

      <div className="w-full max-w-sm">

        {/* ── LOADING ─────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="text-cyan-500 animate-spin" />
          </div>
        )}

        {/* ── PROCESSING ──────────────────────────────────────────── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={32} className="text-cyan-500 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Procesando...</p>
          </div>
        )}

        {/* ── PHONE INPUT ─────────────────────────────────────────── */}
        {step === 'phone-input' && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-white tracking-tight">Check-in</h1>
              <p className="text-slate-400 text-sm">Ingresá tu número de teléfono para registrar tu asistencia.</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ej: 1123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {error && (
                <p className="text-rose-400 text-sm font-medium text-center">{error}</p>
              )}

              <button
                onClick={handlePhoneSearch}
                disabled={!phone.trim()}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-40 disabled:pointer-events-none text-slate-950 rounded-2xl font-black text-base transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
              >
                Buscar
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIRM STUDENT ─────────────────────────────────────── */}
        {step === 'confirm-student' && foundStudent && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-white tracking-tight">¿Sos vos?</h1>
              <p className="text-slate-400 text-sm">Confirmá que sos el alumno correcto.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                <User size={24} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-lg font-black text-white">
                  {foundStudent.nombre} {foundStudent.apellido}
                </p>
                <p className="text-sm text-slate-500 font-medium">{foundStudent.telefono}</p>
              </div>
            </div>

            {error && (
              <p className="text-rose-400 text-sm font-medium text-center">{error}</p>
            )}

            <button
              onClick={() => handleConfirmCheckIn({
                id: foundStudent.id,
                name: `${foundStudent.nombre} ${foundStudent.apellido}`.trim(),
              })}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 rounded-2xl font-black text-base transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
            >
              Confirmar check-in
            </button>

            <button
              onClick={handleRetryPhone}
              className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              No soy yo
            </button>
          </div>
        )}

        {/* ── QUICK CONFIRM (remembered device) ───────────────────── */}
        {step === 'quick-confirm' && deviceStudent && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-white tracking-tight">¡Bienvenido!</h1>
              <p className="text-slate-400 text-sm">Registrá tu asistencia de hoy.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center shrink-0">
                <User size={24} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-lg font-black text-white">{deviceStudent.name}</p>
                <p className="text-sm text-slate-500 font-medium">Dispositivo recordado</p>
              </div>
            </div>

            {error && (
              <p className="text-rose-400 text-sm font-medium text-center">{error}</p>
            )}

            <button
              onClick={() => handleConfirmCheckIn(deviceStudent)}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 rounded-2xl font-black text-base transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
            >
              Registrar check-in
            </button>

            <button
              onClick={handleForgetDevice}
              className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
            >
              No soy yo
            </button>
          </div>
        )}

        {/* ── SUCCESS ─────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight">¡Listo!</h1>
              <p className="text-slate-400 text-sm">
                Tu asistencia fue registrada.
              </p>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
            </p>
          </div>
        )}

        {/* ── ALREADY CHECKED IN ──────────────────────────────────── */}
        {step === 'already-checked-in' && (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Clock size={40} className="text-amber-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight">Ya estás registrado</h1>
              <p className="text-slate-400 text-sm">
                Ya registraste un check-in reciente.
              </p>
            </div>
            {checkedInAt && (
              <p className="text-xs text-slate-500 font-medium">
                Último check-in:{' '}
                {new Date(checkedInAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
              </p>
            )}
          </div>
        )}

        {/* ── NOT FOUND ───────────────────────────────────────────── */}
        {step === 'not-found' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Phone size={28} className="text-slate-600" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-black text-white">No encontrado</h1>
                <p className="text-slate-400 text-sm">
                  No encontramos un alumno con ese teléfono. Revisá el número e intentá de nuevo.
                </p>
              </div>
            </div>

            <button
              onClick={handleRetryPhone}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckInView;
