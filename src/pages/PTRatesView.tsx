import React, { useEffect, useState } from 'react';
import { ArrowLeft, DollarSign, Layers, Plus, Trash2, Zap } from 'lucide-react';
import { Card, Button, Input, SectionLabel } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { PTRateSettingsService, PackageTemplate } from '../services/PTRateSettingsService';
import { useToast } from '../context/ToastContext';

interface PTRatesViewProps {
  gymId: string;
}

export const PTRatesView: React.FC<PTRatesViewProps> = ({ gymId }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [defaultRate, setDefaultRate] = useState<number>(0);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);

  const [tplSessions, setTplSessions] = useState<number>(10);
  const [tplPrice, setTplPrice] = useState<number>(0);
  const [tplLabel, setTplLabel] = useState<string>('');

  useEffect(() => {
    const s = PTRateSettingsService.get(gymId);
    setDefaultRate(s.defaultSessionRate);
    setTemplates(s.packageTemplates);
  }, [gymId]);

  const handleSaveRate = () => {
    PTRateSettingsService.setDefaultRate(gymId, defaultRate);
    toast.success('Tarifa por defecto guardada');
  };

  const handleAddTemplate = () => {
    if (tplSessions <= 0 || tplPrice <= 0) {
      toast.error('Sesiones y precio deben ser mayores a 0');
      return;
    }
    const next = PTRateSettingsService.addTemplate(gymId, {
      sessionsTotal: tplSessions,
      pricePaid: tplPrice,
      label: tplLabel.trim() || undefined,
    });
    setTemplates(next.packageTemplates);
    setTplSessions(10);
    setTplPrice(0);
    setTplLabel('');
  };

  const handleRemoveTemplate = (id: string) => {
    const next = PTRateSettingsService.removeTemplate(gymId, id);
    setTemplates(next.packageTemplates);
  };

  return (
    <div className="space-y-6 pb-10 max-w-xl">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-violet-500" />
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Mi Tarifa</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tus valores por defecto. Se usan como sugerencia al dar de alta un cliente nuevo.
        </p>
      </div>

      {/* ── Default session rate ─────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>Tarifa por sesión</SectionLabel>
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
                <DollarSign size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Default por sesión</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Se pre-carga cuando elegís el modelo "por sesión" en un cliente nuevo.
                </p>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                type="number"
                min={0}
                value={defaultRate}
                onChange={(e) => setDefaultRate(Number(e.target.value))}
                className="pl-11 text-lg font-black italic"
              />
            </div>
            <Button fullWidth onClick={handleSaveRate}>
              Guardar tarifa
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Package templates ────────────────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>Plantillas de paquetes</SectionLabel>
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
                <Layers size={18} className="text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Plantillas reutilizables</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Armá combos típicos (ej: 10 sesiones / $60.000) para cargarlos con un click.
                </p>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {t.label ?? `${t.sessionsTotal} sesiones`}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.sessionsTotal} ses · ${t.pricePaid.toLocaleString()} · ${Math.round(t.pricePaid / t.sessionsTotal).toLocaleString()}/ses
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveTemplate(t.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Eliminar plantilla"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Nueva plantilla
              </p>
              <Input
                placeholder="Etiqueta (opcional) ej: 'Paquete mensual'"
                value={tplLabel}
                onChange={(e) => setTplLabel(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Sesiones"
                    value={tplSessions || ''}
                    onChange={(e) => setTplSessions(Number(e.target.value))}
                    className="pl-9 text-sm font-bold"
                  />
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Precio total"
                    value={tplPrice || ''}
                    onChange={(e) => setTplPrice(Number(e.target.value))}
                    className="pl-9 text-sm font-bold"
                  />
                </div>
              </div>
              <Button fullWidth variant="outline" onClick={handleAddTemplate} className="gap-2">
                <Plus size={15} />
                Agregar plantilla
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
