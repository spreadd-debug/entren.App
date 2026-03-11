import React, { useState } from 'react';
import { Dumbbell, Mail, Lock, ArrowRight, ArrowLeft, Building2, Phone, MapPin } from 'lucide-react';
import { Card, Input, Button } from '../components/UI';

interface RegisterGymViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const RegisterGymView: React.FC<RegisterGymViewProps> = ({ onBack, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 italic">REGISTRÁ TU GYM</h1>
          <p className="text-slate-500 font-medium">Comenzá a gestionar tu negocio hoy mismo.</p>
        </div>

        <Card className="p-8 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between mb-8">
            {[1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full mx-1 ${step >= i ? 'bg-slate-900' : 'bg-slate-200'}`} />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nombre del Gimnasio</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input placeholder="Ej: Black Box Boxing" className="pl-12" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input placeholder="Ej: Av. Santa Fe 1234, CABA" className="pl-12" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Teléfono de Contacto</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input placeholder="Ej: 11 2233-4455" className="pl-12" required />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Email del Administrador</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input type="email" placeholder="admin@gym.com" className="pl-12" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input type="password" placeholder="••••••••" className="pl-12" required />
                  </div>
                </div>
              </>
            )}

            <Button 
              type="submit" 
              fullWidth 
              size="lg" 
              disabled={loading}
              className="gap-2 shadow-xl shadow-emerald-100"
            >
              {loading ? 'Procesando...' : step === 1 ? 'Siguiente' : 'Finalizar Registro'}
              {!loading && <ArrowRight size={20} />}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
